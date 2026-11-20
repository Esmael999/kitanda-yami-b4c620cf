import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, Eyebrow, PageHeader } from "@/components/app/ui";
import { useLedger } from "@/lib/store";
import { addDays, formatKz, periodStats, salesByDay, startOfDay, topProducts } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Kitanda" },
      { name: "description", content: "Lucro, produtos mais vendidos e vendas por dia." },
      { property: "og:title", content: "Relatórios — Kitanda" },
      { property: "og:description", content: "Lucro, produtos mais vendidos e vendas por dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

const periods = [
  { days: 1, label: "Hoje" },
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
] as const;

const weekday = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function Reports() {
  const state = useLedger();
  const t = useT();
  const [days, setDays] = useState<number>(7);
  const to = addDays(startOfDay(new Date()), 1);
  const from = addDays(to, -days);
  const stats = periodStats(state, from, to);
  const chart = salesByDay(state, days === 1 ? 7 : days);
  const max = Math.max(1, ...chart.map((c) => c.total));
  const top = topProducts(state, from, to);
  const margin = stats.total ? Math.round((stats.profit / stats.total) * 100) : 0;

  return (
    <div>
      <PageHeader title={t("page.reports")} back="/mais" />
      <div className="space-y-4 px-5">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1">
          {periods.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={cn(
                "rounded-xl py-2.5 text-sm font-semibold",
                days === p.days ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <section className="rounded-3xl bg-gradient-hero p-5 shadow-glow">
          <Eyebrow className="text-foreground/80">Vendido</Eyebrow>
          <p className="text-4xl font-extrabold tabular">{formatKz(stats.total)}</p>
          <p className="text-sm text-foreground/85">{stats.count} vendas</p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-muted-foreground">Lucro</p>
            <p className="text-lg font-bold text-primary tabular">{formatKz(stats.profit)}</p>
            <p className="text-xs text-muted-foreground">margem {margin}%</p>
          </Card>
          <Card>
            <p className="text-xs text-muted-foreground">Recebido</p>
            <p className="text-lg font-bold tabular">{formatKz(stats.received)}</p>
            <p className="text-xs text-debt">fiado {formatKz(stats.fiado)}</p>
          </Card>
        </div>

        <Card>
          <p className="mb-3 font-semibold">Vendas por dia</p>
          <div className="flex h-36 items-end gap-1">
            {chart.map((c) => (
              <div key={c.date.toISOString()} className="flex h-full flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-primary"
                    style={{ height: `${Math.max(3, (c.total / max) * 100)}%`, opacity: c.total ? 1 : 0.25 }}
                    title={formatKz(c.total)}
                  />
                </div>
                {chart.length <= 7 && (
                  <span className="text-[10px] text-muted-foreground">{weekday[c.date.getDay()]}</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="mb-2 font-semibold">Mais vendidos</p>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas neste período.</p>
          ) : (
            <ol className="space-y-2">
              {top.map((t, i) => (
                <li key={t.name} className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-lg bg-accent text-xs font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm">
                    {t.name} <span className="text-muted-foreground">· {t.qty} un.</span>
                  </span>
                  <span className="text-sm font-semibold tabular">{formatKz(t.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
