import { Check, Store, ShoppingBasket, Beer, UtensilsCrossed, Users, User, type LucideIcon } from "lucide-react";
import { PICKER_TYPES, type BusinessType } from "@/lib/business";
import { cn } from "@/lib/utils";

const ICONS: Partial<Record<BusinessType, LucideIcon>> = {
  zunga: ShoppingBasket,
  bancada: ShoppingBasket,
  miniloja: Store,
  cantina: Store,
  deposito: Beer,
  comida: UtensilsCrossed,
};

/** One clean list of choices, like the setup screens of shop apps (icon, name, short hint, tick). */
export function BusinessPicker({ value, onChange }: { value: string; onChange: (t: BusinessType) => void }) {
  const current = value;
  return (
    <div role="radiogroup" aria-label="Tipo de negócio" className="overflow-hidden rounded-2xl border border-border bg-surface">
      {PICKER_TYPES.map((b, i) => {
        const on = b.key === current;
        const Icon = ICONS[b.key] ?? Store;
        return (
          <button
            key={b.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(b.key)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors",
              i > 0 && "border-t border-border",
              on ? "bg-accent" : "hover:bg-secondary",
            )}
          >
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", on ? "bg-primary text-primary-foreground" : "bg-secondary text-primary")}>
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{b.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {b.team ? <Users className="size-3" /> : <User className="size-3" />}
                <span className="truncate">{b.examples} · {b.team ? "ajudantes frequentes" : "ajudantes opcionais"}</span>
              </span>
            </span>
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
              {on && <Check className="size-3" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
