import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, HandCoins, Plus, ShoppingBag, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/app/ui";
import { Logo } from "@/components/app/shell";
import comerciante from "@/assets/comerciante.png.asset.json";
import { useLedger, updateLedger } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  addDays,
  debtors,
  emptyState,
  formatKz,
  formatDate,
  formatTime,
  isLowStock,
  periodStats,
  startOfDay,
} from "@/lib/ledger";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Kitanda" },
      { name: "description", content: "Vendas de hoje, dinheiro recebido e dívidas num só olhar." },
      { property: "og:title", content: "Início — Kitanda" },
      { property: "og:description", content: "Vendas de hoje, dinheiro recebido e dívidas num só olhar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "greet.morning" : h < 19 ? "greet.afternoon" : "greet.evening";
}

function Home() {
  const state = useLedger();
  const t = useT();
  const today = startOfDay(new Date());
  const stats = periodStats(state, today, addDays(today, 1));
  const yesterday = periodStats(state, addDays(today, -1), today);
  const owed = debtors(state);
  const totalOwed = owed.reduce((s, d) => s + d.debt, 0);
  const low = state.products.filter(isLowStock);
  const recent = state.sales.slice(0, 5);
  const custName = (id: string | null) => state.customers.find((c) => c.id === id)?.name;
  const diff = stats.total - yesterday.total;

  const clearSample = () =>
    updateLedger((s) => ({ ...emptyState(), settings: { ...s.settings, businessName: "A minha cantina", ownerName: "" } }), []);

  return (
    <div className="space-y-5 px-5 pt-safe">
      <div className="flex items-center justify-between">
        <Logo className="text-lg" />
        <Link to="/definicoes" className="max-w-[55%] truncate text-sm text-muted-foreground">
          {state.settings.businessName}
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-3xl border shadow-card animate-pop">
        <img
          src={comerciante.url}
          alt="Comerciante angolana na sua cantina"
          className="h-72 w-full object-cover object-[50%_8%]"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        <div className="absolute right-4 bottom-3 left-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow className="text-primary">Feito para Angola</Eyebrow>
            <p className="mt-0.5 truncate text-sm font-semibold">{state.settings.businessName}</p>
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">{formatDate(today.toISOString())}</p>
        </div>
      </section>

      <div>
        <h1 className="text-3xl leading-tight font-extrabold">
          {t(greeting())}
          {state.settings.ownerName ? `, ${state.settings.ownerName}` : ""}.
        </h1>
        <p className="text-muted-foreground">Veja como vai o negócio hoje.</p>
      </div>

      {state.isSample && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-success-soft p-3 text-sm animate-pop">
          <p className="flex-1">
            Estes são <strong>dados de exemplo</strong> para conhecer a app. Quando quiser, apague e
            comece com os seus.
          </p>
          <Button size="sm" variant="soft" onClick={clearSample}>
            <X /> Apagar
          </Button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero p-5 shadow-glow animate-pop">
        <Eyebrow className="text-foreground/80">{t("home.todaySales")}</Eyebrow>
        <p className="mt-1 text-4xl font-extrabold tabular">{formatKz(stats.total)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground/85">
          <TrendingUp className="size-4" />
          {stats.count} {stats.count === 1 ? "venda" : "vendas"}
          {yesterday.total > 0 && (
            <span>
              · {diff >= 0 ? "+" : ""}
              {formatKz(diff)} vs ontem
            </span>
          )}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-background/25 p-3">
            <p className="text-xs text-foreground/80">{t("home.receivedToday")}</p>
            <p className="font-bold tabular">{formatKz(stats.received)}</p>
          </div>
          <div className="rounded-2xl bg-background/25 p-3">
            <p className="text-xs text-foreground/80">{t("home.profitToday")}</p>
            <p className="font-bold tabular">{formatKz(stats.profit)}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="hero" size="xl">
          <Link to="/vender">
            <Plus /> {t("action.newSale")}
          </Link>
        </Button>
        <Button asChild variant="soft" size="xl">
          <Link to="/dividas">
            <HandCoins /> {t("action.receive")}
          </Link>
        </Button>
      </div>

      <Link to="/dividas" className="block">
        <Card className="flex items-center gap-3">
          <div className="flex-1">
            <Eyebrow className="text-muted-foreground">Dívidas a receber</Eyebrow>
            <p className="text-2xl font-extrabold text-debt tabular">{formatKz(totalOwed)}</p>
            <p className="text-sm text-muted-foreground">
              {owed.length === 0
                ? "Ninguém lhe deve nada."
                : `${owed.length} ${owed.length === 1 ? "cliente" : "clientes"} · maior: ${owed[0]?.customer.name ?? ""}`}
            </p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Card>
      </Link>

      {low.length > 0 && (
        <Link to="/produtos" search={{ filtro: "baixo" }} className="block">
          <Card className="border-debt/40">
            <div className="flex items-center gap-2 text-debt">
              <AlertTriangle className="size-4" />
              <p className="font-semibold">
                {low.length} {low.length === 1 ? "produto a acabar" : "produtos a acabar"}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {low
                .slice(0, 3)
                .map((p) => `${p.name} (${p.stock})`)
                .join(", ")}
              {low.length > 3 ? "…" : ""}
            </p>
          </Card>
        </Link>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("home.lastSales")}</h2>
          <Link to="/relatorios" className="text-sm text-primary">
            Relatórios
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <ShoppingBag className="size-5" /> Ainda não há vendas. Toque em “Vender” para começar.
          </Card>
        ) : (
          <Card className="divide-y p-0">
            {recent.map((s) => {
              const fiado = s.total > s.paid;
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(s.createdAt)} · {formatTime(s.createdAt)}
                      {custName(s.customerId) ? ` · ${custName(s.customerId)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular">{formatKz(s.total)}</p>
                    <p className={fiado ? "text-xs text-debt" : "text-xs text-primary"}>
                      {fiado ? "Fiado" : "Pago"}
                    </p>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
