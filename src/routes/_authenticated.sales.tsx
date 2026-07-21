import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { t, money, fmtDate } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesPage,
});

function SalesPage() {
  const { role, user } = useAuth();
  const isOwner = role?.role === "owner";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    branch_id: role?.branch_id ?? "",
    product_id: "",
    quantity: 0,
    selling_price: 0,
    sale_date: new Date().toISOString().slice(0, 10),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-active"],
    queryFn: async () => (await supabase.from("branches").select("id, name").eq("status", true).order("name")).data ?? [],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => (await supabase.from("products").select("id, name, unit, selling_price").eq("status", true).order("name")).data ?? [],
  });

  const { data: stock } = useQuery({
    queryKey: ["stock", form.branch_id, form.product_id],
    enabled: !!form.branch_id && !!form.product_id,
    queryFn: async () => {
      const { data } = await supabase.from("inventory").select("quantity").eq("branch_id", form.branch_id).eq("product_id", form.product_id).maybeSingle();
      return data?.quantity ?? 0;
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("id, quantity, selling_price, profit, sale_date, products(name, unit), branches(name)")
        .order("sale_date", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.branch_id) throw new Error(t.chooseBranch);
      if (!form.product_id) throw new Error(t.chooseProduct);
      if (form.quantity <= 0 || form.selling_price < 0) throw new Error(t.invalidNumber);
      if (Number(stock ?? 0) < form.quantity) throw new Error(t.noStockEnough);
      const { error } = await supabase.from("sales").insert({
        branch_id: form.branch_id,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        selling_price: Number(form.selling_price),
        sale_date: form.sale_date,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.saved);
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      setOpen(false);
      setForm({ ...form, product_id: "", quantity: 0, selling_price: 0 });
    },
    onError: (e: Error) => toast.error(e.message.includes("ububiko") ? t.noStockEnough : e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t.deleted); qc.invalidateQueries({ queryKey: ["sales"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t.sales}</h1>
          <p className="text-sm text-muted-foreground">Andika ibicuruzwa byaguzwe</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={branches.length === 0 || products.length === 0}><Plus className="mr-2 h-4 w-4" /> {t.add}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.add} {t.sales}</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              {isOwner && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t.branch} *</Label>
                  <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t.chooseBranch} /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label>{t.product} *</Label>
                <Select value={form.product_id} onValueChange={(v) => {
                  const p: any = products.find((x: any) => x.id === v);
                  setForm({ ...form, product_id: v, selling_price: p?.selling_price ?? 0 });
                }}>
                  <SelectTrigger><SelectValue placeholder={t.chooseProduct} /></SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.branch_id && form.product_id && (
                  <p className="text-xs text-muted-foreground">{t.currentStock}: <strong>{Number(stock ?? 0)}</strong></p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t.quantity} *</Label>
                <Input type="number" min={0} step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t.sellingPrice} *</Label>
                <Input type="number" min={0} value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: +e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t.saleDate} *</Label>
                <Input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{t.save}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.branch}</TableHead>
                <TableHead>{t.product}</TableHead>
                <TableHead>{t.quantity}</TableHead>
                <TableHead>{t.sellingPrice}</TableHead>
                <TableHead>Amafaranga yose</TableHead>
                <TableHead>{t.profit}</TableHead>
                {isOwner && <TableHead className="text-right">{t.actions}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">{t.noData}</TableCell></TableRow>
              ) : (
                sales.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{fmtDate(s.sale_date)}</TableCell>
                    <TableCell>{s.branches?.name}</TableCell>
                    <TableCell className="font-medium">{s.products?.name}</TableCell>
                    <TableCell>{s.quantity} {s.products?.unit}</TableCell>
                    <TableCell>{money(s.selling_price)}</TableCell>
                    <TableCell>{money(Number(s.selling_price) * Number(s.quantity))}</TableCell>
                    <TableCell className="font-semibold text-success">+{money(s.profit)}</TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(t.confirmDelete)) del.mutate(s.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
