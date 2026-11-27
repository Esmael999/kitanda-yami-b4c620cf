import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emptyState, newId, type LedgerState } from "./ledger";
import { isPermanentError, ledgerOps, rowsToState, type Member, type ServerRows, type SyncOp } from "./cloud-map";
import { idbGet, idbSet } from "./offline-db";

/*
 * Offline-first store. The screens read one in-memory LedgerState; every change is applied locally
 * at once, saved to IndexedDB and queued as idempotent operations that are sent to Lovable Cloud
 * when there is internet. After the queue empties, the store reloads the truth from the server.
 */

export type SyncStatus = "online" | "offline" | "syncing" | "synced" | "error";
export type FailedOp = { op: SyncOp; message: string };

type Cloud = {
  userId: string | null;
  email: string;
  member: Member | null;
  status: SyncStatus;
  pending: number;
  failed: FailedOp[];
  lastSyncedAt: string | null;
  visitor?: boolean;
};

const SERVER_STATE = emptyState();
let ledger: LedgerState = emptyState();
let loaded = false;
let queue: SyncOp[] = [];
let cloud: Cloud = { userId: null, email: "", member: null, status: "online", pending: 0, failed: [], lastSyncedAt: null };
let localVersion = 0;
let flushing: Promise<void> | null = null;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const setCloud = (patch: Partial<Cloud>) => {
  cloud = { ...cloud, ...patch, pending: patch.pending ?? queue.length };
  notify();
};

const key = (name: string) => `${name}:${cloud.userId}`;
const saveLocal = () => {
  if (!cloud.userId || cloud.visitor) return;
  void idbSet(key("ledger"), ledger);
  void idbSet(key("queue"), queue);
  void idbSet(key("failed"), cloud.failed);
  void idbSet(key("member"), cloud.member);
};

// ---------- public hooks ----------

export function useLedger(): LedgerState {
  return useSyncExternalStore(subscribe, () => ledger, () => SERVER_STATE);
}

/** False during server render and until this account's offline copy has been read. */
export function useLedgerReady(): boolean {
  return useSyncExternalStore(subscribe, () => loaded, () => false);
}

export function useCloud(): Cloud {
  return useSyncExternalStore(subscribe, () => cloud, () => cloud);
}

/**
 * Apply a change locally and queue what must reach the server.
 * `ops` may be a list or a function of (before, after); left out, the change is compared with the
 * previous ledger so every screen's edits reach the server without each one listing them.
 */
export function updateLedger(
  fn: (s: LedgerState) => LedgerState,
  ops?: SyncOp[] | ((before: LedgerState, after: LedgerState) => SyncOp[]),
) {
  const before = ledger;
  ledger = fn(before);
  localVersion++;
  if (cloud.visitor) { queue = []; setCloud({}); return; }
  const list =
    typeof ops === "function"
      ? ops(before, ledger)
      : (ops ?? ledgerOps(before, ledger, newId, new Date().toISOString()));
  queue = [...queue, ...list];
  setCloud({});
  saveLocal();
  if (list.length) void flush();
}

// ---------- session lifecycle ----------

/** Preview-only local ledger: no account identity, no reads or writes to the cloud. */
export function startVisitorSession(id:string, name:string) {
  if (cloud.visitor && cloud.userId===id && loaded) return;
  ledger = {...emptyState(), settings:{businessName:"A minha cantina",ownerName:name}};
  queue = []; loaded = true; localVersion++;
  cloud = {userId:id,email:"",member:{role:"owner",active:true,permissions:{},email:"",businessType:"cantina"},status:"offline",pending:0,failed:[],lastSyncedAt:null,visitor:true};
  notify();
}

export async function startSession(userId: string, email: string) {
  if (cloud.userId === userId && loaded) return;
  cloud = { ...cloud, userId, email, failed: [], visitor: false };
  const [cached, q, failed, member] = await Promise.all([
    idbGet<LedgerState>(`ledger:${userId}`),
    idbGet<SyncOp[]>(`queue:${userId}`),
    idbGet<FailedOp[]>(`failed:${userId}`),
    idbGet<Member>(`member:${userId}`),
  ]);
  ledger = cached ? { ...emptyState(), ...cached } : emptyState();
  queue = q ?? [];
  loaded = true;
  setCloud({ failed: failed ?? [], member: member ?? null, status: navigator.onLine ? "online" : "offline" });
  void flush();
}

export function endSession() {
  ledger = emptyState();
  queue = [];
  loaded = false;
  cloud = { userId: null, email: "", member: null, status: "online", pending: 0, failed: [], lastSyncedAt: null };
  notify();
}

export function retryFailed() {
  queue = [...cloud.failed.map((f) => f.op), ...queue];
  setCloud({ failed: [] });
  saveLocal();
  void flush();
}

export function discardFailed() {
  setCloud({ failed: [] });
  saveLocal();
  void flush();
}

// ---------- sync engine ----------

