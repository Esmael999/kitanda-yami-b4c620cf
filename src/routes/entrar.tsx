import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Field } from "@/components/app/ui";
import { Logo } from "@/components/app/shell";
import { authMessage, signIn, signInPhone, signInWithGoogle, signUp, signUpPhone, useAuth, verifyPhone } from "@/lib/auth";
import { inspectInvite, redeemInvite, type InviteDetails } from "@/lib/team-invite";
import { signOut } from "@/lib/auth";
import { angolanPhone, MIN_PASSWORD_LENGTH } from "@/lib/phone";
import { useT } from "@/lib/i18n";
import { LanguagePicker } from "@/components/app/language-picker";

export const Route = createFileRoute("/entrar")({
  validateSearch: (s: Record<string, unknown>): { convite?: string } => ({ convite: typeof s.convite === "string" && /^[a-f0-9]{64}$/.test(s.convite) ? s.convite : undefined }),
  head: () => ({
    meta: [
      { title: "Entrar — Kitanda Yami" },
      { name: "referrer", content: "no-referrer" },
      {
        name: "description",
        content: "Crie a sua conta e comece a registar vendas, stock e dívidas no telemóvel.",
      },
      { property: "og:title", content: "Entrar — Kitanda Yami" },
      {
        property: "og:description",
        content: "Crie a sua conta e comece a registar vendas, stock e dívidas no telemóvel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" aria-hidden className="size-5">
    <path
      fill="#FFC107"
      d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 40.2 44 35 44 24c0-1.3-.1-2.7-.4-3.9z"
    />
  </svg>
);

function SignIn() {
  const auth = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { convite } = Route.useSearch();
  const [invitation, setInvitation] = useState<InviteDetails | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!convite);
  const [inviteError, setInviteError] = useState(false);
  useEffect(() => {
    if (!convite) { setInvitation(null); setInviteLoading(false); return; }
    let active = true;
    setInviteLoading(true); setInviteError(false); setInvitation(null);
    void inspectInvite(convite).then(inv => {
      if (!active) return;
      if (!inv) { setInviteError(true); return; }
      setInvitation(inv); setMethod(inv.kind); setMode("up"); setFullName(inv.name);
      if (inv.kind === "email") setEmail(inv.contact); else setPhone(inv.contact.replace(/^\+244/, ""));
    }).catch(() => { if (active) setInviteError(true); }).finally(() => { if (active) setInviteLoading(false); });
    return () => { active = false; };
  }, [convite]);

  const accept = async () => {
    if (!convite || busy) return;
    setBusy(true); setError(null);
    try { await redeemInvite(convite); window.location.replace("/"); }
    catch (err) { setError(authMessage(err as { message?: string })); setBusy(false); }
  };

  if (auth.status === "signed_in" && !convite) return <Navigate to="/vender" replace />;

  const switchMode = (next: "in" | "up") => {
    setMode(next);
    setError(null);
    setSent(false);
    setPassword("");
    setOtp("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (mode === "up" && password.length < MIN_PASSWORD_LENGTH) {
      setError("A palavra-passe tem de ter pelo menos 6 caracteres.");
      return;
    }

    if (method === "phone" && !angolanPhone(phone)) { setError("Introduza um número angolano válido (9 dígitos)."); return; }
    setBusy(true);
    try {
      if (sent && method === "phone") {
        const { error: err } = await verifyPhone(phone, otp);
        if (err) throw err;
      } else if (mode === "up") {
        const { data, error: err } = method === "phone" ? await signUpPhone({ phone, password, fullName, invitation: convite }) : await signUp({ email, password, fullName, invitation: convite });
        if (err) throw err;
        // Email confirmation switched on: no session yet, the merchant must click the link.
        if (!data.session) {
          setSent(true);
          return;
        }
      } else {
        const { error: err } = method === "phone" ? await signInPhone(phone, password) : await signIn(email, password);
        if (err) throw err;
      }
      if (!convite) await navigate({ to: "/vender" });
    } catch (err) {
      setError(authMessage(err as { message?: string }));
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) throw err;
    } catch (err) {
      setError(authMessage(err as { message?: string }));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 pt-safe pb-8">
      {mode === "up" && !sent && (
        <Button type="button" variant="ghost" size="icon" aria-label="Voltar a entrar" onClick={() => switchMode("in")} className="size-11 self-start">
          <ArrowLeft />
        </Button>
      )}
      <div className="flex justify-center">
        <Logo className="text-2xl" />
      </div>

      {convite && (inviteLoading || inviteError || !invitation) ? <Card className="space-y-3 text-center">
        <p className="font-semibold">{inviteLoading ? "A verificar convite…" : "Convite indisponível"}</p>
        {!inviteLoading && <><p className="text-sm text-muted-foreground">Este convite pode ter expirado, já ter sido utilizado ou não estar disponível. Peça um novo link à dona da loja.</p><Button variant="soft" className="w-full" onClick={() => window.location.assign("/entrar")}>Voltar a entrar</Button></>}
      </Card> : <>
      {invitation && <Card className="space-y-2"><p className="font-semibold">Convite para {invitation.shop}</p><p className="text-sm font-medium text-primary">Função: {invitation.job_title}</p><p className="text-sm text-muted-foreground">Crie a sua conta com o contacto indicado e uma palavra-passe só sua. Confirme o contacto e aceite o convite para entrar na loja com as permissões atribuídas.</p></Card>}
      {convite && auth.status === "signed_in" ? <Card className="space-y-3">
        <p className="font-semibold">Aceitar convite</p><p className="text-sm text-muted-foreground">Use a conta confirmada com o contacto indicado no convite. Os negócios existentes não são transferidos.</p>
        {error && <p role="alert" className="text-sm text-debt">{error}</p>}
        <Button variant="hero" size="xl" className="w-full" disabled={busy} onClick={() => void accept()}>Entrar na loja</Button>
        <Button variant="soft" className="w-full" disabled={busy} onClick={() => void signOut()}>Usar outra conta</Button>
      </Card> : <>
      <div>
        <h1 className="mt-1 text-3xl leading-tight font-extrabold">
          {mode === "up" ? t("auth.signUp") : t("auth.signIn")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "up" ? "Já tem uma conta? " : "Não tem uma conta? "}
          <Button type="button" variant="link" className="h-auto px-0 py-1 text-sm" onClick={() => switchMode(mode === "up" ? "in" : "up")}>
            {mode === "up" ? t("auth.signIn") : t("auth.signUp")}
          </Button>
        </p>
      </div>

      {sent && method === "phone" ? (
        <Card className="space-y-3">
          <p className="font-semibold">Confirme o seu telefone</p>
          <p className="text-sm text-muted-foreground">Introduza o código SMS enviado para {angolanPhone(phone)}.</p>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Código SMS" htmlFor="a-otp"><Input id="a-otp" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} className="h-12 rounded-xl text-center text-lg tracking-widest" /></Field>
            {error && <p role="alert" className="text-sm text-debt">{error}</p>}
            <Button variant="hero" size="xl" className="w-full" disabled={busy || otp.length !== 6}>Confirmar</Button>
            <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => switchMode("in")}>Voltar a entrar</Button>
          </form>
        </Card>
      ) : sent ? (
        <Card className="space-y-3 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-success-soft text-primary">
            <MailCheck className="size-6" />
          </span>
          <p className="font-semibold">Confirme o seu email</p>
          <p className="text-sm text-muted-foreground">
            Enviámos um link para <strong className="text-foreground">{email.trim().toLowerCase()}</strong>.
            Abra-o no telemóvel e volte aqui para entrar.
          </p>
          <Button variant="soft" className="w-full" onClick={() => switchMode("in")}>
            Já confirmei, entrar
          </Button>
        </Card>
      ) : (
        <>
          <form onSubmit={submit} className="space-y-4">
            {!invitation && <div role="group" aria-label="Forma de acesso" className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
              {(["email", "phone"] as const).map(m => <button key={m} type="button" disabled={busy} aria-pressed={method === m} onClick={() => { setMethod(m); setError(null); }} className={`rounded-xl py-3 text-sm font-semibold ${method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{m === "email" ? "Email" : "Telefone"}</button>)}
            </div>}
            {mode === "up" && (
              <div className="grid gap-3">
                <Field label={t("settings.ownerName")} htmlFor="a-name">
                  <Input
                    id="a-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Celma Eduardo"
                    autoComplete="name"
                    className="h-12 rounded-xl text-base"
                  />
                </Field>
              </div>
            )}

            {method === "phone" ? <Field label={t("common.phone")} htmlFor="a-phone">
              <div className="flex items-center gap-2"><span className="grid h-12 shrink-0 place-items-center rounded-xl border bg-secondary px-3 text-sm font-semibold">+244</span><Input id="a-phone" readOnly={!!invitation} type="tel" inputMode="tel" autoComplete="tel-national" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="923 456 789" className="h-12 min-w-0 rounded-xl text-base" /></div>
            </Field> : <Field label={t("common.email")} htmlFor="a-email">
              <Input
                id="a-email"
                readOnly={!!invitation}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                autoComplete="email"
                className="h-12 rounded-xl text-base"
              />
            </Field>}

            <Field
              label={t("common.password")}
              htmlFor="a-password"
              hint={mode === "up" ? "Pelo menos 6 caracteres. Evite palavras-passe fáceis de adivinhar." : undefined}
              
            >
              <Input
                id="a-password"
                type="password"
                required
                minLength={mode === "up" ? MIN_PASSWORD_LENGTH : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                className="h-12 rounded-xl text-base"
              />
            </Field>

            {error && (
              <p role="alert" className="rounded-xl bg-debt-soft px-3 py-2 text-sm font-medium text-debt">
                {error}
              </p>
            )}

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ArrowRight />
              )}
              {mode === "up" ? t("auth.signUp") : t("auth.signIn")}
            </Button>
          </form>

          {!invitation && <><div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="soft" size="xl" className="w-full" onClick={withGoogle} disabled={busy}>
            <GoogleMark /> Continuar com Google
          </Button></>}

        </>
      )}

      </>}
      </>}
      <LanguagePicker className="pt-2" />
    </div>
  );
}
