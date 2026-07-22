import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t, money, fmtDate } from "@/lib/i18n";
import { TrendingUp, Boxes, AlertTriangle, DollarSign, Building2, Package } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SetupBanner } from "@/components/setup-banner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role } = useAuth();
  const isOwner = role?.role === "owner";
  const branchFilter = role?.branch_id;

  const today = new Date().toISOString().slice(0, 10);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", branchFilter, isOwner],
    queryFn: async () => {
      let salesQ = supabase.from("sales").select("quantity, selling_price, profit, sale_date").eq("sale_date", today);
      if (!isOwner && branchFilter) salesQ = salesQ.eq("branch_id", branchFilter);
      const { data: sales } = await salesQ;

      let invQ = supabase.from("inventory").select("quantity, product_id, products(name, unit)");
      if (!isOwner && branchFilter) invQ = invQ.eq("branch_id", branchFilter);
      const { data: inv } = await invQ;

      const { data: branches } = await supabase.from("branches").select("id");
      const { data: products } = await supabase.from("products").select("id");

      const todaySales = sales?.reduce((s, x) => s + Number(x.selling_price) * Number(x.quantity), 0) ?? 0;
      const todayProfit = sales?.reduce((s, x) => s + Number(x.profit), 0) ?? 0;
      const totalStock = inv?.reduce((s, x) => s + Number(x.quantity), 0) ?? 0;
      const lowStock = (inv ?? []).filter((i) => Number(i.quantity) > 0 && Number(i.quantity) < 10);

      return {
        todaySales,
        todayProfit,
        totalStock,
        lowStock,
        branchCount: branches?.length ?? 0,
        productCount: products?.length ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-sales", branchFilter, isOwner],
    queryFn: async () => {
      let q = supabase
        .from("sales")
        .select("id, quantity, selling_price, profit, sale_date, products(name), branches(name)")
        .order("created_at", { ascending: false })
        .limit(6);
      if (!isOwner && branchFilter) q = q.eq("branch_id", branchFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const cards = [
    { label: t.todaySales, value: money(stats?.todaySales ?? 0), icon: TrendingUp, tone: "text-primary" },
    { label: t.todayProfit, value: money(stats?.todayProfit ?? 0), icon: DollarSign, tone: "text-success" },
    { label: t.remainingStock, value: `${stats?.totalStock.toLocaleString() ?? 0}`, icon: Boxes, tone: "text-accent-foreground" },
    { label: t.lowStock, value: `${stats?.lowStock.length ?? 0}`, icon: AlertTriangle, tone: "text-warning" },
    ...(isOwner
      ? [
          { label: t.totalBranches, value: `${stats?.branchCount ?? 0}`, icon: Building2, tone: "text-primary" },
          { label: t.totalProducts, value: `${stats?.productCount ?? 0}`, icon: Package, tone: "text-primary" },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard}</h1>
        <p className="text-sm text-muted-foreground">Incamake y'ibikorwa by'uyu munsi</p>
      </div>

      {isOwner && (
        <SetupBanner
          steps={[
            ...(stats && stats.branchCount === 0
              ? [{ message: "Intambwe 1: Ongeraho ishami rya mbere.", to: "/branches", label: t.branches }]
              : []),
            ...(stats && stats.productCount === 0
              ? [{ message: "Intambwe 2: Ongeraho igicuruzwa cya mbere.", to: "/products", label: t.products }]
              : []),
            ...(stats && stats.branchCount > 0 && stats.productCount > 0 && stats.totalStock === 0
              ? [{ message: "Intambwe 3: Andika kurangura kugira ngo uzuze ububiko.", to: "/purchases", label: t.purchases }]
              : []),
          ]}
        />
      )}

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
                        {s.branches?.name} · {fmtDate(s.sale_date)} · {s.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{money(Number(s.selling_price) * Number(s.quantity))}</p>
                      <p className="text-xs text-success">+{money(s.profit)}</p>
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
            <CardTitle>{t.lowStock}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.lowStock && stats.lowStock.length > 0 ? (
              <div className="divide-y">
                {stats.lowStock.map((i: any) => (
                  <div key={i.product_id} className="flex items-center justify-between py-3">
                    <p className="text-sm font-medium">{i.products?.name}</p>
                    <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                      {i.quantity} {i.products?.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Nta bicuruzwa bike</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
