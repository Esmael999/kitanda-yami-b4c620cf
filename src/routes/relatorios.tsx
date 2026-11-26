import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, Eyebrow, PageHeader } from "@/components/app/ui";
import { useCloud, useLedger } from "@/lib/store";
import { can } from "@/lib/cloud-map";
import { filterReport, type SaleStatus } from "@/lib/report-filter";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { addDays, formatKz, periodStats, salesByDay, startOfDay, topProducts } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Kitanda Yami" },
      { name: "description", content: "Lucro, produtos mais vendidos e vendas por dia." },
      { property: "og:title", content: "Relatórios — Kitanda Yami" },
      { property: "og:description", content: "Lucro, produtos mais vendidos e vendas por dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

const periods = [
  { days: 1, label: "report.today" },
  { days: 7, label: "report.week" },
  { days: 30, label: "report.month" },
  { days: 0, label: "report.custom" },
] as const;

const weekday = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function Reports() {
  const original = useLedger();
  const { member } = useCloud();
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("");
  const [status, setStatus] = useState<SaleStatus>("all");
  const [chartType, setChartType] = useState<"bars" | "line" | "pie">("bars");
  const state = filterReport(original, customer, product, status);
  const t = useT();
  const [days, setDays] = useState<number>(7);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [fromTxt, setFromTxt] = useState(() => iso(addDays(new Date(), -6)));
  const [toTxt, setToTxt] = useState(() => iso(new Date()));
  const custom = days === 0;
  const parse = (t: string) => { if (!t) return startOfDay(new Date()); const [y, m, d] = t.split("-").map(Number); return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1); };
  const to = custom ? addDays(parse(toTxt), 1) : addDays(startOfDay(new Date()), 1);
  const from = custom ? parse(fromTxt) : addDays(to, -days);
  const stats = periodStats(state, from, to);
  const chart = salesByDay(state, custom ? Math.min(366, Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000))) : days, addDays(to, -1));
  const max = Math.max(1, ...chart.map((c) => c.total));
  const top = topProducts(state, from, to);
  const margin = stats.total ? Math.round((stats.profit / stats.total) * 100) : 0;

  if (!can(member, "relatorios")) return <div><PageHeader title={t("page.reports")} back="/mais" /><Card className="mx-5 text-sm">{t("report.denied")}</Card></div>;
  const pie = [{ name: "Pago na venda", value: stats.total - stats.fiado }, { name: "Kilapé na venda", value: stats.fiado }].filter(x => x.value > 0);
  return (
    <div>
      <PageHeader title={t("page.reports")} back="/mais" />
      <div className="space-y-4 px-5">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-secondary p-1">
          {periods.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={cn(
                "rounded-xl py-2.5 text-sm font-semibold",
                days === p.days ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {t(p.label)}
            </button>
          ))}
        </div>

        {custom && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">{t("report.from")}
              <input type="date" value={fromTxt} max={toTxt} onChange={(e) => { if (e.target.value && e.target.value <= toTxt) setFromTxt(e.target.value); }} className="mt-1 h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground" />
            </label>
            <label className="text-xs text-muted-foreground">{t("report.to")}
              <input type="date" value={toTxt} min={fromTxt} onChange={(e) => { if (e.target.value && e.target.value >= fromTxt) setToTxt(e.target.value); }} className="mt-1 h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground" />
            </label>
          </div>
        )}

        <Card className="space-y-2">
          <p className="font-semibold">{t("report.filters")}</p>
          <label className="block text-xs text-muted-foreground">{t("report.customer")}
            <select value={customer} onChange={e => setCustomer(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground">
              <option value="">{t("report.allCustomers")}</option>
              {original.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">{t("report.product")}
            <select value={product} onChange={e => setProduct(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground">
              <option value="">{t("report.allProducts")}</option>
              {original.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">{t("report.status")}
            <select value={status} onChange={e => setStatus(e.target.value as SaleStatus)} className="mt-1 h-11 w-full rounded-xl border bg-card px-3 text-sm text-foreground">
              <option value="all">{t("report.all")}</option><option value="paid">{t("report.paid")}</option><option value="credit">{t("report.credit")}</option>
            </select>
          </label>
          {(product || status !== "all") && <p className="text-xs text-muted-foreground">{t("report.filterHint")}</p>}
          <button type="button" onClick={() => { setCustomer(""); setProduct(""); setStatus("all"); }} className="text-sm font-semibold text-primary">{t("report.clear")}</button>
        </Card>
        <section className="rounded-3xl bg-gradient-hero p-5 shadow-glow">
          <Eyebrow className="text-foreground/80">{t("report.sold")}</Eyebrow>
          <p className="text-4xl font-extrabold tabular">{formatKz(stats.total)}</p>
          <p className="text-sm text-foreground/85">{stats.count} vendas</p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-muted-foreground">{t("report.profit")}</p>
            <p className="text-lg font-bold text-primary tabular">{formatKz(stats.profit)}</p>
            <p className="text-xs text-muted-foreground">margem {margin}%</p>
          </Card>
          <Card>
            <p className="text-xs text-muted-foreground">{t("report.received")}</p>
            <p className="text-lg font-bold tabular">{formatKz(stats.received)}</p>
            <p className="text-xs text-debt">kilapé {formatKz(stats.fiado)}</p>
          </Card>
        </div>

        <Card>
          <p className="mb-3 font-semibold">{t("report.daily")}</p>
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
            {([{ key: "bars", label: "report.bars" }, { key: "line", label: "report.line" }, { key: "pie", label: "report.pie" }] as const).map(c => <button key={c.key} type="button" aria-pressed={chartType === c.key} onClick={() => setChartType(c.key)} className={cn("rounded-lg py-2 text-xs font-semibold", chartType === c.key ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{t(c.label)}</button>)}
          </div>
          {custom && (to.getTime() - from.getTime()) / 86400000 > 366 && chartType !== "pie" && <p className="mb-2 text-xs text-muted-foreground">{t("report.rangeHint")}</p>}
          {chartType === "line" && <div className="h-48 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart.map(c => ({ date: c.date.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit" }), total: c.total }))}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis width={48} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip formatter={(v: number) => formatKz(v)} contentStyle={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }} />
                <Line dataKey="total" name={t("report.sales")} type="monotone" stroke="var(--primary)" strokeWidth={2} dot={chart.length <= 7} />
              </LineChart>
            </ResponsiveContainer>
          </div>}
          {chartType === "pie" && (pie.length ? <><div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="80%">{pie.map(p => <Cell key={p.name} fill={p.name === "Pago na venda" ? "var(--primary)" : "var(--debt)"} />)}</Pie><Tooltip formatter={(v: number) => formatKz(v)} contentStyle={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }} /></PieChart></ResponsiveContainer></div><p className="text-xs text-muted-foreground">Pago na venda: {formatKz(stats.total - stats.fiado)} · Kilapé na venda: {formatKz(stats.fiado)}</p></> : <p className="text-sm text-muted-foreground">{t("report.empty")}</p>)}
          {chartType === "bars" && <div className="flex h-36 items-end gap-1 overflow-hidden">
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
          </div>}
        </Card>

        <Card>
          <p className="mb-2 font-semibold">{t("report.best")}</p>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("report.empty")}</p>
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
