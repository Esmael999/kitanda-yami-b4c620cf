// One account for the whole app: the Supabase session, read through useSyncExternalStore.
import { useSyncExternalStore } from "react";
import { isAuthRetryableFetchError, type Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { initialBusinessName } from "@/lib/business";
import { angolanPhone } from "./phone";

export type AuthState = {
  status: "checking" | "signed_out" | "signed_in";
  userId: string | null;
  email: string;
};

const CHECKING: AuthState = { status: "checking", userId: null, email: "" };

let state: AuthState = CHECKING;
let watching = false;
const listeners = new Set<() => void>();

type RememberedUser = { id: string; email: string };
const LAST_USER = "kitanda:last-user";

function readRemembered(): RememberedUser | null {
  try {
    const raw = window.localStorage.getItem(LAST_USER);
    const user = raw ? (JSON.parse(raw) as Partial<RememberedUser>) : null;
    return user?.id ? { id: user.id, email: user.email ?? "" } : null;
  } catch {
    return null;
  }
}

function remember(user: RememberedUser | null) {
  try {
    if (user) window.localStorage.setItem(LAST_USER, JSON.stringify(user));
    else window.localStorage.removeItem(LAST_USER);
  } catch {
    // Private mode: the app still works, it just cannot open offline after a restart.
  }
}

/**
 * Decide who is signed in. Without internet an expired session cannot be refreshed, so the
 * backend reports "no session"; the merchant must still reach their offline copy, so the last
 * person who signed in on this phone stays in until the backend can be asked again.
 */
export function resolveAuth(
  session: Pick<Session, "user"> | null,
  offline: { unreachable: boolean; remembered: RememberedUser | null },
): AuthState {
  const user = session?.user;
  if (user) return { status: "signed_in", userId: user.id, email: user.email ?? "" };
  if (offline.unreachable && offline.remembered) {
    return { status: "signed_in", userId: offline.remembered.id, email: offline.remembered.email };
  }
  return { status: "signed_out", userId: null, email: "" };
}

function apply(session: Session | null, unreachable = false) {
  if (session?.user) remember({ id: session.user.id, email: session.user.email ?? "" });
  state = resolveAuth(session, { unreachable, remembered: readRemembered() });
  listeners.forEach((l) => l());
}

// Started by the first component that reads the session. Never on the server: there is no
// browser session to watch, and every request would share one module-level state.
function watch() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  supabase.auth.onAuthStateChange((event, session) => {
    // The first answer comes from getSession below, which also says whether the internet failed.
    if (event === "INITIAL_SESSION") return;
    if (event === "SIGNED_OUT") remember(null);
    apply(session);
  });
  // Offline, the backend may take up to half a minute to give up on refreshing an old session.
  // Don't keep the merchant on the logo meanwhile: open with the last account on this phone.
  const openWithRemembered = () => {
    if (state.status === "checking" && readRemembered()) apply(null, true);
  };
  if (!navigator.onLine) openWithRemembered();
  else setTimeout(openWithRemembered, 4000);
  void supabase.auth.getSession().then(({ data, error }) => {
    const unreachable = !navigator.onLine || isAuthRetryableFetchError(error);
    // A real answer (a session, or the backend saying there is none) always wins.
    if (data.session || !unreachable) apply(data.session);
    else if (state.status === "checking") apply(null, true);
  });
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      watch();
      return () => listeners.delete(cb);
    },
    () => state,
    () => CHECKING,
  );
}

/** True on the pages a signed-out visitor is allowed to see. */
export const isAuthPage = (pathname: string) => pathname === "/entrar";

export function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
}

export function signInPhone(phone: string, password: string) {
  const normalized = angolanPhone(phone);
  if (!normalized) throw new Error("Introduza um número angolano válido.");
  return supabase.auth.signInWithPassword({ phone: normalized, password });
}

export function signUpPhone(input: { phone: string; password: string; fullName: string; invitation?: string }) {
  const phone = angolanPhone(input.phone);
  if (!phone) throw new Error("Introduza um número angolano válido.");
  return supabase.auth.signUp({ phone, password: input.password, options: { data: { full_name: input.fullName.trim(), business_name: initialBusinessName(input.fullName), ...(input.invitation ? { team_invitation: input.invitation } : {}) } } });
}

export function verifyPhone(phone: string, token: string) {
  const normalized = angolanPhone(phone);
  if (!normalized) throw new Error("Introduza um número angolano válido.");
  return supabase.auth.verifyOtp({ phone: normalized, token: token.trim(), type: "sms" });
}

export function signUp(input: { email: string; password: string; fullName: string; invitation?: string }) {
  return supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      // handle_new_user() reads these to name the person and their new store.
      data: { full_name: input.fullName.trim(), business_name: initialBusinessName(input.fullName), ...(input.invitation ? { team_invitation: input.invitation } : {}) },
      ...(typeof window !== "undefined" ? { emailRedirectTo: input.invitation ? `${window.location.origin}/entrar?convite=${encodeURIComponent(input.invitation)}` : window.location.origin } : {}),
    },
  });
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    // Land on the app itself; the client picks the session up from the URL.
    options: { redirectTo: window.location.origin },
  });
}

export const signOut = () => {
  remember(null);
  return supabase.auth.signOut();
};

/** The backend answers in English; merchants read Portuguese. */
const MESSAGES: [string, string][] = [
  ["Invalid login credentials", "Email ou palavra-passe errados."],
  ["Phone not confirmed", "Confirme o número de telefone com o código recebido por SMS."],
  ["Phone signups are disabled", "A criação de contas por telefone ainda não está disponível. Utilize o email."],
  ["Unsupported phone provider", "A confirmação por SMS ainda não está disponível. Utilize o email."],
  ["Email not confirmed", "Confirme o email que lhe enviámos antes de entrar."],
  ["User already registered", "Esta conta já existe. Entre com a sua palavra-passe."],
  ["already registered", "Esta conta já existe. Entre com a sua palavra-passe."],
  ["Password should be at least", "A palavra-passe tem de ter pelo menos 6 letras."],
  [
    "known to be weak",
    "Essa palavra-passe é muito fácil de adivinhar. Junte letras e números, por exemplo “cantina2026”.",
  ],
  ["Unable to validate email", "Este email não parece válido."],
  ["For security purposes", "Entre novamente para confirmar o seu email."],
  ["Sign-ups are not allowed", "A criação de contas está fechada por agora."],
];

export function authMessage(error: { message?: string } | null | undefined): string {
  const raw = error?.message ?? "";
  const hit = MESSAGES.find(([from]) => raw.toLowerCase().includes(from.toLowerCase()));
  return hit ? hit[1] : raw || "Algo correu mal. Tente novamente.";
}
