import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HandCoins } from "lucide-react";
import { Avatar, Card, EmptyState, Eyebrow, PageHeader } from "@/components/app/ui";
import { CustomerDrawer } from "@/components/app/customer-drawer";
import { useLedger } from "@/lib/store";
import { daysSince, debtors, formatDate, formatKz } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/dividas")({
  head: () => ({
    meta: [
      { title: "Dívidas — Kitanda" },
      { name: "description", content: "Saiba quem deve, quanto e desde quando. Receba aos poucos." },
      { property: "og:title", content: "Dívidas — Kitanda" },
      { property: "og:description", content: "Saiba quem deve, quanto e desde quando. Receba aos poucos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Debts,
});

function Debts() {
  const state = useLedger();
  const t = useT();
  const list = debtors(state);
  const total = list.reduce((s, d) => s + d.debt, 0);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title={t("nav.debts")} subtitle="Quem lhe deve e desde quando." />
      <div className="space-y-4 px-5">
        <Card className="border-debt/40 bg-debt-soft">
          <Eyebrow className="text-debt">Total a receber</Eyebrow>
          <p className="mt-1 text-4xl font-extrabold text-debt tabular">{formatKz(total)}</p>
          <p className="text-sm text-muted-foreground">
            {list.length} {list.length === 1 ? "cliente" : "clientes"} com contas em aberto
          </p>
        </Card>

        {list.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="size-5" />}
            title="Ninguém lhe deve"
            text="Quando vender fiado, a dívida aparece aqui."
          />
        ) : (
          <div className="space-y-2">
            {list.map(({ customer, debt, since }) => {
              const days = since ? daysSince(since) : 0;
              return (
                <button key={customer.id} onClick={() => setOpen(customer.id)} className="block w-full text-left">
                  <Card className="flex items-center gap-3 py-3">
                    <Avatar name={customer.name} tone="debt" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{customer.name}</p>
                      {since && (
                        <p className={cn("text-xs", days >= 30 ? "text-destructive" : "text-muted-foreground")}>
                          desde {formatDate(since)} · {days === 0 ? "hoje" : `${days} ${days === 1 ? "dia" : "dias"}`}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-debt tabular">{formatKz(debt)}</p>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <CustomerDrawer key={open ?? "none"} customerId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
