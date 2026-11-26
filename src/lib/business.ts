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
  { key: "zunga", name: "Zunga / bancada", examples: "Sozinha na rua ou na praça", team: false },
  { key: "bancada", name: "Bancada na praça", examples: "Peixe, hortaliça, roupa no mercado", team: false },
  { key: "cantina", name: "Cantina / mini-loja", examples: "Mercearia, roupa, cosméticos", team: true },
  { key: "miniloja", name: "Mini-loja", examples: "Roupa, cosméticos, telemóveis, peças", team: true },
  { key: "deposito", name: "Depósito de bebidas", examples: "Grades de gasosa, cerveja, água", team: true },
  { key: "comida", name: "Roulotte / venda de comida", examples: "Refeições, sandes, sumos", team: true },
];

/** Similar kinds are merged into one choice on screen. */
export const PICKER_TYPES = BUSINESS_TYPES.filter((b) => b.key !== "bancada" && b.key !== "miniloja");

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
