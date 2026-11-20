import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ChevronRight, Settings, Smartphone, Users } from "lucide-react";
import { Card, PageHeader } from "@/components/app/ui";

export const Route = createFileRoute("/mais")({
  head: () => ({
    meta: [
      { title: "Mais — Kitanda" },
      { name: "description", content: "Clientes, relatórios e definições do seu negócio." },
      { property: "og:title", content: "Mais — Kitanda" },
      { property: "og:description", content: "Clientes, relatórios e definições do seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: More,
});

const items = [
  { to: "/clientes", label: "Clientes", text: "Contactos e histórico de compras", icon: Users },
  { to: "/relatorios", label: "Relatórios", text: "Lucro, mais vendidos e vendas por dia", icon: BarChart3 },
  { to: "/definicoes", label: "Definições", text: "Nome do negócio, cópia de segurança", icon: Settings },
] as const;

function More() {
  return (
    <div>
      <PageHeader title="Mais" />
      <div className="space-y-2 px-5">
        {items.map(({ to, label, text, icon: Icon }) => (
          <Link key={to} to={to} className="block">
            <Card className="flex items-center gap-3 py-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">{label}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Card>
          </Link>
        ))}

        <Card className="mt-4 bg-success-soft">
          <div className="flex items-center gap-2 font-semibold">
            <Smartphone className="size-4 text-primary" /> Pôr a Kitanda no ecrã do telemóvel
          </div>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Android (Chrome):</strong> menu ⋮ → “Adicionar ao ecrã inicial”.
            </li>
            <li>
              <strong className="text-foreground">iPhone (Safari):</strong> botão Partilhar → “Adicionar ao ecrã principal”.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
