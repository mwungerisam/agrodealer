import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { t, money, fmtDate, formatErrorMessage } from "@/lib/i18n";
import { useIsOwner, useBranchId } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/targets")({
  component: TargetsPage,
});

function TargetsPage() {
  const isOwner = useIsOwner();
  const workerBranchId = useBranchId();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  if (!isOwner && !workerBranchId) return <Navigate to="/dashboard" replace />;

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    branch_id: workerBranchId ?? "",
    user_id: "",
    period_type: "daily" as "daily" | "monthly",
    period_date: today,
    target_amount: "",
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-active"],
    queryFn: async () =>
      (await supabase.from("branches").select("id, name").eq("status", true).order("name")).data ?? [],
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-for-targets"],
    enabled: isOwner,
    queryFn: async () =>
      (await supabase.from("profiles").select("id, full_name").order("full_name")).data ?? [],
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["targets", isOwner ? "all" : workerBranchId],
    staleTime: 60_000,
    queryFn: async () => {
      try {
        let q = supabase
          .from("sales_targets")
          .select(
            "id, target_amount, period_type, period_date, user_id, branch_id, branches(name)",
          )
          .order("created_at", { ascending: false });
        if (!isOwner && workerBranchId) q = q.eq("branch_id", workerBranchId);
        const { data, error } = await q.limit(200);
        if (error) return [];
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: workerTargets } = useQuery({
    queryKey: ["worker-target-progress", workerBranchId, today, monthStart, monthEnd],
    enabled: !isOwner && !!workerBranchId,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const { data: daily } = await supabase
          .from("sales_targets")
          .select("target_amount")
          .eq("branch_id", workerBranchId!)
          .eq("period_type", "daily")
          .eq("period_date", today)
          .order("created_at", { ascending: false })
          .limit(1);

        const { data: monthly } = await supabase
          .from("sales_targets")
          .select("target_amount")
          .eq("branch_id", workerBranchId!)
          .eq("period_type", "monthly")
          .eq("period_date", monthStart)
          .order("created_at", { ascending: false })
          .limit(1);

        const { data: todaySales } = await supabase
          .from("sales")
          .select("selling_price, quantity")
          .eq("branch_id", workerBranchId!)
          .eq("sale_date", today);

        const { data: monthSales } = await supabase
          .from("sales")
          .select("selling_price, quantity")
          .eq("branch_id", workerBranchId!)
          .gte("sale_date", monthStart)
          .lte("sale_date", monthEnd);

        const todayAchieved = (todaySales ?? []).reduce(
          (s: number, x: any) => s + Number(x.selling_price) * Number(x.quantity),
          0,
        );
        const monthAchieved = (monthSales ?? []).reduce(
          (s: number, x: any) => s + Number(x.selling_price) * Number(x.quantity),
          0,
        );

        return {
          dailyTarget: Number(daily?.[0]?.target_amount ?? 0),
          dailyAchieved: todayAchieved,
          monthlyTarget: Number(monthly?.[0]?.target_amount ?? 0),
          monthlyAchieved: monthAchieved,
        };
      } catch {
        return {
          dailyTarget: 0,
          dailyAchieved: 0,
          monthlyTarget: 0,
          monthlyAchieved: 0,
        };
      }
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.target_amount) throw new Error(t.requiredField);
      if (!form.branch_id) throw new Error(t.chooseBranch);
      const payload = {
        branch_id: form.branch_id,
        user_id: form.user_id || null,
        period_type: form.period_type,
        period_date: form.period_date,
        target_amount: Number(form.target_amount),
      };
      const { error } = await supabase.from("sales_targets").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.targetSet);
      qc.invalidateQueries({ queryKey: ["targets"] });
      qc.invalidateQueries({ queryKey: ["worker-target-progress"] });
      setOpen(false);
      setForm({
        branch_id: workerBranchId ?? "",
        user_id: "",
        period_type: "daily",
        period_date: today,
        target_amount: "",
      });
    },
    onError: (e: Error) => toast.error(formatErrorMessage(e)),
  });

  // Worker view
  if (!isOwner && workerBranchId && workerTargets) {
    const pct =
      workerTargets.monthlyTarget > 0
        ? Math.round((workerTargets.monthlyAchieved / workerTargets.monthlyTarget) * 100)
        : 0;
    const dailyPct =
      workerTargets.dailyTarget > 0
        ? Math.round((workerTargets.dailyAchieved / workerTargets.dailyTarget) * 100)
        : 0;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t.targets}</h1>
          <p className="text-sm text-muted-foreground">Intego zo kugurisha n'inyuguti yawe</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{t.salesTarget}</p>
              <p className="mt-1 text-2xl font-bold">{money(workerTargets.dailyTarget)}</p>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(dailyPct, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {Math.min(dailyPct, 100)}% · {money(workerTargets.dailyAchieved)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{t.monthlyRevenue}</p>
              <p className="mt-1 text-2xl font-bold">{money(workerTargets.monthlyTarget)}</p>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-green-600 transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {Math.min(pct, 100)}% · {money(workerTargets.monthlyAchieved)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{t.todaySales}</p>
              <p className="text-2xl font-bold text-green-600">{money(workerTargets.dailyAchieved)}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{t.monthlyRevenue}</p>
              <p className="text-2xl font-bold text-green-600">{money(workerTargets.monthlyAchieved)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ibikorwa by'ingenzi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Intego zo kugurisha zerekana ibyifuzo wakwifuzoho kugira ngo usuzume.
              Intego zo guhindura zandamijwe n'umuyobozi.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Owner view
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t.targets}</h1>
          <p className="text-sm text-muted-foreground">Shyiraho intego zo kugurisha</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> {t.add}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t.add} {t.salesTarget}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.branch} *</Label>
                <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t.chooseBranch} /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.worker}</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Hitamo umukozi (cyangwa usabitsi)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ishami ryose</SelectItem>
                    {workers.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.period} *</Label>
                <Select value={form.period_type} onValueChange={(v: any) => setForm({ ...form, period_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t.daily}</SelectItem>
                    <SelectItem value="monthly">{t.monthly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.date}</Label>
                <Input type="date" value={form.period_date} onChange={(e) => setForm({ ...form, period_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t.targetAmount} (RWF) *</Label>
                <Input type="number" min={0} value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="500000" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{t.save}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {targets.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.branch}</TableHead>
                <TableHead>{t.worker}</TableHead>
                <TableHead>{t.period}</TableHead>
                <TableHead>{t.date}</TableHead>
                <TableHead className="text-right">{t.targetAmount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((tr: any) => (
                <TableRow key={tr.id}>
                  <TableCell>{tr.branches?.name ?? "—"}</TableCell>
                  <TableCell>{tr.profiles?.full_name ?? "Ishami ryose"}</TableCell>
                  <TableCell>{tr.period_type === "daily" ? t.daily : t.monthly}</TableCell>
                  <TableCell>{fmtDate(tr.period_date)}</TableCell>
                  <TableCell className="text-right">{money(tr.target_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle>{t.noData}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Urakoze guhitamo intego zo kugurisha.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
