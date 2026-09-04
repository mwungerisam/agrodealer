import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { t, money, numberFmt, fmtDate } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { generateReportPdf } from "@/lib/pdf";
import { toast } from "sonner";
import { localDateInput, localMonthInput } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { role } = useAuth();
  const isOwner = role?.role === "owner";
  if (role && !isOwner) return <Navigate to="/dashboard" replace />;
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly" | "annual">("daily");
  const [date, setDate] = useState(localDateInput());
  const [month, setMonth] = useState(localMonthInput());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [branchId, setBranchId] = useState<string>(role?.branch_id ?? "all");

  const branchesQuery = useQuery({
    queryKey: ["branches-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const branches = branchesQuery.data ?? [];

  const range = tab === "daily"
    ? { from: date, to: date }
    : tab === "weekly"
      ? (() => {
          const start = new Date(`${date}T00:00:00`);
          const day = start.getDay();
          start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          return { from: localDateInput(start), to: localDateInput(end) };
        })()
      : tab === "monthly"
        ? (() => {
            const [y, m] = month.split("-").map(Number);
            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m, 0);
            return { from: localDateInput(start), to: localDateInput(end) };
          })()
        : { from: `${year}-01-01`, to: `${year}-12-31` };

  const branchFilter = isOwner ? (branchId === "all" ? null : branchId) : role?.branch_id ?? null;

  const reportQuery = useQuery({
    queryKey: ["report", tab, range.from, range.to, branchFilter],
    queryFn: async () => {
      const withBranch = <T,>(q: T): T => (branchFilter ? (q as any).eq("branch_id", branchFilter) : q);

      const salesQ = withBranch(
        supabase.from("sales").select("quantity, selling_price, profit, sale_date, customer_name, products(name), branches(name)").gte("sale_date", range.from).lte("sale_date", range.to).order("sale_date", { ascending: false })
      );
      const purchQ = withBranch(
        supabase.from("purchases").select("quantity, buying_price, transport_cost, supplier, purchase_date, products(name), branches(name)").gte("purchase_date", range.from).lte("purchase_date", range.to).order("purchase_date", { ascending: false })
      );
      const expQ = withBranch(
        supabase.from("expenses").select("description, amount, expense_date, branches(name)").gte("expense_date", range.from).lte("expense_date", range.to).order("expense_date", { ascending: false })
      );

      const [salesResult, purchasesResult, expensesResult] = await Promise.all([salesQ, purchQ, expQ]);
      if (salesResult.error) throw salesResult.error;
      if (purchasesResult.error) throw purchasesResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const sales = salesResult.data;
      const purchases = purchasesResult.data;
      const expenses = expensesResult.data;

      const totalSales = (sales ?? []).reduce((s, x) => s + Number(x.selling_price) * Number(x.quantity), 0);
      const totalProfit = (sales ?? []).reduce((s, x) => s + Number(x.profit), 0);
      const totalPurchases = (purchases ?? []).reduce((s, x) => s + Number(x.buying_price) * Number(x.quantity) + Number(x.transport_cost), 0);
      const totalExpenses = (expenses ?? []).reduce((s, x) => s + Number(x.amount), 0);

      return {
        sales: sales ?? [],
        purchases: purchases ?? [],
        expenses: expenses ?? [],
        totals: {
          sales: totalSales,
          profit: totalProfit,
          purchases: totalPurchases,
          expenses: totalExpenses,
          net: totalProfit - totalExpenses,
          customers: new Set((sales ?? []).map((sale) => sale.customer_name).filter(Boolean)).size,
        },
      };
    },
  });
  const report = reportQuery.data;

  if (branchesQuery.isError || reportQuery.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.reports}</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t.errorGeneric}</p>
            <Button variant="outline" onClick={() => { void branchesQuery.refetch(); void reportQuery.refetch(); }}>
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const doDownload = () => {
    if (!report) return;
    const branchName =
      branchFilter ? (branches.find((b: any) => b.id === branchFilter)?.name ?? "—") : "Amashami yose";
    const title = tab === "daily" ? `${t.dailyReport} - ${fmtDate(date)}` : tab === "weekly" ? `${t.weeklyReport} - ${range.from}` : tab === "monthly" ? `${t.monthlyReport} - ${month}` : `${t.annualReport} - ${year}`;
    const period = `${fmtDate(range.from)} → ${fmtDate(range.to)}`;
    generateReportPdf({
      title,
      period,
      branchName,
      sales: (report.sales as any[]).map((s) => ({
        date: s.sale_date,
        product: s.products?.name ?? "",
        customer: s.customer_name ?? "-",
        qty: Number(s.quantity),
        price: Number(s.selling_price),
        profit: Number(s.profit),
      })),
      purchases: (report.purchases as any[]).map((p) => ({
        date: p.purchase_date,
        product: p.products?.name ?? "",
        supplier: p.supplier,
        qty: Number(p.quantity),
        price: Number(p.buying_price),
        transport: Number(p.transport_cost),
      })),
      expenses: (report.expenses as any[]).map((e) => ({
        date: e.expense_date,
        description: e.description,
        amount: Number(e.amount),
      })),
      totals: report.totals,
    });
    toast.success("PDF yamanuwe");
  };

  const kpis = [
    { label: t.totalSales, value: money(report?.totals.sales ?? 0), tone: "text-primary" },
    { label: t.totalProfit, value: money(report?.totals.profit ?? 0), tone: "text-success" },
    { label: t.totalPurchases, value: money(report?.totals.purchases ?? 0), tone: "" },
    { label: t.totalExpenses, value: money(report?.totals.expenses ?? 0), tone: "text-destructive" },
    { label: t.netProfit, value: money(report?.totals.net ?? 0), tone: "text-primary font-bold" },
    { label: t.totalCustomers, value: numberFmt(report?.totals.customers ?? 0), tone: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.reports}</h1>
        <p className="text-sm text-muted-foreground">{t.reportDescription}</p>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="daily">{t.dailyReport}</TabsTrigger>
              <TabsTrigger value="weekly">{t.weeklyReport}</TabsTrigger>
              <TabsTrigger value="monthly">{t.monthlyReport}</TabsTrigger>
              <TabsTrigger value="annual">{t.annualReport}</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label>{t.date}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                {isOwner && (
                  <div className="space-y-2">
                    <Label>{t.branch}</Label>
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Amashami yose</SelectItem>
                        {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={doDownload} disabled={!report}><Download className="mr-2 h-4 w-4" /> {t.downloadPdf}</Button>
              </div>
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2"><Label>{t.weekOf}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                {isOwner && <div className="space-y-2"><Label>{t.branch}</Label><Select value={branchId} onValueChange={setBranchId}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t.allBranches}</SelectItem>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>}
                <Button onClick={doDownload} disabled={!report}><Download className="mr-2 h-4 w-4" />{t.downloadPdf}</Button>
              </div>
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label>Ukwezi</Label>
                  <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
                {isOwner && (
                  <div className="space-y-2">
                    <Label>{t.branch}</Label>
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Amashami yose</SelectItem>
                        {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={doDownload} disabled={!report}><Download className="mr-2 h-4 w-4" /> {t.downloadPdf}</Button>
              </div>
            </TabsContent>
            <TabsContent value="annual" className="mt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2"><Label>{t.year}</Label><Input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} /></div>
                {isOwner && <div className="space-y-2"><Label>{t.branch}</Label><Select value={branchId} onValueChange={setBranchId}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t.allBranches}</SelectItem>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>}
                <Button onClick={doDownload} disabled={!report}><Download className="mr-2 h-4 w-4" />{t.downloadPdf}</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <p className={`mt-2 text-xl ${k.tone || "font-semibold"}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Kugurisha ({report?.sales.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {report && report.sales.length > 0 ? (
            <div className="divide-y text-sm">
              {(report.sales as any[]).slice(0, 20).map((s, i) => (
                <div key={i} className="flex justify-between py-2">
                  <div>
                    <p className="font-medium">{s.products?.name}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(s.sale_date)} · {s.branches?.name}</p>
                  </div>
                  <div className="text-right">
                    <p>{money(Number(s.selling_price) * Number(s.quantity))}</p>
                    <p className="text-xs text-success">+{money(s.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="py-6 text-center text-sm text-muted-foreground">{t.noData}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
