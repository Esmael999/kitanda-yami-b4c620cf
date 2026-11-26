import { describe, expect, it } from "vitest";
import { paymentLabel, recordedMethod } from "@/lib/payment-method";
import { receiptText } from "@/lib/ledger";
describe("payment annotations", () => {
  it("only labels an actual payment", () => {
    expect(recordedMethod("express", 0)).toBeNull();
    expect(recordedMethod("iban", 500)).toBe("iban");
    expect(recordedMethod("", 500)).toBeNull();
    expect(paymentLabel("unknown")).toBe("");
  });
  it("adds the selected method to the receipt without changing the sale total", () => {
    const receipt = receiptText({ shop:"Loja", at:"2026-01-01T12:00:00Z", customer:null, lines:[{name:"Arroz",qty:1,price:500}],total:500,mode:"pronto",given:0,upfront:0,paymentMethod:"express" });
    expect(receipt).toContain("Método de pagamento: Multicaixa Express");
    expect(receipt).toContain("Total: 500 Kz");
  });
});
