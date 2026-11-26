import { Languages } from "lucide-react";
import { LANGUAGES, coverage, setLang, useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguagePicker({ className }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  return (
    <div className={cn("space-y-2", className)}>
      <p className="flex items-center gap-2 font-semibold">
        <Languages className="size-4 text-primary" /> {t("lang.title")}
      </p>
      <div role="radiogroup" aria-label={t("lang.title")} className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={lang === l.code}
            onClick={() => setLang(l.code)}
            className={cn(
              "cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
              lang === l.code
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-secondary text-muted-foreground",
            )}
          >
            {l.name}
            {l.code !== "pt" && <span aria-hidden="true" className="mt-1 block text-[10px] font-normal">Tradução parcial · {Math.round(coverage(l.code) * 100)}%</span>}
          </button>
        ))}
      </div>
      {lang !== "pt" && <p className="text-xs text-muted-foreground">{t("lang.hint")}</p>}
      <p className="text-xs text-muted-foreground">Ngangela e Lunda: em preparação.</p>
    </div>
  );
}
