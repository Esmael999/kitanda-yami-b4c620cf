// One account for the whole app: the Supabase session, read through useSyncExternalStore.
import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  status: "checking" | "signed_out" | "signed_in";
  userId: string | null;
  email: string;
};

const CHECKING: AuthState = { status: "checking", userId: null, email: "" };

let state: AuthState = CHECKING;
let watching = false;
const listeners = new Set<() => void>();

function apply(session: Session | null) {
  const user = session?.user;
  state = user
    ? { status: "signed_in", userId: user.id, email: user.email ?? "" }
    : { status: "signed_out", userId: null, email: "" };
  listeners.forEach((l) => l());
}

// Started by the first component that reads the session. Never on the server: there is no
// browser session to watch, and every request would share one module-level state.
function watch() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  supabase.auth.onAuthStateChange((_event, session) => apply(session));
  void supabase.auth.getSession().then(({ data }) => {
    if (state.status === "checking") apply(data.session);
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

export function signUp(input: { email: string; password: string; fullName: string; businessName: string }) {
  return supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      // handle_new_user() reads these to name the person and their new store.
      data: { full_name: input.fullName.trim(), business_name: input.businessName.trim() },
      ...(typeof window !== "undefined" ? { emailRedirectTo: window.location.origin } : {}),
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

export const signOut = () => supabase.auth.signOut();

/** The backend answers in English; merchants read Portuguese. */
const MESSAGES: [string, string][] = [
  ["Invalid login credentials", "Email ou palavra-passe errados."],
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
