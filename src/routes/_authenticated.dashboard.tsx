import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t, money, numberFmt, fmtDate, localized } from "@/lib/i18n";
import {
  TrendingUp,
  Boxes,
  AlertTriangle,
  DollarSign,
  Building2,
  Package,
  Users,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import { useAuth, useIsOwner, useBranchId } from "@/lib/auth-context";
import { SetupBanner } from "@/components/setup-banner";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role, user } = useAuth();
  const isOwner = useIsOwner();
  const branchId = useBranchId();
  const today = new Date().toISOString().slice(0, 10);

  // ---- Summary stats ----
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", branchId, isOwner, today],
    staleTime: 60_000,
    queryFn: async () => {
      const todaySalesQ = supabase
        .from("sales")
        .select("quantity, selling_price, profit")
        .eq("sale_date", today);
      if (!isOwner && branchId) todaySalesQ.eq("branch_id", branchId);
      const { data: sales } = await todaySalesQ;

      const invQ = supabase
        .from("inventory")
        .select("quantity, products(name, unit, buying_price, category), branches(name)");
      if (!isOwner && branchId) invQ.eq("branch_id", branchId);
      const { data: inv } = await invQ;

      const branches = isOwner
        ? (await supabase.from("branches").select("id")).data ?? []
        : [];
      const products = (await supabase.from("products").select("id")).data ?? [];
      const workers = isOwner
        ? (await supabase.from("user_roles").select("id")).data ?? []
        : [];
      const expensesQ = supabase.from("expenses").select("amount").eq("expense_date", today);
      if (!isOwner && branchId) expensesQ.eq("branch_id", branchId);
      const { data: exp } = await expensesQ;

      const todaySales = (sales ?? []).reduce((s, x) => s + Number(x.selling_price) * Number(x.quantity), 0);
      const todayProfit = (sales ?? []).reduce((s, x) => s + Number(x.profit), 0);
      const todayExpenses = (exp ?? []).reduce((s, x) => s + Number(x.amount), 0);
      const totalStock = (inv ?? []).reduce((s, x) => s + Number(x.quantity), 0);
      const totalStockValue = (inv ?? []).reduce(
        (s, x) => s + Number(x.quantity) * Number((x.products as any)?.buying_price ?? 0),
        0,
      );
      const lowStock = (inv ?? []).filter(
        (i) => Number(i.quantity) > 0 && Number(i.quantity) <= 10,
      );

      return {
        todaySales,
        todayProfit,
        todayExpenses,
        todayNet: todayProfit - todayExpenses,
        totalStock,
        totalStockValue,
        lowStock,
        branchCount: branches.length,
        productCount: products.length,
        workerCount: workers.length,
      };
    },
  });

  // ---- Branch performance (owner only) ----
  const { data: branchStats } = useQuery({
    queryKey: ["branch-performance", isOwner],
    enabled: isOwner,
    staleTime: 60_000,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      const ms = monthStart.toISOString().slice(0, 10);

      const { data: br } = await supabase
        .from("branches")
        .select("id, name, status, created_at");
      if (!br) return [];

      const results = await Promise.all(
        br.map(async (b) => {
          const salesQ = supabase
            .from("sales")
            .select("quantity, selling_price, profit")
            .eq("branch_id", b.id)
            .gte("sale_date", ms);
          const { data: sales } = await salesQ;
          const rev = (sales ?? []).reduce((s, x) => s + Number(x.selling_price) * Number(x.quantity), 0);
          const profit = (sales ?? []).reduce((s, x) => s + Number(x.profit), 0);

          const { data: inv } = await supabase
            .from("inventory")
            .select("quantity, products(buying_price)")
            .eq("branch_id", b.id);
          const stockValue = (inv ?? []).reduce(
            (s, x) => s + Number(x.quantity) * Number((x.products as any)?.buying_price ?? 0),
            0,
          );
          const totalStock = (inv ?? []).reduce((s, x) => s + Number(x.quantity), 0);

          const { count: workerCount } = await supabase
            .from("user_roles")
            .select("id", { count: "exact" })
            .eq("branch_id", b.id);

          return {
            ...b,
            revenue: rev,
            profit,
            stockValue,
            totalStock,
            workerCount: workerCount ?? 0,
          };
        }),
      );
      return results;
    },
  });

  // ---- Recent sales ----
  const { data: recent } = useQuery({
    queryKey: ["recent-sales", branchId, isOwner],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("sales")
        .select(
          "id, quantity, selling_price, profit, sale_date, products(name, unit), branches(name), created_by",
        )
        .order("created_at", { ascending: false })
        .limit(8);

      if (!isOwner && branchId) q = q.eq("branch_id", branchId);
      const { data } = await q;
      return data ?? [];
    },
  });

  // ---- Worker target progress ----
  const { data: targetInfo } = useQuery({
    queryKey: ["worker-targets", user?.id, branchId, today],
    enabled: !isOwner && !!branchId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!branchId) return { target: 0, achieved: 0 };
      // Today's target for this worker (or branch-level if no personal target)
      const { data: targets } = await supabase
        .from("sales_targets")
        .select("target_amount, period_type, period_date")
        .eq("period_date", today)
        .eq("period_type", "daily")
        .or(`user_id.eq.${user?.id},and(user_id.is.null,branch_id.eq.${branchId})`)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: sales } = await supabase
        .from("sales")
        .select("selling_price, quantity")
        .eq("sale_date", today)
        .eq("branch_id", branchId);

      const achieved = (sales ?? []).reduce(
        (s, x) => s + Number(x.selling_price) * Number(x.quantity),
        0,
      );
      const target = targets?.[0]?.target_amount ?? 0;
      return { target, achieved };
    },
  });

  const cards = [
    { label: t.todaySales, value: money(stats?.todaySales ?? 0), icon: TrendingUp, tone: "text-primary" },
    { label: t.todayProfit, value: money(stats?.todayProfit ?? 0), icon: DollarSign, tone: "text-green-600" },
    { label: t.todayExpenses, value: money(stats?.todayExpenses ?? 0), icon: Wallet, tone: "text-red-600" },
    { label: t.todayNet, value: money(stats?.todayNet ?? 0), icon: PiggyBank, tone: "text-primary" },
    { label: t.totalProducts, value: numberFmt(stats?.productCount ?? 0), icon: Package, tone: "text-primary" },
    ...(isOwner
      ? [
          { label: t.totalBranches, value: numberFmt(stats?.branchCount ?? 0), icon: Building2, tone: "text-primary" },
          { label: t.totalWorkers, value: numberFmt(stats?.workerCount ?? 0), icon: Users, tone: "text-primary" },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      {!isOwner && branchId && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{t.currentBranch}</p>
            <p className="text-xl font-bold">
              {(stats as any)?.branchName ?? ""}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.dashboard}</h1>
          <p className="text-sm text-muted-foreground">
          {isOwner ? t.businessOverview : localized("Reba ibikorwa byawe n'intego zawe.", "Review your activity and sales targets.")}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Setup banner for owner */}
      {isOwner && (
        <SetupBanner
          steps={[
            ...(stats && stats.branchCount === 0
              ? [{ message: localized("Intambwe ya 1: Ongeraho ishami rya mbere.", "Step 1: Add your first branch."), to: "/branches", label: t.branches }]
              : []),
            ...(stats && stats.productCount === 0
              ? [{ message: localized("Intambwe ya 2: Ongeraho igicuruzwa cya mbere.", "Step 2: Add your first product."), to: "/products", label: t.products }]
              : []),
            ...(stats && stats.branchCount > 0 && stats.productCount > 0 && stats.totalStock === 0
              ? [{ message: localized("Intambwe ya 3: Andika isoko kugira ngo ububiko bwuzure.", "Step 3: Record a purchase to stock your inventory."), to: "/purchases", label: t.purchases }]
              : []),
          ]}
        />
      )}

      {/* Worker target progress */}
      {!isOwner && targetInfo && targetInfo.target > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t.salesTarget}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{money(targetInfo.target)}</p>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span>
                {t.salesAchieved}: <strong>{money(targetInfo.achieved)}</strong>
              </span>
              <span>
                {t.salesRemaining}:{" "}
                <strong className="text-muted-foreground">
                  {money(targetInfo.target - targetInfo.achieved)}
                </strong>
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((targetInfo.achieved / targetInfo.target) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <c.icon className={`h-5 w-5 ${c.tone}`} />
              </div>
              <p className="mt-2 text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Branch performance table (owner) */}
      {isOwner && branchStats && (
        <Card>
          <CardHeader>
            <CardTitle>{t.branchPerformance}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left font-medium">
                    <th className="pb-2">{t.branch}</th>
                    <th className="pb-2">{t.revenue}</th>
                    <th className="pb-2">{t.profit}</th>
                    <th className="pb-2">{t.totalWorkers}</th>
                    <th className="pb-2 text-right">{t.currentStock}</th>
                  </tr>
                </thead>
                <tbody>
                  {branchStats.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="py-2 font-medium">
                        {b.name}
                      </td>
                      <td className="py-2">{money(b.revenue)}</td>
                      <td className="py-2">{money(b.profit)}</td>
                      <td className="py-2">{numberFmt(b.workerCount)}</td>
                      <td className="py-2 text-right">{numberFmt(b.totalStock)} {b.totalStock ? "KG" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent sales + low stock for worker */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.recentTransactions}</CardTitle>
          </CardHeader>
          <CardContent>
            {recent && recent.length > 0 ? (
              <div className="divide-y">
                {recent.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{s.products?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.branches?.name} · {fmtDate(s.sale_date)} · {t.customer}: {s.customer_name ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{money(Number(s.selling_price) * Number(s.quantity))}</p>
                      <p className="text-xs text-green-600">+{money(s.profit)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t.noData}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.lowStockLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.lowStock && stats.lowStock.length > 0 ? (
              <div className="divide-y">
                {stats.lowStock.map((i: any) => (
                  <div key={i.product_id} className="flex items-center justify-between py-3">
                    <p className="text-sm font-medium">{i.products?.name}</p>
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                      {numberFmt(i.quantity)} / {i.products?.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{localized("Nta bicuruzwa bifite ububiko buke.", "No products are low in stock.")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
