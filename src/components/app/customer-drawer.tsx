import { useState } from "react";
import { MessageCircle, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Field, MoneyInput, whatsappLink } from "@/components/app/ui";
import { updateLedger, useLedger } from "@/lib/store";
import {
  customerDebt,
  daysSince,
  debtSince,
  formatDate,
  formatKz,
  LedgerError,
  newId,
  recordPayment,
} from "@/lib/ledger";

/** Create (customerId = "new") or view/edit a customer, receive debt payments and see history. */
export function CustomerDrawer({
  customerId,
  onClose,
}: {
  customerId: string | null;
  onClose: () => void;
}) {
  const state = useLedger();
  const isNew = customerId === "new";
  const customer = state.customers.find((c) => c.id === customerId) ?? null;
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [amount, setAmount] = useState(0);

  const debt = customer ? customerDebt(state, customer.id) : 0;
  const since = customer ? debtSince(state, customer.id) : null;

  const history = customer
    ? [
        ...state.sales
          .filter((s) => s.customerId === customer.id)
          .map((s) => ({
            id: s.id,
            at: s.createdAt,
            label: s.items.map((i) => `${i.qty}× ${i.name}`).join(", "),
            amount: s.total,
            note: s.total > s.paid ? `Fiado ${formatKz(s.total - s.paid)}` : "Pago",
            kind: "sale" as const,
          })),
        ...state.payments
          .filter((p) => p.customerId === customer.id)
          .map((p) => ({ id: p.id, at: p.createdAt, label: "Pagamento recebido", amount: p.amount, note: "", kind: "pay" as const })),
      ].sort((a, b) => b.at.localeCompare(a.at))
    : [];

  const saveDetails = () => {
    if (!name.trim()) {
      toast.error("Escreva o nome do cliente.");
      return;
    }
    updateLedger((s) =>
      isNew
        ? { ...s, customers: [...s.customers, { id: newId(), name: name.trim(), phone: phone.trim(), createdAt: new Date().toISOString() }] }
        : { ...s, customers: s.customers.map((c) => (c.id === customerId ? { ...c, name: name.trim(), phone: phone.trim() } : c)) },
    );
    toast.success(isNew ? "Cliente adicionado" : "Dados guardados");
    if (isNew) onClose();
  };

  const receive = (value: number) => {
    if (!customer) return;
    try {
      updateLedger((s) => recordPayment(s, { customerId: customer.id, amount: value }));
      toast.success(`Recebido ${formatKz(value)} de ${customer.name}`);
      setAmount(0);
    } catch (e) {
      toast.error(e instanceof LedgerError ? e.message : "Não foi possível registar.");
    }
  };

  const remove = () => {
    if (!customer) return;
    if (debt > 0) {
      toast.error("Este cliente ainda tem dívidas. Receba primeiro.");
      return;
    }
    if (!window.confirm(`Apagar ${customer.name}?`)) return;
    updateLedger((s) => ({ ...s, customers: s.customers.filter((c) => c.id !== customer.id) }));
    toast.success("Cliente apagado");
    onClose();
  };

  const reminder = customer
    ? `Olá ${customer.name}, aqui é da ${state.settings.businessName}. Lembramos que tem ${formatKz(debt)} em aberto${since ? ` desde ${formatDate(since)}` : ""}. Obrigado!`
    : "";

  return (
    <Drawer open={!!customerId} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle>{isNew ? "Novo cliente" : customer?.name}</DrawerTitle>
          <DrawerDescription>
            {isNew
              ? "Guarde o contacto para vender fiado e enviar lembretes."
              : debt > 0
                ? `Deve ${formatKz(debt)}${since ? ` desde ${formatDate(since)} (${daysSince(since)} dias)` : ""}`
                : "Sem dívidas."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 overflow-y-auto px-4 pb-2">
          {customer && debt > 0 && (
            <div className="space-y-3 rounded-3xl border border-debt/40 bg-debt-soft p-4">
              <p className="text-3xl font-extrabold text-debt tabular">{formatKz(debt)}</p>
              <Field label="Valor recebido" htmlFor="pay-amount">
                <MoneyInput id="pay-amount" value={amount} onChange={setAmount} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="soft" onClick={() => receive(amount)} disabled={amount <= 0}>
                  Receber parte
                </Button>
                <Button variant="debt" onClick={() => receive(debt)}>
                  Pagou tudo
                </Button>
              </div>
              {customer.phone && (
                <Button asChild variant="outline" className="w-full">
                  <a href={whatsappLink(customer.phone, reminder)} target="_blank" rel="noreferrer">
                    <MessageCircle /> Enviar lembrete por WhatsApp
                  </a>
                </Button>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Field label="Nome" htmlFor="c-name">
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João Manuel" className="h-12 rounded-xl text-base" />
            </Field>
            <Field label="Telefone" htmlFor="c-phone">
              <div className="flex gap-2">
                <Input id="c-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="923 000 000" className="h-12 rounded-xl text-base" />
                {customer?.phone && (
                  <Button asChild variant="soft" size="icon-lg" className="h-12 w-12">
                    <a href={`tel:${customer.phone}`} aria-label="Ligar">
                      <Phone />
                    </a>
                  </Button>
                )}
              </div>
            </Field>
            <Button variant={isNew ? "hero" : "soft"} size={isNew ? "xl" : "default"} className="w-full" onClick={saveDetails}>
              {isNew ? "Adicionar cliente" : "Guardar dados"}
            </Button>
          </div>

          {customer && (
            <div>
              <p className="mb-2 font-semibold">Histórico</p>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem compras.</p>
              ) : (
                <div className="divide-y rounded-2xl border">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{h.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(h.at)}
                          {h.note ? ` · ${h.note}` : ""}
                        </p>
                      </div>
                      <p className={h.kind === "pay" ? "text-sm font-semibold text-primary tabular" : "text-sm font-semibold tabular"}>
                        {h.kind === "pay" ? "+" : ""}
                        {formatKz(h.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {customer && (
          <DrawerFooter>
            <Button variant="ghost" className="text-destructive" onClick={remove}>
              <Trash2 /> Apagar cliente
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
