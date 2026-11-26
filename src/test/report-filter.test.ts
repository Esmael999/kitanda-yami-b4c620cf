import { describe, expect, it } from "vitest";
import { emptyState, type Sale } from "@/lib/ledger";
import { filterReport } from "@/lib/report-filter";
const sale = (id: string, paid: number, productId: string): Sale => ({
 id, paid, total: 100, customerId: id, createdAt: "2026-01-01T00:00:00Z",
 items: [{ productId, name: "Produto", qty: 1, price: 100, cost: 50 }],
});
describe("report filters", () => {
 it("filters sales without modifying the original or assigning later payments to products", () => {
  const original = { ...emptyState(), sales: [sale("a",100,"p1"),sale("b",0,"p2")], payments:[{id:"payment",customerId:"b",amount:25,createdAt:"2026-01-02T00:00:00Z"}] };
  expect(filterReport(original,"","","paid").sales.map(s=>s.id)).toEqual(["a"]);
  expect(filterReport(original,"","p2","credit").payments).toEqual([]);
  expect(filterReport(original,"b","","all").payments).toHaveLength(1);
  expect(original.sales).toHaveLength(2);
 });
});
