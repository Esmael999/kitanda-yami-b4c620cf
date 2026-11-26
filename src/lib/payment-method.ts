export const PAYMENT_METHODS = [
  { key: "cash", label: "Dinheiro em mão" },
  { key: "express", label: "Multicaixa Express" },
  { key: "iban", label: "Transferência por IBAN" },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["key"];
export const paymentLabel = (key: string | null | undefined) =>
  PAYMENT_METHODS.find(m => m.key === key)?.label ?? "";
export function recordedMethod(method: PaymentMethod | "", amountPaid: number): PaymentMethod | null {
  return amountPaid > 0 && method ? method : null;
}
