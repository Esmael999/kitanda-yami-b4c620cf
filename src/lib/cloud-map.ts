// Pure helpers shared by the sync engine: permissions, queued operations and server-row mapping.
import type { Customer, LedgerState, Payment, Product, Sale } from "./ledger";
import { emptyState } from "./ledger";

export type Permission = "vender" | "fiado" | "receber" | "produtos" | "relatorios";

export const PERMISSIONS: { key: Permission; label: string }[] = [
  { key: "vender", label: "Registar vendas" },
  { key: "fiado", label: "Vender fiado" },
  { key: "receber", label: "Receber pagamentos" },
  { key: "produtos", label: "Gerir produtos e stock" },
  { key: "relatorios", label: "Ver relatórios" },
];

export type Member = {
  role: "owner" | "employee";
  active: boolean;
  permissions: Partial<Record<Permission, boolean>>;
  email: string;
};

/** Owners can do everything; employees only what the owner switched on. */
export function can(member: Member | null, perm: Permission): boolean {
  if (!member || !member.active) return false;
  if (member.role === "owner") return true;
  return member.permissions[perm] === true;
}

export type SyncOp =
  | { id: string; kind: "product"; product: Omit<Product, "stock">; changedAt: string }
  | { id: string; kind: "stock"; productId: string; delta: number; reason: "inicial" | "reposicao" | "ajuste" }
  | { id: string; kind: "product_delete"; productId: string }
  | { id: string; kind: "customer"; customer: Customer; changedAt: string }
  | { id: string; kind: "customer_delete"; customerId: string }
  | { id: string; kind: "sale"; sale: Sale }
  | { id: string; kind: "payment"; payment: Payment }
  | { id: string; kind: "settings"; businessName: string; ownerName: string };

/** Ops for saving a product from the edit form. Stock travels as a delta so devices never overwrite each other. */
export function productSaveOps(
  before: Product | null,
  after: Product,
  newId: () => string,
  now: string,
): SyncOp[] {
  const { stock, ...details } = after;
  const ops: SyncOp[] = [{ id: newId(), kind: "product", product: details, changedAt: now }];
  const delta = stock - (before?.stock ?? 0);
  if (delta !== 0) {
    const reason = !before ? "inicial" : delta > 0 ? "reposicao" : "ajuste";
    ops.push({ id: newId(), kind: "stock", productId: after.id, delta, reason });
  }
  return ops;
}

/**
 * Everything that must reach the server for a local change, worked out by comparing the ledger
 * before and after it. Sales take their own stock off on the server, so only stock changes that a
 * sale does not explain travel as a stock movement. Sample data never leaves the phone.
 */
export function ledgerOps(before: LedgerState, after: LedgerState, newId: () => string, now: string): SyncOp[] {
  if (before.isSample || after.isSample) return [];
  const ops: SyncOp[] = [];

  if (
    before.settings.businessName !== after.settings.businessName ||
    before.settings.ownerName !== after.settings.ownerName
  ) {
    ops.push({ id: newId(), kind: "settings", businessName: after.settings.businessName, ownerName: after.settings.ownerName });
  }

  const oldCustomers = new Map(before.customers.map((c) => [c.id, c]));
  for (const c of after.customers) {
    const old = oldCustomers.get(c.id);
    if (!old || old.name !== c.name || old.phone !== c.phone) ops.push({ id: newId(), kind: "customer", customer: c, changedAt: now });
  }

  const oldSaleIds = new Set(before.sales.map((s) => s.id));
  const newSales = after.sales.filter((s) => !oldSaleIds.has(s.id));
  const soldNow = new Map<string, number>();
  for (const sale of newSales) for (const i of sale.items) soldNow.set(i.productId, (soldNow.get(i.productId) ?? 0) + i.qty);

  const oldProducts = new Map(before.products.map((p) => [p.id, p]));
  const stockOps: SyncOp[] = [];
  for (const p of after.products) {
    const old = oldProducts.get(p.id);
    const { stock, ...details } = p;
    if (!old || old.name !== p.name || old.price !== p.price || old.cost !== p.cost || old.minStock !== p.minStock) {
      ops.push({ id: newId(), kind: "product", product: details, changedAt: now });
    }
    const delta = stock - (old?.stock ?? 0) + (soldNow.get(p.id) ?? 0);
    if (delta !== 0) {
      const reason = !old ? "inicial" : delta > 0 ? "reposicao" : "ajuste";
      stockOps.push({ id: newId(), kind: "stock", productId: p.id, delta, reason });
    }
  }
  ops.push(...stockOps);

  for (const sale of [...newSales].reverse()) ops.push({ id: newId(), kind: "sale", sale });

  const oldPaymentIds = new Set(before.payments.map((p) => p.id));
  for (const payment of after.payments) if (!oldPaymentIds.has(payment.id)) ops.push({ id: newId(), kind: "payment", payment });

  const customerIds = new Set(after.customers.map((c) => c.id));
  for (const c of before.customers) if (!customerIds.has(c.id)) ops.push({ id: newId(), kind: "customer_delete", customerId: c.id });
  const productIds = new Set(after.products.map((p) => p.id));
  for (const p of before.products) if (!productIds.has(p.id)) ops.push({ id: newId(), kind: "product_delete", productId: p.id });

  return ops;
}

/** Network/auth hiccups are retried; database refusals (permission, validation) are not. */
export function isPermanentError(error: { code?: string | null; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (!code || code.startsWith("PGRST") || code.startsWith("08")) return false;
  return /^[0-9A-Z]{5}$/.test(code);
}

export type ServerRows = {
  establishmentName: string;
  ownerName: string;
  products: { id: string; name: string; price: number; cost: number; stock: number; min_stock: number }[];
  customers: { id: string; name: string; phone: string; created_at: string }[];
  sales: {
    id: string;
    customer_id: string | null;
    total: number;
    paid: number;
    created_at: string;
    sale_items: { product_id: string | null; name: string; qty: number; price: number; cost: number; position: number }[];
  }[];
  payments: { id: string; customer_id: string; amount: number; created_at: string }[];
};

const iso = (s: string) => new Date(s).toISOString();

export function rowsToState(rows: ServerRows): LedgerState {
  return {
    ...emptyState(),
    settings: { businessName: rows.establishmentName, ownerName: rows.ownerName },
    products: rows.products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      minStock: p.min_stock,
    })),
    customers: rows.customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, createdAt: iso(c.created_at) })),
    sales: rows.sales
      .map((s) => ({
        id: s.id,
        customerId: s.customer_id,
        total: s.total,
        paid: s.paid,
        createdAt: iso(s.created_at),
        items: [...s.sale_items]
          .sort((a, b) => a.position - b.position)
          .map((i) => ({ productId: i.product_id ?? "", name: i.name, qty: i.qty, price: i.price, cost: i.cost })),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payments: rows.payments
      .map((p) => ({ id: p.id, customerId: p.customer_id, amount: p.amount, createdAt: iso(p.created_at) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);
