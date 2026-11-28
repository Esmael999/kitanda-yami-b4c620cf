import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/app/ui";
import { CustomerDrawer } from "@/components/app/customer-drawer";
import { useLedger } from "@/lib/store";
import { customerDebt, formatKz } from "@/lib/ledger";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Kitanda Yami" },
      { name: "description", content: "Histórico de compras e contactos de cada cliente." },
      { property: "og:title", content: "Clientes — Kitanda Yami" },
      { property: "og:description", content: "Histórico de compras e contactos de cada cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Customers,
});

function Customers() {
  const state = useLedger();
  const t = useT();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const list = state.customers
    .filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title={t("page.customers")}
        subtitle={`${state.customers.length} clientes`}
        back="/mais"
        action={
          <Button variant="hero" size="icon-lg" aria-label="Novo cliente" onClick={() => setOpen("new")}>
            <Plus />
          </Button>
        }
      />
      <div className="space-y-3 px-5">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.searchPerson")} className="h-12 rounded-xl pl-10 text-base" />
        </div>
        {list.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title={state.customers.length ? "Nenhum cliente encontrado" : "Ainda sem clientes"}
            text="Adicione clientes para vender a kilapé e ver o histórico."
          />
        ) : (
          list.map((c) => {
            const debt = customerDebt(state, c.id);
            const bought = state.sales.filter((s) => s.customerId === c.id).reduce((s, x) => s + x.total, 0);
            return (
              <button key={c.id} onClick={() => setOpen(c.id)} className="block w-full text-left">
                <Card className="flex items-center gap-3 py-3">
                  <Avatar name={c.name} tone={debt > 0 ? "debt" : "primary"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.phone || "Sem telefone"} · comprou {formatKz(bought)}
                    </p>
                  </div>
                  {debt > 0 && <p className="text-sm font-bold text-debt tabular">{formatKz(debt)}</p>}
                </Card>
              </button>
            );
          })
        )}
      </div>
      <CustomerDrawer key={open ?? "none"} customerId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
