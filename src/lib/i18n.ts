// Screen language. Portuguese is complete; Kimbundu, Kikongo and Cokwe are a first draft covering
// the main words, and anything without a translation falls back to Portuguese.
import { useSyncExternalStore } from "react";

export type Lang = "pt" | "kmb" | "kg" | "cjk";

export const LANGUAGES: { code: Lang; name: string; html: string }[] = [
  { code: "pt", name: "Português", html: "pt-AO" },
  { code: "kmb", name: "Kimbundu", html: "kmb" },
  { code: "kg", name: "Kikongo", html: "kg" },
  { code: "cjk", name: "Cokwe", html: "cjk" },
];

const pt = {
  "nav.home": "Início",
  "nav.products": "Produtos",
  "nav.sell": "Vender",
  "nav.debts": "Dívidas",
  "nav.more": "Mais",
  "greet.morning": "Bom dia",
  "greet.afternoon": "Boa tarde",
  "greet.evening": "Boa noite",
  "home.todaySales": "Vendas de hoje",
  "home.receivedToday": "Recebido hoje",
  "home.profitToday": "Lucro hoje",
  "home.lastSales": "Últimas vendas",
  "action.newSale": "Nova venda",
  "action.receive": "Receber",
  "action.save": "Guardar",
  "page.customers": "Clientes",
  "page.reports": "Relatórios",
  "page.settings": "Definições",
  "auth.signUp": "Criar conta",
  "auth.signIn": "Entrar",
  "lang.title": "Língua",
  "lang.hint": "As palavras principais mudam; o resto fica em português até ser revisto.",
} as const;

export type MessageKey = keyof typeof pt;

// First draft, not yet reviewed by a native speaker. Leave a key out rather than guess.
const drafts: Record<Exclude<Lang, "pt">, Partial<Record<MessageKey, string>>> = {
  kmb: {
    "nav.home": "Inzo",
    "nav.products": "Ima",
    "nav.sell": "Kusumbisa",
    "greet.morning": "Uazekele kiambote",
    "greet.afternoon": "Kiambote",
    "greet.evening": "Kiambote",
    "action.newSale": "Kusumbisa",
  },
  kg: {
    "nav.home": "Nzo",
    "nav.products": "Bima",
    "nav.sell": "Kuteka",
    "nav.debts": "Mfuka",
    "greet.morning": "Mbote",
    "greet.afternoon": "Mbote",
    "greet.evening": "Mbote",
    "action.newSale": "Kuteka",
    "auth.signIn": "Kota",
  },
  cjk: {
    "nav.home": "Zuwo",
    "nav.products": "Yuma",
    "nav.sell": "Kulandesa",
    "greet.morning": "Moyo",
    "greet.afternoon": "Moyo",
    "greet.evening": "Moyo",
    "action.newSale": "Kulandesa",
  },
};

export function translate(lang: Lang, key: MessageKey): string {
  return (lang === "pt" ? undefined : drafts[lang][key]) ?? pt[key];
}

/** Share of the Portuguese words a language already has, for an honest "draft" label. */
export function coverage(lang: Lang): number {
  if (lang === "pt") return 1;
  return Object.keys(drafts[lang]).length / Object.keys(pt).length;
}

const STORAGE_KEY = "kitanda:lang";
const isLang = (v: unknown): v is Lang => LANGUAGES.some((l) => l.code === v);

let current: Lang = "pt";
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) current = saved;
  } catch {
    // storage blocked: stay in Portuguese
  }
  applyHtmlLang();
}

function applyHtmlLang() {
  const html = LANGUAGES.find((l) => l.code === current)?.html ?? "pt-AO";
  document.documentElement.lang = html;
}

export function setLang(lang: Lang) {
  current = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // keeps working for this visit
  }
  applyHtmlLang();
  listeners.forEach((l) => l());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!loaded) {
        load();
        cb();
      }
      return () => listeners.delete(cb);
    },
    () => current,
    () => "pt",
  );
}

export function useT() {
  const lang = useLang();
  return (key: MessageKey) => translate(lang, key);
}
