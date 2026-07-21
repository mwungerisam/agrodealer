import { createFileRoute, Outlet, Navigate, Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Loader2, LogOut, LayoutDashboard, Building2, Package, ShoppingCart, TrendingUp, Boxes, FileText, Wallet, Users, Sprout } from "lucide-react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: t.dashboard, icon: LayoutDashboard, ownerOnly: false },
  { to: "/branches", label: t.branches, icon: Building2, ownerOnly: true },
  { to: "/products", label: t.products, icon: Package, ownerOnly: true },
  { to: "/purchases", label: t.purchases, icon: ShoppingCart, ownerOnly: false },
  { to: "/sales", label: t.sales, icon: TrendingUp, ownerOnly: false },
  { to: "/inventory", label: t.inventory, icon: Boxes, ownerOnly: false },
  { to: "/expenses", label: t.expenses, icon: Wallet, ownerOnly: false },
  { to: "/reports", label: t.reports, icon: FileText, ownerOnly: false },
  { to: "/users", label: t.users, icon: Users, ownerOnly: true },
] as const;

function AuthenticatedLayout() {
  const { user, loading, role, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const isOwner = role?.role === "owner";
  const visible = NAV.filter((n) => !n.ownerOnly || isOwner);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Wasohotse neza");
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">UFBC</p>
            <p className="text-[11px] leading-tight text-sidebar-foreground/70">Agrodealer</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visible.map((n) => {
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-2 text-xs text-sidebar-foreground/70">
            {user.email}
            <div className="mt-0.5 inline-flex items-center rounded-full bg-sidebar-primary/20 px-2 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground/90">
              {isOwner ? t.owner : t.manager}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t.signOut}
          </Button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b bg-sidebar px-3 py-2 text-sidebar-foreground md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Sprout className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">UFBC</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-sidebar-foreground">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <main className="flex-1 md:ml-0">
        <div className="md:hidden h-12" />
        {/* Mobile nav strip */}
        <div className="scrollbar-none flex overflow-x-auto border-b bg-card px-2 md:hidden">
          {visible.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-medium ${
                  active ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </div>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