async function applyOp(op: SyncOp) {
  switch (op.kind) {
    case "product":
      return supabase.rpc("sync_product", {
        _id: op.product.id,
        _name: op.product.name,
        _price: op.product.price,
        _cost: op.product.cost,
        _min_stock: op.product.minStock,
        _changed_at: op.changedAt,
      });
    case "stock":
      return supabase.rpc("adjust_stock", { _op_id: op.id, _product_id: op.productId, _delta: op.delta, _reason: op.reason });
    case "product_delete":
      return supabase.rpc("delete_product", { _id: op.productId });
    case "customer":
      return supabase.rpc("sync_customer", {
        _id: op.customer.id,
        _name: op.customer.name,
        _phone: op.customer.phone,
        _created_at: op.customer.createdAt,
        _changed_at: op.changedAt,
      });
    case "customer_delete":
      return supabase.rpc("delete_customer", { _id: op.customerId });
    case "sale":
      return supabase.rpc("record_sale", {
        _sale: {
          id: op.sale.id,
          customer_id: op.sale.customerId,
          paid: op.sale.paid,
          created_at: op.sale.createdAt,
          items: op.sale.items.map((i) => ({
            product_id: i.productId,
            name: i.name,
            qty: i.qty,
            price: i.price,
            cost: i.cost,
          })),
        },
      });
    case "payment":
      return supabase.rpc("record_payment", {
        _id: op.payment.id,
        _customer_id: op.payment.customerId,
        _amount: op.payment.amount,
        _created_at: op.payment.createdAt,
      });
    case "settings":
      return supabase.rpc("update_settings", { _business_name: op.businessName, _full_name: op.ownerName });
  }
}

export function flush(): Promise<void> {
  if (!cloud.userId || cloud.visitor) return Promise.resolve();
  if (flushing) return flushing.then(() => (queue.length ? flush() : undefined));
  flushing = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setCloud({ status: "offline" });
      return;
    }
    setCloud({ status: "syncing" });
    while (queue.length) {
      const op = queue[0]!;
      let error: { code?: string; message?: string } | null = null;
      try {
        ({ error } = await applyOp(op));
      } catch (e) {
        error = { message: e instanceof Error ? e.message : String(e) };
      }
      if (error && !isPermanentError(error)) {
        setCloud({ status: navigator.onLine ? "error" : "offline" });
        return;
      }
      queue = queue.slice(1);
      if (error) setCloud({ failed: [...cloud.failed, { op, message: error.message ?? "Erro" }] });
      else setCloud({});
      saveLocal();
    }
    await pull();
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

async function pull() {
  const uid = cloud.userId;
  if (!uid || cloud.visitor) return;
  const versionAtStart = localVersion;
  try {
    const { data: me, error: meErr } = await supabase
      .from("employees")
      .select("role, active, permissions, email, establishment_id")
      .eq("user_id", uid)
      .maybeSingle();
    if (meErr) throw meErr;
    if (!me) {
      setCloud({ status: "error", member: null });
      return;
    }
    const member: Member = {
      role: me.role,
      active: me.active,
      email: me.email,
      permissions: (me.permissions ?? {}) as Member["permissions"],
    };
    const [est, profile, products, customers, sales, payments] = await Promise.all([
      supabase.from("establishments").select("name, business_type").eq("id", me.establishment_id).single(),
      supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
      fetchAll<ServerRows["products"][number]>((a, b) =>
        supabase.from("products").select("id, name, price, cost, stock, min_stock").is("deleted_at", null).order("id").range(a, b),
      ),
      fetchAll<ServerRows["customers"][number]>((a, b) =>
        supabase.from("customers").select("id, name, phone, created_at").is("deleted_at", null).order("id").range(a, b),
      ),
      fetchAll<ServerRows["sales"][number]>((a, b) =>
        supabase
          .from("sales")
          .select("id, customer_id, total, paid, created_at, sale_items(product_id, name, qty, price, cost, position)")
          .order("created_at", { ascending: false })
          .order("id")
          .range(a, b),
      ),
      fetchAll<ServerRows["payments"][number]>((a, b) =>
        supabase.from("payments").select("id, customer_id, amount, created_at").order("id").range(a, b),
      ),
    ]);
    if (est.error) throw est.error;
    member.businessType = est.data.business_type;
    if (cloud.userId !== uid) return;
    // Local changes made while we were downloading win; sync again instead of overwriting them.
    if (localVersion !== versionAtStart || queue.length) {
      setCloud({ member });
      void flush();
      return;
    }
    ledger = rowsToState({
      establishmentName: est.data.name,
      ownerName: profile.data?.full_name ?? "",
      products,
      customers,
      sales,
      payments,
    });
    setCloud({ member, status: cloud.failed.length ? "error" : "synced", lastSyncedAt: new Date().toISOString() });
    saveLocal();
  } catch {
    setCloud({ status: navigator.onLine ? "error" : "offline" });
  }
}

/** Owner only: change the kind of business (needs internet). */
export async function setBusinessType(type: string) {
  if (cloud.visitor) { if (cloud.member) setCloud({member:{...cloud.member,businessType:type}}); return; }
  const { error } = await supabase.rpc("set_business_type", { _type: type });
  if (error) throw new Error(error.message);
  if (cloud.member) setCloud({ member: { ...cloud.member, businessType: type } });
}

/** Upload a backup or the old device-only data; the server skips anything already there. */
export async function importToCloud(data: LedgerState) {
  if (cloud.visitor) throw new Error("Entre na sua conta para importar para a nuvem.");
  await flush();
  const { data: result, error } = await supabase.rpc("import_ledger", { _data: data as never });
  if (error) throw new Error(error.message);
  await pull();
  return result as { products: number; customers: number; sales: number; payments: number };
}

export const newOpId = newId;

// Reconnect handling: send pending work when the internet comes back or the app is reopened.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flush());
  window.addEventListener("offline", () => setCloud({ status: "offline" }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flush();
  });
}
