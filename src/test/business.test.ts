import { describe, expect, it } from "vitest";
import { businessInfo, defaultHelperPermissions, initialBusinessName, teamAllowed, HELPER_PRESETS, PICKER_TYPES } from "@/lib/business";

describe("business types", () => {
  it("every merchant may invite helpers, including zunga and unknown businesses", () => {
    for (const type of ["zunga", "bancada", "boutique", "oficina", undefined]) {
      expect(teamAllowed(type)).toBe(true);
    }
  });
  it("names a new shop after its owner", () => {
    expect(initialBusinessName(" Celma Eduardo ")).toBe("Loja de Celma Eduardo");
    expect(initialBusinessName("")).toBe("A minha loja");
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

it("limits vendor and stock presets to their own capabilities", () => {
  const [seller, stock, manager] = HELPER_PRESETS;
  expect(seller?.permissions.relatorios).toBe(false);
  expect(stock?.permissions.vender).toBe(false);
  expect(stock?.permissions.produtos).toBe(true);
  expect(manager?.permissions.relatorios).toBe(true);
});

it("exposes every business category accepted by the current backend", () => {
  expect(PICKER_TYPES.map(b => b.key)).toEqual(["zunga", "bancada", "cantina", "miniloja", "deposito", "comida"]);
});
