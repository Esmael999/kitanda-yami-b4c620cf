// Screen language. Portuguese is the fallback; national language dictionaries are partial.
// Sources and review requirements: docs/localizacao.md.
import { useSyncExternalStore } from "react";

export type Lang = "pt" | "kmb" | "kg" | "cjk" | "umb" | "kj" | "nyk" | "lue";

export const LANGUAGES: { code: Lang; name: string; html: string }[] = [
  { code: "pt", name: "Português", html: "pt-AO" },
  { code: "kmb", name: "Kimbundu", html: "kmb" },
  { code: "kg", name: "Kikongo", html: "kg" },
  { code: "cjk", name: "Cokwe", html: "cjk" },
  { code: "umb", name: "Umbundu", html: "umb" },
  { code: "kj", name: "Oshikwanyama", html: "kj" },
  { code: "nyk", name: "Olunyaneka", html: "nyk" },
  { code: "lue", name: "Luvale", html: "lue" },
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
  "account.title": "Conta e sessão",
  "account.owner": "Proprietário",
  "account.employee": "Ajudante",
  "account.signOut": "Terminar sessão",
  "account.confirmTitle": "Terminar sessão neste telemóvel?",
  "account.confirmHint": "Para voltar a aceder ao negócio, terá de entrar novamente. A sua conta não será apagada.",
  "account.pendingHint": "Há alterações por enviar. Ficam neste telemóvel; volte a entrar nesta conta com internet para as sincronizar.",
  "account.stay": "Continuar na conta",
  "account.leaving": "A terminar sessão…",
  "account.error": "Não foi possível terminar a sessão. Tente novamente.",
  "lang.title": "Língua",
  "lang.hint": "As palavras principais mudam; o resto fica em português até ser revisto.",
  "report.today": "Hoje",
  "report.week": "7 dias",
  "report.month": "30 dias",
  "report.custom": "Escolher",
  "report.from": "De",
  "report.to": "Até",
  "report.sold": "Vendido",
  "report.profit": "Lucro",
  "report.received": "Recebido",
  "report.daily": "Vendas por dia",
  "report.best": "Mais vendidos",
  "report.empty": "Sem vendas neste período.",
  "report.filters": "Filtros",
  "report.customer": "Cliente",
  "report.allCustomers": "Todos os clientes",
  "report.product": "Produto",
  "report.allProducts": "Todos os produtos",
  "report.status": "Estado da venda",
  "report.all": "Todas",
  "report.paid": "Pagas no acto",
  "report.credit": "Kilapé",
  "report.clear": "Limpar filtros",
  "report.bars": "Barras",
  "report.line": "Linha",
  "report.pie": "Circular",
  "report.denied": "Não tem permissão para consultar relatórios.",
  "report.sales": "Vendas",
  "report.filterHint": "Os totais incluem as vendas completas que correspondem ao filtro; não incluem pagamentos posteriores de dívidas.",
  "report.rangeHint": "O gráfico diário mostra os últimos 366 dias do período; os totais abrangem todo o intervalo.",
  "settings.appearance": "Aparência",
  "settings.theme": "Tema",
  "settings.dark": "Escuro",
  "settings.light": "Claro",
  "settings.businessName": "Nome do negócio",
  "settings.ownerName": "O seu nome",
  "settings.greetingHint": "Aparece na saudação do início.",
  "settings.saved": "Definições guardadas",
  "settings.backup": "Cópia de segurança",
  "settings.exported": "Cópia de segurança descarregada",
  "settings.restoreConfirm": "Substituir os dados deste telemóvel pela cópia?",
  "settings.restored": "Dados restaurados",
  "settings.invalidBackup": "Este ficheiro não é uma cópia da Kitanda.",
  "settings.eraseConfirm": "Apagar TODOS os dados deste telemóvel? Não dá para desfazer.",
  "settings.erased": "Todos os dados foram apagados",
  "settings.backupHint": "Além do que fica na sua conta, guarde uma cópia neste telemóvel de vez em quando, para não perder nada se trocar de telemóvel.",
} as const;

export type MessageKey = keyof typeof pt;

// First draft, not yet reviewed by a native speaker. Leave a key out rather than guess.
const drafts: Record<Exclude<Lang, "pt">, Partial<Record<MessageKey, string>>> = {
  kmb: {
    "nav.home": "Inzo",
    "nav.products": "Ima",
    "nav.sell": "Kusumbisa",
    "nav.debts": "Makongo",
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
    "nav.sell": "Kulandjisa",
    "greet.morning": "Moyo",
    "greet.afternoon": "Moyo",
    "greet.evening": "Moyo",
    "action.newSale": "Kulandjisa",
    "auth.signIn": "Kundjia",
  },
  umb: {
    "greet.morning": "Kalunga",
    "greet.afternoon": "Kalunga",
    "greet.evening": "Kalunga",
    "nav.sell": "Okulandisa",
    "action.receive": "Okutambula",
    "auth.signIn": "Okuiñila",
    "report.today": "Etali",
  },
  kj: {
    "greet.morning": "Wa lele po?",
    "greet.afternoon": "Wa uhala po?",
    "greet.evening": "Wa tokelwa po?",
    "nav.sell": "Landifa",
  },
  nyk: {
    "greet.morning": "Okamene",
    "greet.afternoon": "Okunyanga",
    "greet.evening": "Okuluvelela",
  },
  lue: {
    "greet.morning": "Chimene mwane",
    "greet.afternoon": "Musana mwane",
    "greet.evening": "Chingoloshi mwane",
    "report.today": "Lelo",
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
