// Kinds of small business in Angola the app supports, and what each structure allows.
import type { Permission } from "./cloud-map";

export type BusinessType = "zunga" | "bancada" | "cantina" | "miniloja" | "deposito" | "comida";

export type BusinessInfo = {
  key: BusinessType;
  name: string;
  examples: string;
  /** Whether this kind of business usually has helpers at the counter. */
  team: boolean;
};

export const BUSINESS_TYPES: BusinessInfo[] = [
  { key: "zunga", name: "Zunga / venda ambulante", examples: "Venda na rua, porta a porta ou itinerante", team: false },
  { key: "bancada", name: "Bancada na praça", examples: "Peixe, hortaliça, roupa no mercado", team: false },
  { key: "cantina", name: "Cantina / mercearia", examples: "Alimentos, bebidas, higiene e bens essenciais", team: true },
  { key: "miniloja", name: "Mini-loja", examples: "Roupa, cosméticos, telemóveis, peças", team: true },
  { key: "deposito", name: "Depósito de bebidas", examples: "Grades de gasosa, cerveja, água", team: true },
  { key: "comida", name: "Roulotte / venda de comida", examples: "Refeições, sandes, sumos", team: true },
];

/** All six categories supported by the current database. */
export const PICKER_TYPES = BUSINESS_TYPES;

export const DEFAULT_BUSINESS: BusinessType = "cantina";

export function businessInfo(type: string | null | undefined): BusinessInfo {
  return BUSINESS_TYPES.find((b) => b.key === type) ?? { key: DEFAULT_BUSINESS, name: "Cantina / mini-loja", examples: "Mercearia, roupa, cosméticos", team: true };
}

/** Teams are optional for every merchant, regardless of the legacy category. */
export function teamAllowed(_type: string | null | undefined): boolean {
  return true;
}

export function initialBusinessName(fullName: string): string {
  const name = fullName.trim();
  return name ? `Loja de ${name}` : "A minha loja";
}

/** What a new helper may do by default: sell, never see profits or manage stock. */
export function defaultHelperPermissions(type: string | null | undefined): Partial<Record<Permission, boolean>> {
  const base = { vender: true, fiado: false, receber: true, produtos: false, relatorios: false };
  // In a drinks depot the helpers do the loading, so they also record stock arriving.
  if (businessInfo(type).key === "deposito") return { ...base, produtos: true };
  return base;
}

/** Presets only grant existing server-enforced capabilities; owners can customise them. */
export const HELPER_PRESETS: { name: string; description: string; permissions: Record<Permission, boolean> }[] = [
  { name: "Vendedor", description: "Regista vendas e recebe pagamentos.", permissions: { vender: true, fiado: false, receber: true, produtos: false, relatorios: false } },
  { name: "Responsável de stock", description: "Gere produtos e stock, sem aceder aos relatórios.", permissions: { vender: false, fiado: false, receber: false, produtos: true, relatorios: false } },
  { name: "Gerente", description: "Gere vendas, kilapé, stock e relatórios; não administra a equipa.", permissions: { vender: true, fiado: true, receber: true, produtos: true, relatorios: true } },
];
