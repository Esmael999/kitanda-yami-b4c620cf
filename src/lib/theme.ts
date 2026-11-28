import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const key = "kitanda:theme";
export function readTheme(): Theme {
  try { return window.localStorage.getItem(key) === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset["theme"] = theme;
}
export function useThemePreference() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const saved = readTheme();
    setTheme(saved);
    applyTheme(saved);
  }, []);
  const select = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try { window.localStorage.setItem(key, next); } catch { /* session still works */ }
  };
  return [theme, select] as const;
}
