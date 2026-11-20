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
