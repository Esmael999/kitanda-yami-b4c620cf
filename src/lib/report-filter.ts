import type { LedgerState } from "./ledger";
export type SaleStatus = "all" | "paid" | "credit";
export function filterReport(state: LedgerState, customer: string, product: string, status: SaleStatus): LedgerState {
  return {
    ...state,
    sales: state.sales.filter(s =>
      (!customer || s.customerId === customer) &&
      (!product || s.items.some(i => i.productId === product)) &&
      (status === "all" || (status === "paid" ? s.paid === s.total : s.paid < s.total))
    ),
    // Standalone debt payments are not attributable to individual products or sale statuses.
    payments: product || status !== "all" ? [] : state.payments.filter(p => !customer || p.customerId === customer),
  };
}
