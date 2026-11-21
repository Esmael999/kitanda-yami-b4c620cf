import { Users, User } from "lucide-react";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/business";
import { cn } from "@/lib/utils";

export function BusinessPicker({ value, onChange }: { value: string; onChange: (t: BusinessType) => void }) {
  return (
    <div role="radiogroup" aria-label="Tipo de negócio" className="grid grid-cols-2 gap-2">
      {BUSINESS_TYPES.map((b) => {
        const on = b.key === value;
        return (
          <button
            key={b.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(b.key)}
            className={cn(
              "cursor-pointer rounded-2xl border p-3 text-left transition-colors",
              on ? "border-primary bg-accent" : "border-border bg-surface",
            )}
          >
            <p className="text-sm leading-tight font-semibold">{b.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{b.examples}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
              {b.team ? <Users className="size-3" /> : <User className="size-3" />}
              {b.team ? "Pode ter ajudantes" : "Atende sozinha"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
