import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { LANGUAGES, setLang, translate } from "@/lib/i18n";
import { LanguagePicker } from "@/components/app/language-picker";

describe("choosing the app's language", () => {
  it("offers Portuguese, Kimbundu, Kikongo and Cokwe", () => {
    expect(LANGUAGES.map((l) => l.name)).toEqual(["Português", "Kimbundu", "Kikongo", "Cokwe"]);
  });

  it("uses the draft word where there is one and Portuguese where there isn't", () => {
    expect(translate("kg", "nav.debts")).toBe("Mfuka");
    expect(translate("kmb", "nav.debts")).toBe("Dívidas");
    expect(translate("pt", "nav.sell")).toBe("Vender");
  });

  it("remembers the choice and marks the page language", () => {
    render(<LanguagePicker />);
    act(() => screen.getByRole("radio", { name: "Kikongo" }).click());
    expect(window.localStorage.getItem("kitanda:lang")).toBe("kg");
    expect(document.documentElement.lang).toBe("kg");
    expect(screen.getByRole("radio", { name: "Kikongo" })).toHaveAttribute("aria-checked", "true");
    act(() => setLang("pt"));
  });
});
