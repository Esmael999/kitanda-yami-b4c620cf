import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Eyebrow, Field } from "@/components/app/ui";
import { Logo } from "@/components/app/shell";
import { authMessage, signIn, signInWithGoogle, signUp, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { LanguagePicker } from "@/components/app/language-picker";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Kitanda" },
      {
        name: "description",
        content: "Crie a sua conta e comece a registar vendas, stock e dívidas no telemóvel.",
      },
      { property: "og:title", content: "Entrar — Kitanda" },
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
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (auth.status === "signed_in") return <Navigate to="/" replace />;

  const switchMode = (next: "in" | "up") => {
    setMode(next);
    setError(null);
    setSent(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (mode === "up" && password.length < 6) {
      setError("A palavra-passe tem de ter pelo menos 6 letras.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error: err } = await signUp({ email, password, fullName, businessName });
        if (err) throw err;
        // Email confirmation switched on: no session yet, the merchant must click the link.
        if (!data.session) {
          setSent(true);
          return;
        }
      } else {
        const { error: err } = await signIn(email, password);
        if (err) throw err;
      }
      await navigate({ to: "/" });
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
    <div className="flex min-h-dvh flex-col justify-center gap-5 px-5 pt-safe pb-8">
      <div className="flex justify-center">
        <Logo className="text-2xl" />
      </div>

      <div>
        <Eyebrow className="text-primary">O caderno de vendas do seu telemóvel</Eyebrow>
        <h1 className="mt-1 text-3xl leading-tight font-extrabold">
          {mode === "up" ? "Comece a registar as suas vendas" : "Bem-vinda de volta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "up"
            ? "A sua conta cria logo a sua própria loja. Pode mudar o nome depois."
            : "Entre para ver as vendas, o stock e quem lhe deve."}
        </p>
      </div>

      {sent ? (
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
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
            {(["up", "in"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  "cursor-pointer rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  mode === m ? "bg-surface text-foreground shadow-card" : "text-muted-foreground",
                )}
              >
                {m === "up" ? t("auth.signUp") : t("auth.signIn")}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && (
              <div className="grid gap-3">
                <Field label="O seu nome" htmlFor="a-name">
                  <Input
                    id="a-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Celma Eduardo"
                    autoComplete="name"
                    className="h-12 rounded-xl text-base"
                  />
                </Field>
                <Field label="Nome do negócio" htmlFor="a-business" hint="Pode deixar vazio e mudar depois.">
                  <Input
                    id="a-business"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Cantina da Celma"
                    autoComplete="organization"
                    className="h-12 rounded-xl text-base"
                  />
                </Field>
              </div>
            )}

            <Field label="Email" htmlFor="a-email">
              <Input
                id="a-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                autoComplete="email"
                className="h-12 rounded-xl text-base"
              />
            </Field>

            <Field
              label="Palavra-passe"
              htmlFor="a-password"
              {...(mode === "up" ? { hint: "Pelo menos 6 letras, e não muito simples." } : {})}
            >
              <Input
                id="a-password"
                type="password"
                required
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
              {mode === "up" ? "Criar a minha conta" : "Entrar"}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="soft" size="xl" className="w-full" onClick={withGoogle} disabled={busy}>
            <GoogleMark /> Continuar com Google
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "up"
              ? "Ao criar conta fica com uma loja só sua, que só você vê."
              : "Esqueceu-se da palavra-passe? Peça ajuda a quem lhe deu a app."}
          </p>
        </>
      )}

      <LanguagePicker className="pt-2" />
    </div>
  );
}
