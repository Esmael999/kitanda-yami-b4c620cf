import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Check, Copy, Loader2, Mail, MessageCircle, Phone, RefreshCw, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TeamActivity } from '@/components/app/team-activity';
import { Card, Field, PageHeader } from "@/components/app/ui";
import { supabase } from "@/integrations/supabase/client";
import { useCloud } from "@/lib/store";
import { PERMISSIONS, type Permission } from "@/lib/cloud-map";
import { useT } from "@/lib/i18n";
import { angolanPhone } from "@/lib/phone";
import { createInvite, listInvites, inviteUrl, whatsappInvite, InviteServiceUnavailable, type TeamInvite, type InviteContact } from "@/lib/team-invite";
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
type Helper = { id: string; name: string; email: string; job_title?: string; active: boolean; user_id: string | null; permissions: Perms };

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
  const { member, visitor } = useCloud();
  const type = member?.businessType;
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteReady,setInviteReady]=useState<"ready"|"legacy"|"error"|"loading">("loading");
  const [name, setName] = useState("");
  const [jobTitle,setJobTitle] = useState("Vendedor");
  const [activityHelper,setActivityHelper] = useState<Helper|null>(null);
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<InviteContact>("email");
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [share, setShare] = useState<{ url: string; contact: string; kind: InviteContact; legacy?:boolean } | null>(null);
  const [perms, setPerms] = useState<Perms>(() => defaultHelperPermissions(type));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (visitor || member?.role !== "owner" || !member.active) return;
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("role", "employee")
      .order("created_at");
    if (error) toast.error("Sem internet: não foi possível ver a equipa.");
    else setHelpers((data ?? []) as Helper[]);
    setLoading(false);
    try { setInvites(await listInvites()); setInviteReady("ready"); } catch(err) { setInviteReady(err instanceof InviteServiceUnavailable?"legacy":"error"); }
  }, [member?.role, member?.active, visitor]);

  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);

  if (visitor || member?.role !== "owner" || !member.active) {
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
    if (!jobTitle.trim()) { toast.error("Indique a função do ajudante."); return; }
    setBusy(true);
    try {
      if(inviteReady==="legacy" && kind==="email") {
        // Use the original, server-backed email association; it is not a token invitation.
        if(helpers.some(h=>h.email.toLowerCase()===contact)) throw new Error("Este ajudante já está na lista. Pode reenviar o acesso no seu cartão.");
        const {error}=await supabase.rpc("invite_employee",{_email:contact,_name:name.trim(),_permissions:perms});
        if(error)throw new Error(error.message);
        setShare({url:new URL("/entrar",window.location.origin).href,contact,kind,legacy:true});
      } else {
        const result = await createInvite({ contact, kind, name, jobTitle:jobTitle.trim(), permissions: perms });
        setShare({url:inviteUrl(result.token), contact, kind});
      }
      toast.success("Convite criado");
      setName(""); setEmail(""); setJobTitle("Vendedor"); setPerms(defaultHelperPermissions(type));
      await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível criar o convite."); }
    finally { setBusy(false); }
  };

  const resend = async (i: TeamInvite) => {
    if (busy || i.used_at) return;
    setBusy(true);
    try {
      const result = await createInvite({ contact:i.contact, kind:i.kind, name:i.name, jobTitle:i.job_title, permissions:i.permissions });
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
      <PageHeader title={t("team.title")} back="/mais" action={<Button variant="soft" size="icon-lg" aria-label="Actualizar equipa" onClick={()=>void load()}><RefreshCw/></Button>} />
      <div className="space-y-4 px-5">
        <Card className="space-y-3">
          <div>
            <p className="font-semibold">Convidar ajudante</p>
            <p className="text-sm text-muted-foreground">
              Envie um convite ao ajudante. {inviteReady==="ready"?"O link é válido por 7 dias e só pode ser utilizado uma vez.":"Escolha o contacto e as permissões."}
            </p>
          </div>
          {inviteReady==="legacy"&&<p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">{kind==="email"?"Convite por email: a pessoa cria a conta com o mesmo endereço. A função personalizada e o link de uso único ainda não estão disponíveis.":"Seleccione Email para convidar. A associação por telefone ainda não está disponível."} <button type="button" className="font-semibold text-primary" onClick={()=>void load()}>Actualizar</button></p>}
          {inviteReady==="error"&&<p className="text-sm text-muted-foreground">Não foi possível consultar os convites. <button type="button" className="font-semibold text-primary" onClick={()=>void load()}>Tentar novamente</button></p>}
          <form onSubmit={invite} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4">
            <Field label={t("common.name")} htmlFor="h-name">
              <Input id="h-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="João" className="h-12 rounded-xl text-base" />
            </Field>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1" role="group" aria-label="Contacto do ajudante">
              {(["email","phone"] as const).map(k => <Button key={k} type="button" variant={kind===k?"hero":"ghost"} className="min-h-11" aria-pressed={kind===k} onClick={() => {setKind(k);setEmail("");}}> {k==="email"?<Mail/>:<Phone/>}{k==="email"?"Email":"Telefone"}</Button>)}
            </div>
            <Field label={kind==="email"?t("team.contactEmail"):t("team.contactPhone")} htmlFor="h-email">
              <div className="flex items-center gap-2">{kind==="phone"&&<span className="grid h-12 shrink-0 place-items-center rounded-xl border bg-secondary px-3 font-semibold">+244</span>}<Input id="h-email" type={kind==="email"?"email":"tel"} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={kind==="email"?"joao@exemplo.com":"923 456 789"} className="h-12 min-w-0 rounded-xl text-base" /></div>
            </Field>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Função do ajudante</p>
              <div role="group" aria-label="Funções sugeridas" className="overflow-hidden rounded-2xl border bg-surface">
                {HELPER_PRESETS.map(p=><button key={p.name} type="button" aria-pressed={jobTitle===p.name} onClick={()=>{setJobTitle(p.name);setPerms({...p.permissions});}} className={`flex min-h-14 w-full items-center gap-3 border-b px-3 py-3 text-left last:border-b-0 ${jobTitle===p.name?"bg-accent":"hover:bg-secondary"}`}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Users className="size-5"/></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{p.name}</span><span className="block text-xs text-muted-foreground">{p.description}</span></span>
                  {jobTitle===p.name&&<Check className="size-5 shrink-0 text-primary"/>}
                </button>)}
              </div>
              <Field label="Escreva a função" htmlFor="h-job" hint="Pode criar uma função própria. Escolha as permissões abaixo.">
                <Input id="h-job" required maxLength={80} value={jobTitle} onChange={ev=>setJobTitle(ev.target.value)} placeholder="Ex.: Caixa, entregador ou assistente" className="h-12 rounded-xl text-base"/>
              </Field>
            </div>
            <p className="text-sm font-semibold">O que pode fazer</p>
            <div className="rounded-2xl border bg-secondary/30 p-3"><PermList value={perms} onChange={setPerms} /></div>
            </fieldset>
            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy || (inviteReady!=="ready" && !(inviteReady==="legacy"&&kind==="email"))}>
              {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Criar convite
            </Button>
          </form>
        </Card>

        {share && <Card className="space-y-3">
          <p className="font-semibold">{t("team.sendInvite")}</p>
          <p className="text-sm text-muted-foreground">{share.legacy?"O ajudante deve criar a conta com o email "+share.contact+".":"Partilhe o link apenas com o ajudante. Pode ser usado uma vez e expira em 7 dias."}</p>
          <Button variant="hero" className="w-full" asChild><a href={whatsappInvite(share.url,share.kind==="phone"?share.contact:undefined,share.legacy?share.contact:undefined)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Enviar pelo WhatsApp</a></Button>
          <Button variant="soft" className="w-full" asChild><a href={`sms:${share.kind==="phone"?share.contact:""}?body=${encodeURIComponent(share.legacy?"Crie a conta com "+share.contact+" em "+share.url:"Convite para a equipa Kitanda Yami: "+share.url)}`}>Enviar por SMS</a></Button>
          <Button variant="soft" className="w-full" onClick={async()=>{try{await navigator.clipboard.writeText(share.url);toast.success("Link copiado");}catch{toast.error("Copie o link no campo abaixo.");}}}><Copy /> Copiar link</Button>
          <Input readOnly value={share.url} aria-label="Link do convite" onFocus={ev=>ev.target.select()} />
          <Button variant="ghost" className="w-full" onClick={()=>setShare(null)}>Fechar</Button>
        </Card>}
        {invites.filter(i=>!i.used_at).map(i=><Card key={i.id} className="space-y-2">
          <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{i.name}</p><p className="text-sm text-muted-foreground">{i.job_title} · {i.contact}</p></div><span className="shrink-0 rounded-full bg-debt-soft px-3 py-1 text-xs font-semibold text-debt">{new Date(i.expires_at).getTime()<=Date.now()?"Expirado":"À espera"}</span></div>
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
                    {h.job_title || "Ajudante"} · {h.email}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  {h.active ? "Ativo" : "Bloqueado"}
                  <Switch checked={h.active} onCheckedChange={(on) => void update(h, { active: on })} />
                </label>
              </div>
              <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${h.user_id?"bg-success-soft text-primary":"bg-debt-soft text-debt"}`}>{h.user_id?"Já entrou":"À espera"}</span>
              <div className="rounded-2xl border bg-secondary/30 p-3"><PermList value={h.permissions} onChange={(p) => void update(h, { permissions: p })} /></div>
              {!h.user_id && h.active && h.email.includes("@") && <Button variant="soft" className="w-full" onClick={()=>setShare({url:new URL("/entrar",window.location.origin).href,contact:h.email,kind:"email",legacy:true})}>Reenviar acesso</Button>}
              {h.user_id&&<Button variant="soft" className="w-full" onClick={()=>setActivityHelper(h)}><Activity/>Ver actividades</Button>}
            </Card>
          ))
        )}
      </div>
      {activityHelper&&<TeamActivity key={activityHelper.id} helper={activityHelper} onClose={()=>setActivityHelper(null)}/>}
    </div>
  );
}
