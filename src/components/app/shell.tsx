import { useEffect } from "react";
import { Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { BookOpen, HandCoins, Home, LayoutGrid, Package, Plus } from "lucide-react";
import { isAuthPage, useAuth } from "@/lib/auth";
import { endSession, startSession, useLedgerReady } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-bold", className)}>
      <span className="grid size-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
        <BookOpen className="size-4" strokeWidth={2.5} />
      </span>
      <span>
        Kitanda
      </span>
    </span>
  );
}

const tabs = [
  { to: "/", label: "Início", icon: Home },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/dividas", label: "Dívidas", icon: HandCoins },
  { to: "/mais", label: "Mais", icon: LayoutGrid },
] as const;

function TabLink({ tab }: { tab: (typeof tabs)[number] }) {
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      activeOptions={{ exact: tab.to === "/" }}
      className="group flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary"
    >
      <Icon className="size-5" />
      {tab.label}
    </Link>
  );
}

function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t bg-surface/95 px-2 pt-1 pb-safe backdrop-blur"
    >
      <div className="flex items-end">
        <TabLink tab={tabs[0]} />
        <TabLink tab={tabs[1]} />
        <Link
          to="/vender"
          aria-label="Nova venda"
          className="-mt-7 flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold text-primary"
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow ring-4 ring-background transition-transform active:scale-95">
            <Plus className="size-7" strokeWidth={2.75} />
          </span>
          Vender
        </Link>
        <TabLink tab={tabs[2]} />
        <TabLink tab={tabs[3]} />
      </div>
    </nav>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Logo className="animate-pulse text-xl" />
    </div>
  );
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const auth = useAuth();
  const ready = useLedgerReady();

  // The account owns the offline copy: load it in when someone signs in, drop it when they leave.
  useEffect(() => {
    if (auth.userId) void startSession(auth.userId, auth.email);
    else if (auth.status === "signed_out") endSession();
  }, [auth.userId, auth.email, auth.status]);

  if (isAuthPage(pathname)) {
    return (
      <div className="min-h-dvh bg-app-glow">
        <div className="mx-auto min-h-dvh max-w-md">
          <Outlet />
        </div>
      </div>
    );
  }

  if (auth.status === "checking") {
    return (
      <div className="min-h-dvh bg-app-glow">
        <Splash />
      </div>
    );
  }

  if (auth.status !== "signed_in") return <Navigate to="/entrar" replace />;

  return (
    <div className="min-h-dvh bg-app-glow">
      <div className="mx-auto min-h-dvh max-w-md pb-28">{ready ? <Outlet /> : <Splash />}</div>
      <BottomNav />
    </div>
  );
}
