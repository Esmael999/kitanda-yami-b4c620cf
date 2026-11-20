import { describe, expect, it } from "vitest";
import {
  customerDebt,
  debtSince,
  emptyState,
  formatKz,
  isLowStock,
  recordPayment,
  recordSale,
  type LedgerState,
} from "@/lib/ledger";

const base = (): LedgerState => ({
  ...emptyState(),
  products: [{ id: "arroz", name: "Arroz", price: 1200, cost: 950, stock: 10, minStock: 3 }],
  customers: [{ id: "joao", name: "João", phone: "", createdAt: "2026-11-01T09:00:00.000Z" }],
});

describe("Kitanda rules", () => {
  it("formats Kwanza with dot thousands separators", () => {
    expect(formatKz(125000)).toBe("125.000 Kz");
    expect(formatKz(8500)).toBe("8.500 Kz");
  });

  it("a sale lowers the product stock", () => {
    const s = recordSale(base(), { items: [{ productId: "arroz", qty: 4 }], mode: "pronto" });
    expect(s.products[0]?.stock).toBe(6);
    expect(s.sales[0]?.total).toBe(4800);
  });

  it("refuses to sell more than the stock", () => {
    expect(() =>
      recordSale(base(), { items: [{ productId: "arroz", qty: 11 }], mode: "pronto" }),
    ).toThrow(/Só há 10/);
  });

  it("a fiado sale becomes debt minus the upfront amount", () => {
    const s = recordSale(base(), {
      items: [{ productId: "arroz", qty: 5 }],
      mode: "fiado",
      customerId: "joao",
      upfront: 1000,
    });
    expect(customerDebt(s, "joao")).toBe(5000);
  });

  it("a fiado sale needs a customer", () => {
    expect(() =>
      recordSale(base(), { items: [{ productId: "arroz", qty: 1 }], mode: "fiado" }),
    ).toThrow(/cliente/);
  });

  it("partial payments reduce the debt and cannot exceed it", () => {
    let s = recordSale(base(), {
      items: [{ productId: "arroz", qty: 5 }],
      mode: "fiado",
      customerId: "joao",
    });
    s = recordPayment(s, { customerId: "joao", amount: 2000 });
    expect(customerDebt(s, "joao")).toBe(4000);
    expect(() => recordPayment(s, { customerId: "joao", amount: 4001 })).toThrow();
  });

  it("debt date moves to the next unpaid sale once the oldest is paid", () => {
    let s = recordSale(base(), {
      items: [{ productId: "arroz", qty: 1 }],
      mode: "fiado",
      customerId: "joao",
      now: new Date("2026-11-02T10:00:00Z"),
    });
    s = recordSale(s, {
      items: [{ productId: "arroz", qty: 1 }],
      mode: "fiado",
      customerId: "joao",
      now: new Date("2026-11-05T10:00:00Z"),
    });
    expect(debtSince(s, "joao")).toBe("2026-11-02T10:00:00.000Z");
    s = recordPayment(s, { customerId: "joao", amount: 1200 });
    expect(debtSince(s, "joao")).toBe("2026-11-05T10:00:00.000Z");
  });

  it("stock is low when it reaches the alert level", () => {
    const p = { id: "x", name: "x", price: 1, cost: 0, stock: 3, minStock: 3 };
    expect(isLowStock(p)).toBe(true);
    expect(isLowStock({ ...p, stock: 4 })).toBe(false);
  });
});

import { receiptText } from "@/lib/ledger";
describe("comprovativo", () => {
  const base = { shop: "Kitanda Yami", at: "2026-11-20T10:00:00Z", customer: "Ana", lines: [{ name: "Fuba", qty: 2, price: 1000 }], total: 2000, given: 5000, upfront: 500 };
  it("a pronto mostra troco", () => {
    const t = receiptText({ ...base, mode: "pronto" });
    expect(t).toContain("Kitanda Yami");
    expect(t).toMatch(/Troco: 3[\s.]?000/);
  });
  it("fiado mostra o que fica a dever", () => {
    expect(receiptText({ ...base, mode: "fiado" })).toMatch(/Fica a dever: 1[\s.]?500/);
  });
});
