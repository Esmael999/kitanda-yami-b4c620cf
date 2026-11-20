// Pure business rules for Kitanda. All amounts are whole Kwanzas (integers).

export type Product = {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
};

export type Customer = { id: string; name: string; phone: string; createdAt: string };

export type SaleItem = { productId: string; name: string; qty: number; price: number; cost: number };

export type Sale = {
  id: string;
  items: SaleItem[];
  total: number;
  paid: number;
  customerId: string | null;
  createdAt: string;
};

export type Payment = { id: string; customerId: string; amount: number; createdAt: string };

export type Settings = { businessName: string; ownerName: string };

export type LedgerState = {
  version: 1;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  settings: Settings;
  isSample: boolean;
};

export class LedgerError extends Error {}

export const emptyState = (): LedgerState => ({
  version: 1,
  products: [],
  customers: [],
  sales: [],
  payments: [],
  settings: { businessName: "A minha cantina", ownerName: "" },
  isSample: false,
});

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// ---------- money & dates ----------

export function formatKz(n: number): string {
  const sign = n < 0 ? "-" : "";
  const digits = Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${digits} Kz`;
}

export function parseKz(text: string): number {
  const n = parseInt(text.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

const pad = (n: number) => n.toString().padStart(2, "0");

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

const inRange = (iso: string, from: Date, to: Date) => {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < to.getTime();
};

// ---------- products ----------

export const isLowStock = (p: Product) => p.stock <= p.minStock;

export function validateProduct(p: Omit<Product, "id">): void {
  if (!p.name.trim()) throw new LedgerError("Escreva o nome do produto.");
  if (p.price <= 0) throw new LedgerError("O preço de venda tem de ser maior que zero.");
  if (p.cost < 0 || p.stock < 0 || p.minStock < 0)
    throw new LedgerError("Os valores não podem ser negativos.");
}

// ---------- sales ----------

export const cartTotal = (items: { qty: number; price: number }[]) =>
  items.reduce((sum, i) => sum + i.qty * i.price, 0);

export const saleProfit = (sale: Sale) =>
  sale.items.reduce((sum, i) => sum + (i.price - i.cost) * i.qty, 0);

export type SaleInput = {
  items: { productId: string; qty: number }[];
  mode: "pronto" | "fiado";
  customerId?: string | null | undefined;
  upfront?: number | undefined;
  now?: Date | undefined;
};

export function recordSale(state: LedgerState, input: SaleInput): LedgerState {
  const lines = input.items.filter((l) => l.qty > 0);
  if (!lines.length) throw new LedgerError("Adicione pelo menos um produto.");

  const products = state.products.map((p) => ({ ...p }));
  const items: SaleItem[] = [];
  for (const line of lines) {
    const p = products.find((x) => x.id === line.productId);
    if (!p) throw new LedgerError("Produto não encontrado.");
    if (!Number.isInteger(line.qty)) throw new LedgerError("Quantidade inválida.");
    if (line.qty > p.stock) throw new LedgerError(`Só há ${p.stock} de ${p.name} em stock.`);
    p.stock -= line.qty;
    items.push({ productId: p.id, name: p.name, qty: line.qty, price: p.price, cost: p.cost });
  }

  const total = cartTotal(items);
  let paid = total;
  let customerId = input.customerId ?? null;

  if (input.mode === "fiado") {
    if (!customerId || !state.customers.some((c) => c.id === customerId))
      throw new LedgerError("Escolha o cliente para vender fiado.");
    const upfront = input.upfront ?? 0;
    if (upfront < 0 || upfront >= total)
      throw new LedgerError("A entrada tem de ser menor que o total.");
    paid = upfront;
  } else if (customerId && !state.customers.some((c) => c.id === customerId)) {
    customerId = null;
  }

  const sale: Sale = {
    id: newId(),
    items,
    total,
    paid,
    customerId,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
  return { ...state, products, sales: [sale, ...state.sales] };
}

// ---------- debts ----------

export function customerDebt(state: LedgerState, customerId: string): number {
  const owed = state.sales
    .filter((s) => s.customerId === customerId)
    .reduce((sum, s) => sum + (s.total - s.paid), 0);
  const paid = state.payments
    .filter((p) => p.customerId === customerId)
    .reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, owed - paid);
}

/** Date of the oldest fiado sale not yet covered by payments (payments settle oldest first). */
export function debtSince(state: LedgerState, customerId: string): string | null {
  let credit = state.payments
    .filter((p) => p.customerId === customerId)
    .reduce((sum, p) => sum + p.amount, 0);
  const fiado = state.sales
    .filter((s) => s.customerId === customerId && s.total > s.paid)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const s of fiado) {
    const owed = s.total - s.paid;
    if (credit >= owed) credit -= owed;
    else return s.createdAt;
  }
  return null;
}

export function recordPayment(
  state: LedgerState,
  input: { customerId: string; amount: number; now?: Date },
): LedgerState {
  if (!Number.isInteger(input.amount) || input.amount <= 0)
    throw new LedgerError("Indique um valor válido.");
  const debt = customerDebt(state, input.customerId);
  if (debt === 0) throw new LedgerError("Este cliente não tem dívidas.");
  if (input.amount > debt) throw new LedgerError(`O cliente só deve ${formatKz(debt)}.`);
  const payment: Payment = {
    id: newId(),
    customerId: input.customerId,
    amount: input.amount,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
  return { ...state, payments: [payment, ...state.payments] };
}

export function debtors(state: LedgerState) {
  return state.customers
    .map((customer) => ({
      customer,
      debt: customerDebt(state, customer.id),
      since: debtSince(state, customer.id),
    }))
    .filter((d) => d.debt > 0)
    .sort((a, b) => b.debt - a.debt);
}

export const totalReceivable = (state: LedgerState) =>
  debtors(state).reduce((sum, d) => sum + d.debt, 0);

export function daysSince(iso: string, now = new Date()): number {
  return Math.floor(
    (startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / 86_400_000,
  );
}

// ---------- reports ----------

export function periodStats(state: LedgerState, from: Date, to: Date) {
  const sales = state.sales.filter((s) => inRange(s.createdAt, from, to));
  const payments = state.payments.filter((p) => inRange(p.createdAt, from, to));
  return {
    count: sales.length,
    total: sales.reduce((sum, s) => sum + s.total, 0),
    profit: sales.reduce((sum, s) => sum + saleProfit(s), 0),
    received:
      sales.reduce((sum, s) => sum + s.paid, 0) + payments.reduce((sum, p) => sum + p.amount, 0),
    fiado: sales.reduce((sum, s) => sum + (s.total - s.paid), 0),
  };
}

export function salesByDay(state: LedgerState, days: number, now = new Date()) {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const from = addDays(today, i - days + 1);
    const to = addDays(from, 1);
    const total = state.sales
      .filter((s) => inRange(s.createdAt, from, to))
      .reduce((sum, s) => sum + s.total, 0);
    return { date: from, total };
  });
}

export function topProducts(state: LedgerState, from: Date, to: Date, limit = 5) {
  const map = new Map<string, { name: string; qty: number; total: number }>();
  for (const s of state.sales) {
    if (!inRange(s.createdAt, from, to)) continue;
    for (const i of s.items) {
      const cur = map.get(i.productId) ?? { name: i.name, qty: 0, total: 0 };
      cur.qty += i.qty;
      cur.total += i.qty * i.price;
      map.set(i.productId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

// ---------- sample data ----------

export function sampleState(now = new Date()): LedgerState {
  const at = (daysAgo: number, hour: number) => {
    const d = addDays(startOfDay(now), -daysAgo);
    d.setHours(hour, 15);
    return d;
  };
  const mk = (name: string, price: number, cost: number, stock: number, minStock: number) => ({
    id: newId(),
    name,
    price,
    cost,
    stock,
    minStock,
  });
  const [arroz, oleo, acucar, fuba, sabao, coca, pao, sardinha] = [
    mk("Arroz 1kg", 1200, 950, 48, 10),
    mk("Óleo 1L", 2500, 2000, 24, 5),
    mk("Açúcar 1kg", 1100, 850, 12, 8),
    mk("Fuba de milho 1kg", 900, 700, 32, 10),
    mk("Sabão em barra", 350, 250, 60, 12),
    mk("Coca-Cola lata", 500, 350, 16, 12),
    mk("Pão", 100, 70, 90, 20),
    mk("Sardinha lata", 800, 600, 26, 6),
  ];
  const joao = { id: newId(), name: "João Manuel", phone: "923456789", createdAt: at(10, 9).toISOString() };
  const ana = { id: newId(), name: "Ana Paula", phone: "912345678", createdAt: at(8, 9).toISOString() };
  const domingos = { id: newId(), name: "Domingos Silva", phone: "", createdAt: at(5, 9).toISOString() };

  let s: LedgerState = {
    ...emptyState(),
    settings: { businessName: "Cantina da Mamã Rosa", ownerName: "Rosa" },
    products: [arroz, oleo, acucar, fuba, sabao, coca, pao, sardinha],
    customers: [joao, ana, domingos],
    isSample: true,
  };
  const sale = (daysAgo: number, hour: number, items: [Product, number][], mode: "pronto" | "fiado" = "pronto", customerId?: string, upfront?: number) => {
    s = recordSale(s, {
      items: items.map(([p, qty]) => ({ productId: p.id, qty })),
      mode,
      customerId,
      upfront,
      now: at(daysAgo, hour),
    });
  };
  sale(7, 10, [[arroz, 3], [oleo, 2], [acucar, 1]], "fiado", joao.id);
  sale(6, 11, [[pao, 10], [coca, 2]]);
  sale(5, 9, [[fuba, 4], [sardinha, 2]]);
  sale(4, 16, [[arroz, 2], [sabao, 4]], "fiado", ana.id, 1000);
  sale(3, 12, [[oleo, 1], [pao, 6]]);
  sale(2, 17, [[coca, 3], [sardinha, 1], [pao, 8]]);
  sale(1, 10, [[arroz, 4], [fuba, 2]]);
  sale(1, 18, [[acucar, 2], [sabao, 2]], "fiado", domingos.id);
  sale(0, 8, [[pao, 12], [coca, 1]]);
  sale(0, 10, [[arroz, 2], [oleo, 1], [sardinha, 2]]);
  sale(0, 11, [[sabao, 3], [fuba, 1]]);
  s = recordPayment(s, { customerId: ana.id, amount: 1000, now: at(2, 9) });
  return s;
}

export type ReceiptInfo = {
  shop: string;
  at: string;
  customer: string | null;
  lines: { name: string; qty: number; price: number }[];
  total: number;
  mode: "pronto" | "fiado";
  given: number;
  upfront: number;
};

/** Text of the sale receipt sent by WhatsApp. */
export function receiptText(r: ReceiptInfo): string {
  const out = [`*${r.shop}*`, `Comprovativo de venda — ${formatDate(r.at)}`];
  if (r.customer) out.push(`Cliente: ${r.customer}`);
  out.push("");
  for (const l of r.lines) out.push(`${l.qty}× ${l.name} — ${formatKz(l.qty * l.price)}`);
  out.push("", `*Total: ${formatKz(r.total)}*`);
  if (r.mode === "pronto") {
    if (r.given >= r.total && r.given > 0) out.push(`Entregue: ${formatKz(r.given)}`, `Troco: ${formatKz(r.given - r.total)}`);
    else out.push("Pago a pronto");
  } else {
    if (r.upfront > 0) out.push(`Entrada paga: ${formatKz(r.upfront)}`);
    out.push(`Fica a dever: ${formatKz(Math.max(0, r.total - r.upfront))}`);
  }
  out.push("", "Obrigado pela preferência!");
  return out.join("\n");
}
