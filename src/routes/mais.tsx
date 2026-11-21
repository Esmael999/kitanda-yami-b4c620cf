import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ChevronRight, Settings, UserCog, Users } from "lucide-react";
import { Card, PageHeader } from "@/components/app/ui";
import { InstallCard } from "@/components/app/install-card";
import { useT } from "@/lib/i18n";
import { useCloud } from "@/lib/store";
import { can } from "@/lib/cloud-map";
import { teamAllowed } from "@/lib/business";

export const Route = createFileRoute("/mais")({
  head: () => ({
    meta: [
      { title: "Mais — Kitanda Yami" },
      { name: "description", content: "Clientes, relatórios e definições do seu negócio." },
      { property: "og:title", content: "Mais — Kitanda Yami" },
      { property: "og:description", content: "Clientes, relatórios e definições do seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: More,
});

const items = [
  { to: "/clientes", label: "page.customers", text: "Contactos e histórico de compras", icon: Users },
  { to: "/relatorios", label: "page.reports", text: "Lucro, mais vendidos e vendas por dia", icon: BarChart3 },
  { to: "/definicoes", label: "page.settings", text: "Nome do negócio, cópia de segurança", icon: Settings },
] as const;

function More() {
  const t = useT();
  const { member } = useCloud();
  const showTeam = member?.role === "owner" && teamAllowed(member.businessType);
  const visible = items.filter((i) => i.to !== "/relatorios" || can(member, "relatorios"));
  return (
    <div>
      <PageHeader title={t("nav.more")} />
      <div className="space-y-2 px-5">
        {visible.map(({ to, label, text, icon: Icon }) => (
          <Link key={to} to={to} className="block">
            <Card className="flex items-center gap-3 py-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">{t(label)}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Card>
          </Link>
        ))}

        {showTeam && (
          <Link to="/equipa" className="block">
            <Card className="flex items-center gap-3 py-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <UserCog className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">Equipa</p>
                <p className="text-sm text-muted-foreground">Ajudantes e o que cada um pode fazer</p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Card>
          </Link>
        )}

        <InstallCard />
      </div>
    </div>
  );
}
