import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Copy, MessageCircle, Minus, Package, Plus, Search, UserPlus } from "lucide-react";
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
import { EmptyState, Field, MoneyInput, PageHeader, whatsappLink } from "@/components/app/ui";
import { updateLedger, useLedger } from "@/lib/store";
import { cartTotal, formatKz, LedgerError, newId, receiptText, recordSale, type ReceiptInfo } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/vender")({
  head: () => ({
    meta: [
      { title: "Nova venda — Kitanda Yami" },
      { name: "description", content: "Registe uma venda em segundos, a pronto ou kilapé." },
      { property: "og:title", content: "Nova venda — Kitanda Yami" },
      { property: "og:description", content: "Registe uma venda em segundos, a pronto ou kilapé." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sell,
});

function Sell() {
  const state = useLedger();
  const t = useT();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState(false);

  const products = useMemo(
    () =>
      state.products
        .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.products, q],
  );
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: state.products.find((p) => p.id === id), qty }))
    .filter((l): l is { product: NonNullable<typeof l.product>; qty: number } => !!l.product && l.qty > 0);
  const total = cartTotal(lines.map((l) => ({ qty: l.qty, price: l.product.price })));
  const units = lines.reduce((s, l) => s + l.qty, 0);

  const change = (id: string, delta: number, max: number) =>
    setCart((c) => {
      const next = Math.min(max, Math.max(0, (c[id] ?? 0) + delta));
      if (delta > 0 && next === (c[id] ?? 0)) toast.warning("Não há mais em stock.");
      return { ...c, [id]: next };
    });

  return (
    <div>
      <PageHeader title={t("action.newSale")} subtitle="Toque nos produtos para adicionar." />
      <div className="px-5">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar produto"
            className="h-12 rounded-xl pl-10 text-base"
          />
        </div>
      </div>

      {state.products.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Package className="size-5" />}
            title="Ainda sem produtos"
            text="Adicione primeiro os produtos que vende."
            action={
              <Button variant="hero" onClick={() => navigate({ to: "/produtos" })}>
                Ir para produtos
              </Button>
            }
          />
        </div>
      ) : (
        <div className={cn("mt-4 grid grid-cols-2 items-start gap-3 px-5", units > 0 && "pb-24")}>
          {products.map((p) => {
            const qty = cart[p.id] ?? 0;
            const out = p.stock === 0;
            return (
              <div
                key={p.id}
                className={cn(
                  "relative rounded-3xl border bg-card p-3 transition-colors",
                  qty > 0 && "border-primary bg-accent",
                  out && "opacity-50",
                )}
              >
                <button
                  disabled={out}
                  onClick={() => change(p.id, 1, p.stock)}
                  className="block w-full text-left"
                >
                  <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-tight">{p.name}</p>
                  <p className="mt-1 font-bold text-primary tabular">{formatKz(p.price)}</p>
                  <p className="text-xs text-muted-foreground">{out ? "Esgotado" : `${p.stock} em stock`}</p>
                </button>
                {qty > 0 && (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-background/60 p-1">
                    <button
                      aria-label={`Tirar ${p.name}`}
                      onClick={() => change(p.id, -1, p.stock)}
                      className="grid size-8 place-items-center rounded-lg bg-secondary"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="font-bold tabular">{qty}</span>
                    <button
                      aria-label={`Mais ${p.name}`}
                      onClick={() => change(p.id, 1, p.stock)}
                      className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {units > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto max-w-md px-5 animate-pop">
          <button
            onClick={() => setCheckout(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-gradient-primary px-5 py-4 text-primary-foreground shadow-glow"
          >
            <span className="text-sm font-semibold">
              {units} {units === 1 ? "item" : "itens"} · Concluir
            </span>
            <span className="text-lg font-extrabold tabular">{formatKz(total)}</span>
          </button>
        </div>
      )}

      <CheckoutDrawer
        open={checkout}
        onClose={() => setCheckout(false)}
        total={total}
        lines={lines.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price }))}
        onDone={() => {
          setCart({});
          setCheckout(false);
          navigate({ to: "/" });
        }}
      />
    </div>
  );
}

function CheckoutDrawer({
  open,
  onClose,
  total,
  lines,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  lines: { productId: string; name: string; qty: number; price: number }[];
  onDone: () => void;
}) {
  const state = useLedger();
  const [mode, setMode] = useState<"pronto" | "fiado">("pronto");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [given, setGiven] = useState(0);
  const [upfront, setUpfront] = useState(0);
  const [receipt, setReceipt] = useState<{ info: ReceiptInfo; phone: string } | null>(null);

  const confirm = () => {
    try {
      let cid = customerId;
      updateLedger((s) => {
        let next = s;
        if (addingCustomer && newName.trim()) {
          cid = newId();
          next = {
            ...next,
            customers: [...next.customers, { id: cid, name: newName.trim(), phone: "", createdAt: new Date().toISOString() }],
          };
        }
        return recordSale(next, {
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
          mode,
          customerId: cid,
          upfront: mode === "fiado" ? upfront : undefined,
        });
      });
      toast.success(mode === "fiado" ? `Venda fiada de ${formatKz(total - upfront)} registada` : `Venda de ${formatKz(total)} registada`);
      const cust = cid ? state.customers.find((c) => c.id === cid) : null;
      setReceipt({
        phone: cust?.phone ?? "",
        info: {
          shop: state.settings.businessName || "Kitanda Yami",
          at: new Date().toISOString(),
          customer: cust?.name ?? (addingCustomer && newName.trim() ? newName.trim() : null),
          lines: lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
          total,
          mode,
          given: mode === "pronto" ? given : 0,
          upfront: mode === "fiado" ? upfront : 0,
        },
      });
    } catch (e) {
      toast.error(e instanceof LedgerError ? e.message : "Não foi possível registar.");
    }
  };

  const changeDue = given - total;

  if (receipt) {
    const text = receiptText(receipt.info);
    const wa = receipt.phone ? whatsappLink(receipt.phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`;
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onDone()}>
        <DrawerContent className="mx-auto max-h-[92dvh] max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle>Comprovativo</DrawerTitle>
            <DrawerDescription>Envie ao cliente pelo WhatsApp.</DrawerDescription>
          </DrawerHeader>
          <pre className="mx-4 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-secondary p-4 font-sans text-sm">{text}</pre>
          <DrawerFooter>
            <Button asChild variant="hero" size="xl">
              <a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> Enviar por WhatsApp</a>
            </Button>
            <Button variant="outline" onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success("Texto copiado"))}>
              <Copy /> Copiar texto
            </Button>
            <Button variant="ghost" onClick={onDone}>Nova venda</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-md">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-2xl">{formatKz(total)}</DrawerTitle>
          <DrawerDescription>
            {lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            {(["pronto", "fiado"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-xl py-3 text-sm font-semibold",
                  mode === m
                    ? m === "fiado"
                      ? "bg-debt text-debt-foreground"
                      : "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {m === "pronto" ? "A pronto" : "Kilapé"}
              </button>
            ))}
          </div>

          {mode === "pronto" && (
            <Field label="Valor entregue pelo cliente (opcional)" htmlFor="given">
              <MoneyInput id="given" value={given} onChange={setGiven} />
              {given > 0 && (
                <p className={cn("text-sm font-semibold", changeDue >= 0 ? "text-primary" : "text-destructive")}>
                  {changeDue >= 0 ? `Troco: ${formatKz(changeDue)}` : `Faltam ${formatKz(-changeDue)}`}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {[1000, 2000, 5000, 10000].filter((n) => n >= total).slice(0, 3).map((n) => (
                  <Button key={n} variant="soft" size="sm" onClick={() => setGiven(n)}>
                    {formatKz(n)}
                  </Button>
                ))}
              </div>
            </Field>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Cliente {mode === "pronto" && <span className="text-muted-foreground">(opcional)</span>}
            </p>
            {addingCustomer ? (
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do novo cliente"
                className="h-12 rounded-xl text-base"
              />
            ) : (
              <CustomerSearch customers={state.customers} value={customerId} onChange={setCustomerId} />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAddingCustomer((a) => !a);
                setCustomerId(null);
              }}
            >
              <UserPlus /> {addingCustomer ? "Escolher cliente existente" : "Novo cliente"}
            </Button>
          </div>

          {mode === "fiado" && (
            <Field
              label="Entrada paga agora (opcional)"
              htmlFor="upfront"
              hint={`Fica a dever: ${formatKz(Math.max(0, total - upfront))}`}
            >
              <MoneyInput id="upfront" value={upfront} onChange={setUpfront} />
            </Field>
          )}
        </div>

        <DrawerFooter>
          <Button variant={mode === "fiado" ? "debt" : "hero"} size="xl" onClick={confirm}>
            <Check /> {mode === "fiado" ? "Registar fiado" : "Confirmar venda"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function CustomerSearch({ customers, value, onChange }: { customers: { id: string; name: string; phone: string }[]; value: string | null; onChange: (id: string | null) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const chosen = customers.find((c) => c.id === value);
  const list = customers
    .filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);
  if (chosen)
    return (
      <button type="button" onClick={() => onChange(null)} className="flex h-12 w-full items-center gap-2 rounded-xl border border-primary bg-accent px-3 text-left text-sm text-accent-foreground">
        <Check className="size-4" /> <span className="flex-1 truncate font-semibold">{chosen.name}</span>
        <span className="text-xs">Trocar</span>
      </button>
    );
  return (
    <div className="relative">
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Procurar cliente por nome ou telefone"
        className="h-12 rounded-xl text-base"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-card">
          {list.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</p>
          ) : (
            list.map((c) => (
              <button key={c.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(c.id); setQ(""); setOpen(false); }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent">
                <span className="truncate font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.phone}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
