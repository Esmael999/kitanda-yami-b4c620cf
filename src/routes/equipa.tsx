import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Loader2, MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, Field, PageHeader } from "@/components/app/ui";
import { supabase } from "@/integrations/supabase/client";
import { useCloud } from "@/lib/store";
import { PERMISSIONS, type Permission } from "@/lib/cloud-map";
import { useT } from "@/lib/i18n";
import { angolanPhone } from "@/lib/phone";
import { createInvite, listInvites, inviteUrl, type TeamInvite, type InviteContact } from "@/lib/team-invite";
import { defaultHelperPermissions, HELPER_PRESETS } from "@/lib/business";

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
  const t = useT();
  const { member } = useCloud();
  const type = member?.businessType;
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<InviteContact>("email");
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [share, setShare] = useState<{ url: string; contact: string; kind: InviteContact } | null>(null);
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
    try { setInvites(await listInvites()); } catch { toast.error("Não foi possível consultar os convites."); }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (member?.role !== "owner") {
    return (
      <div>
        <PageHeader title={t("team.title")} back="/mais" />
        <Card className="mx-5 text-sm">Só o dono da loja pode gerir a equipa.</Card>
      </div>
    );
  }

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const contact = kind === "phone" ? angolanPhone(email) : email.trim().toLowerCase();
    if (!contact) { toast.error("Introduza um contacto válido."); return; }
    setBusy(true);
    try {
      const result = await createInvite({ contact, kind, name, permissions: perms });
      setShare({url:inviteUrl(result.token), contact, kind});
      toast.success("Convite criado");
      setName(""); setEmail(""); setPerms(defaultHelperPermissions(type));
      await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível criar o convite."); }
    finally { setBusy(false); }
  };

  const resend = async (i: TeamInvite) => {
    if (busy || i.used_at) return;
    setBusy(true);
    try {
      const result = await createInvite({ contact:i.contact, kind:i.kind, name:i.name, permissions:i.permissions });
      setShare({url:inviteUrl(result.token),contact:i.contact,kind:i.kind});
      toast.success("Novo link criado. O anterior deixou de funcionar.");
      await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível reenviar."); }
    finally { setBusy(false); }
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
              Envie um convite ao ajudante. O link é válido por 7 dias e só pode ser utilizado uma vez.
            </p>
          </div>
          <form onSubmit={invite} className="space-y-3">
            <Field label={t("common.name")} htmlFor="h-name">
              <Input id="h-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="João" className="h-12 rounded-xl text-base" />
            </Field>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1" role="group" aria-label="Contacto do ajudante">
              {(["email","phone"] as const).map(k => <Button key={k} type="button" variant={kind===k?"hero":"ghost"} aria-pressed={kind===k} onClick={() => {setKind(k);setEmail("");}}> {k==="email"?"Email":"Telefone"}</Button>)}
            </div>
            <Field label={kind==="email"?t("team.contactEmail"):t("team.contactPhone")} htmlFor="h-email">
              <Input id="h-email" type={kind==="email"?"email":"tel"} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={kind==="email"?"joao@exemplo.com":"923 456 789"} className="h-12 rounded-xl text-base" />
            </Field>
            <Field label="Perfil de acesso" htmlFor="h-preset">
              <select id="h-preset" value="" onChange={(e) => { const preset = HELPER_PRESETS[Number(e.target.value)]; if (e.target.value !== "" && preset) setPerms({ ...preset.permissions }); }} className="h-12 w-full rounded-xl border bg-card px-3 text-sm">
                <option value="">Escolher perfil ou personalizar abaixo</option>
                {HELPER_PRESETS.map((p, i) => <option key={p.name} value={i}>{p.name} — {p.description}</option>)}
              </select>
            </Field>
            <p className="text-sm font-semibold">O que pode fazer</p>
            <PermList value={perms} onChange={setPerms} />
            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Convidar
            </Button>
          </form>
        </Card>

        {share && <Card className="space-y-3">
          <p className="font-semibold">{t("team.sendInvite")}</p>
          <p className="text-sm text-muted-foreground">Partilhe o link apenas com o ajudante. Pode ser usado uma vez e expira em 7 dias.</p>
          <Button variant="hero" className="w-full" asChild><a href={`https://wa.me/${share.kind==="phone"?share.contact.replace(/^\+/,""):""}?text=${encodeURIComponent("Convite para a equipa Kitanda Yami: "+share.url)}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a></Button>
          <Button variant="soft" className="w-full" asChild><a href={`sms:${share.kind==="phone"?share.contact:""}?body=${encodeURIComponent("Convite para a equipa Kitanda Yami: "+share.url)}`}>Enviar por SMS</a></Button>
          <Button variant="soft" className="w-full" onClick={async()=>{try{await navigator.clipboard.writeText(share.url);toast.success("Link copiado");}catch{toast.error("Copie o link no campo abaixo.");}}}><Copy /> Copiar link</Button>
          <Input readOnly value={share.url} aria-label="Link do convite" onFocus={ev=>ev.target.select()} />
          <Button variant="ghost" className="w-full" onClick={()=>setShare(null)}>Fechar</Button>
        </Card>}
        {invites.filter(i=>!i.used_at).map(i=><Card key={i.id} className="space-y-2">
          <p className="font-semibold">{i.name}</p><p className="text-sm text-muted-foreground">{i.contact} · {new Date(i.expires_at).getTime()<=Date.now()?"expirado":t("team.waiting")}</p>
          <Button variant="soft" className="w-full" disabled={busy} onClick={()=>void resend(i)}>{t("team.resend")}</Button>
        </Card>)}
        {loading ? null : helpers.length === 0 && invites.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Ainda não tem ajudantes.</p>
        ) : (
          helpers.map((h) => (
            <Card key={h.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{h.name || h.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.email} · {h.user_id ? t("team.joined") : "à espera que crie conta"}
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
