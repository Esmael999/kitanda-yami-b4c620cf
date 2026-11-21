import { describe, expect, it } from "vitest";
import { businessInfo, defaultHelperPermissions, teamAllowed } from "@/lib/business";

describe("business types", () => {
  it("solo businesses (zunga, bancada) have no helpers", () => {
    expect(teamAllowed("zunga")).toBe(false);
    expect(teamAllowed("bancada")).toBe(false);
  });
  it("cantina, mini-loja, depósito and comida can have helpers", () => {
    for (const t of ["cantina", "miniloja", "deposito", "comida"]) expect(teamAllowed(t)).toBe(true);
  });
  it("unknown type falls back to cantina", () => {
    expect(businessInfo("xyz").key).toBe("cantina");
  });
  it("helpers never see reports by default", () => {
    expect(defaultHelperPermissions("cantina").relatorios).toBe(false);
    expect(defaultHelperPermissions("cantina").vender).toBe(true);
  });
});
