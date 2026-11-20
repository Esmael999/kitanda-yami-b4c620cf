import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseKz } from "@/lib/ledger";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: "/mais" | "/";
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 px-5 pt-safe pb-4">
      {back && (
        <Link
          to={back}
          aria-label="Voltar"
          className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-3xl border bg-card p-4 text-card-foreground shadow-card", className)}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-semibold tracking-[0.12em] uppercase", className)}>
      {children}
    </p>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-5 flex flex-col items-center rounded-3xl border border-dashed px-6 py-10 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function MoneyInput({
  value,
  onChange,
  id,
  autoFocus,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const shown = value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        autoFocus={autoFocus}
        placeholder="0"
        value={shown}
        onChange={(e) => onChange(parseKz(e.target.value))}
        className={cn("h-12 rounded-xl pr-12 text-base tabular", className)}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground">
        Kz
      </span>
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      placeholder="0"
      value={value ? String(value) : ""}
      onChange={(e) => onChange(parseKz(e.target.value))}
      className="h-12 rounded-xl text-base tabular"
    />
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function Avatar({ name, tone = "primary" }: { name: string; tone?: "primary" | "debt" }) {
  return (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-bold",
        tone === "debt" ? "bg-debt-soft text-debt" : "bg-success-soft text-primary",
      )}
    >
      {initials(name) || "?"}
    </span>
  );
}

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.startsWith("244") ? digits : `244${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}
