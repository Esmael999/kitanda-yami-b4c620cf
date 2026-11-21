import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, Field, PageHeader } from "@/components/app/ui";
import { supabase } from "@/integrations/supabase/client";
import { useCloud } from "@/lib/store";
import { PERMISSIONS, type Permission } from "@/lib/cloud-map";
import { businessInfo, defaultHelperPermissions, teamAllowed } from "@/lib/business";

export const Route = createFileRoute("/equipa")({
  head: () => ({
    meta: [
      { title: "Equipa — Kitanda Yami" },
      { name: "description", content: "Convide ajudantes e escolha o que cada um pode fazer." },
      { property: "og:title", content: "Equipa — Kitanda Yami" },
      { property: "og:description", content: "Convide ajudantes e escolha o que cada um pode fazer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Team,
});

type Perms = Partial<Record<Permission, boolean>>;
type Helper = { id: string; name: string; email: string; active: boolean; user_id: string | null; permissions: Perms };

function PermList({ value, onChange }: { value: Perms; onChange: (p: Perms) => void }) {
  return (
    <div className="space-y-2">
      {PERMISSIONS.map((p) => (
        <label key={p.key} className="flex items-center justify-between gap-3 text-sm">
          {p.label}
          <Switch checked={value[p.key] === true} onCheckedChange={(on) => onChange({ ...value, [p.key]: on })} />
        </label>
      ))}
    </div>
  );
}

function Team() {
  const { member } = useCloud();
  const type = member?.businessType;
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<Perms>(() => defaultHelperPermissions(type));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, email, active, user_id, permissions")
      .eq("role", "employee")
      .order("created_at");
    if (error) toast.error("Sem internet: não foi possível ver a equipa.");
    else setHelpers((data ?? []) as Helper[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (member?.role !== "owner") {
    return (
      <div>
        <PageHeader title="Equipa" back="/mais" />
        <Card className="mx-5 text-sm">Só o dono da loja pode gerir a equipa.</Card>
      </div>
    );
  }

  if (!teamAllowed(type)) {
    return (
      <div>
        <PageHeader title="Equipa" back="/mais" />
        <Card className="mx-5 space-y-2 text-sm">
          <p>
            O seu negócio está marcado como <strong>{businessInfo(type).name}</strong>, onde se atende sozinha.
          </p>
          <p className="text-muted-foreground">Se passou a ter ajudantes, mude o tipo de negócio nas Definições.</p>
          <Link to="/definicoes" className="font-semibold text-primary">
            Ir às Definições
          </Link>
        </Card>
      </div>
    );
  }

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("invite_employee", { _email: email, _name: name, _permissions: perms });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ajudante adicionado");
    setName("");
    setEmail("");
    setPerms(defaultHelperPermissions(type));
    void load();
  };

  const update = async (h: Helper, patch: { permissions?: Perms; active?: boolean }) => {
    const next = { ...h, ...patch };
    setHelpers((list) => list.map((x) => (x.id === h.id ? next : x)));
    const { error } = await supabase.rpc("update_employee", {
      _id: h.id,
      _permissions: next.permissions,
      _active: next.active,
    });
    if (error) {
      toast.error(error.message);
      void load();
    }
  };

  return (
    <div>
      <PageHeader title="Equipa" back="/mais" />
      <div className="space-y-4 px-5">
        <Card className="space-y-3">
          <div>
            <p className="font-semibold">Convidar ajudante</p>
            <p className="text-sm text-muted-foreground">
              O ajudante cria conta na app com este email e entra logo na sua loja. Cada venda fica com o nome de quem
              a fez.
            </p>
          </div>
          <form onSubmit={invite} className="space-y-3">
            <Field label="Nome" htmlFor="h-name">
              <Input id="h-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="João" className="h-12 rounded-xl text-base" />
            </Field>
            <Field label="Email do ajudante" htmlFor="h-email">
              <Input id="h-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@exemplo.com" className="h-12 rounded-xl text-base" />
            </Field>
            <p className="text-sm font-semibold">O que pode fazer</p>
            <PermList value={perms} onChange={setPerms} />
            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Convidar
            </Button>
          </form>
        </Card>

        {loading ? null : helpers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Ainda não tem ajudantes.</p>
        ) : (
          helpers.map((h) => (
            <Card key={h.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{h.name || h.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.email} · {h.user_id ? "já entrou" : "à espera que crie conta"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  {h.active ? "Ativo" : "Bloqueado"}
                  <Switch checked={h.active} onCheckedChange={(on) => void update(h, { active: on })} />
                </label>
              </div>
              <PermList value={h.permissions} onChange={(p) => void update(h, { permissions: p })} />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
