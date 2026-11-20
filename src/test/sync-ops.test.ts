import { describe, expect, it } from "vitest";
import { ledgerOps } from "@/lib/cloud-map";
import { emptyState, recordPayment, recordSale, type LedgerState } from "@/lib/ledger";

let n = 0;
const id = () => `op-${++n}`;
const NOW = "2026-11-20T18:00:00.000Z";

const withRice: LedgerState = {
  ...emptyState(),
  products: [{ id: "rice", name: "Arroz 1kg", price: 1500, cost: 1000, stock: 10, minStock: 2 }],
  customers: [{ id: "ana", name: "Ana", phone: "", createdAt: NOW }],
};

describe("every change on the phone is sent to the cloud", () => {
  it("a new product goes up with its starting stock", () => {
    const ops = ledgerOps(emptyState(), { ...emptyState(), products: withRice.products }, id, NOW);
    expect(ops.map((o) => o.kind)).toEqual(["product", "stock"]);
    expect(ops[1]).toMatchObject({ kind: "stock", productId: "rice", delta: 10, reason: "inicial" });
  });

  it("a sale goes up once and does not take the stock off twice", () => {
    const after = recordSale(withRice, { items: [{ productId: "rice", qty: 3 }], mode: "pronto" });
    const ops = ledgerOps(withRice, after, id, NOW);
    expect(ops.map((o) => o.kind)).toEqual(["sale"]);
  });

  it("restocking sends only the extra units", () => {
    const after = { ...withRice, products: [{ ...withRice.products[0]!, stock: 15 }] };
    expect(ledgerOps(withRice, after, id, NOW)).toEqual([
      { id: expect.any(String), kind: "stock", productId: "rice", delta: 5, reason: "reposicao" },
    ]);
  });

  it("a debt payment goes up", () => {
    const owing = recordSale(withRice, { items: [{ productId: "rice", qty: 2 }], mode: "fiado", customerId: "ana" });
    const paid = recordPayment(owing, { customerId: "ana", amount: 1000 });
    expect(ledgerOps(owing, paid, id, NOW)).toEqual([
      { id: expect.any(String), kind: "payment", payment: paid.payments[0] },
    ]);
  });

  it("deleting a product or customer is sent as a delete", () => {
    const ops = ledgerOps(withRice, { ...withRice, products: [], customers: [] }, id, NOW);
    expect(ops.map((o) => o.kind)).toEqual(["customer_delete", "product_delete"]);
  });

  it("sample data never leaves the phone", () => {
    expect(ledgerOps({ ...withRice, isSample: true }, { ...emptyState(), isSample: true }, id, NOW)).toEqual([]);
  });
});
