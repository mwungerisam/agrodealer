import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, Trash2, ShoppingCart, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { t, money, fmtDate, formatErrorMessage } from "@/lib/i18n";
import { useIsOwner, useBranchId, useAuth } from "@/lib/auth-context";
import { SetupBanner } from "@/components/setup-banner";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesPage,
});

function SalesPage() {
  const { user } = useAuth();
  const isOwner = useIsOwner();
  const workerBranchId = useBranchId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [form, setForm] = useState({
    branch_id: "",
    product_id: "",
    quantity: "",
    selling_price: "",
    sale_date: new Date().toISOString().slice(0, 10),
  });

  // Default branch for worker
  const defaultBranch = isOwner ? "" : workerBranchId ?? "";

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-active"],
    queryFn: async () =>
      (await supabase.from("branches").select("id, name").eq("status", true).order("name")).data ?? [],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () =>
      (await supabase
        .from("products")
        .select("id, name, unit, selling_price, category, buying_price")
        .eq("status", true)
        .order("name")).data ?? [],
  });

  const selectedProduct = products.find((p: any) => p.id === form.product_id);

  const { data: stock } = useQuery({
    queryKey: ["stock-for-sale", form.branch_id, form.product_id],
    enabled: !!form.branch_id && !!form.product_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory")
        .select("quantity")
        .eq("branch_id", form.branch_id)
        .eq("product_id", form.product_id)
        .maybeSingle();
      return data ?? { quantity: 0 };
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select(
          "id, quantity, selling_price, profit, sale_date, products(name, unit), branches(name), created_by",
        )
        .order("sale_date", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  // Auto-calculate total
  const qty = Number(form.quantity) || 0;
  const unitPrice = Number(form.selling_price) || Number(selectedProduct?.selling_price) || 0;
  const lineTotal = qty * unitPrice;
  const availableStock = Number(stock?.quantity ?? 0);

  const canSave = () => {
    if (!form.branch_id) return t.chooseBranch;
    if (!form.product_id) return t.chooseProduct;
    if (qty <= 0) return t.invalidNumber;
    if (qty > availableStock) return t.noStockEnough;
    return null;
  };

  const save = useMutation({
    mutationFn: async () => {
      const err = canSave();
      if (err) throw new Error(err);

      const { error } = await supabase.from("sales").insert({
        branch_id: form.branch_id,
        product_id: form.product_id,
        quantity: qty,
        selling_price: unitPrice,
        sale_date: form.sale_date,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.saved);
      qc.invalidateQueries({ queryKey: ["sales-list"] });
      qc.invalidateQueries({ queryKey: ["inventory-list"] });
      qc.invalidateQueries({ queryKey: ["stock-for-sale"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-sales"] });
      setOpen(false);
      setForm({ ...form, product_id: "", quantity: "", selling_price: "" });
      setCustomerName("");
      setCustomerPhone("");
    },
    onError: (e: Error) => {
      toast.error(formatErrorMessage(e));
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.deleted);
      qc.invalidateQueries({ queryKey: ["sales-list"] });
    },
    onError: (e: Error) => toast.error(formatErrorMessage(e)),
  });

  const resetForm = () => {
    const fb = isOwner ? "" : (workerBranchId ?? "");
    setForm({
      branch_id: fb,
      product_id: "",
      quantity: "",
      selling_price: "",
      sale_date: new Date().toISOString().slice(0, 10),
    });
    setCustomerName("");
    setCustomerPhone("");
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t.sales}</h1>
          <p className="text-sm text-muted-foreground">Andika igurisha cya bicuruzwa</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={branches.length === 0 || products.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> {t.add}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.add} {t.sales}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Branch selection (owner only) */}
              {isOwner && (
                <div className="space-y-2">
                  <Label>{t.branch} *</Label>
                  <Select
                    value={form.branch_id}
                    onValueChange={(v) => setForm({ ...form, branch_id: v, product_id: "", quantity: "", selling_price: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.chooseBranch} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Customer info */}
              <div className="space-y-2">
                <Label>{t.customerName} *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nshya cyangwa uhiliye"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.customerPhone}</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                />
              </div>

              {/* Product selection */}
              <div className="space-y-2">
                <Label>{t.product} *</Label>
                <Select
                  value={form.product_id}
                  onValueChange={(v) => {
                    const p: any = products.find((x: any) => x.id === v);
                    setForm({
                      ...form,
                      product_id: v,
                      selling_price: p?.selling_price?.toString() ?? "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.chooseProduct} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.unit}) — {t.buyingPrice}: {money(p.buying_price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.branch_id && form.product_id && (
                  <p className="text-xs text-muted-foreground">
                    {t.currentStock}: <strong>{numberFmtSafe(stock?.quantity ?? 0)}</strong> {selectedProduct?.unit ?? ""}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.quantity} *</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.sellingPrice} *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.selling_price}
                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                    placeholder={selectedProduct ? money(selectedProduct.selling_price) : ""}
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>{t.saleDate}</Label>
                <Input
                  type="date"
                  value={form.sale_date}
                  onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
                />
              </div>

              {/* Auto-calculated summary */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base">{t.totalAmount}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xl font-bold">
                    <span>{money(lineTotal)}</span>
                    <span className="text-green-600">{money((unitPrice - Number(selectedProduct?.buying_price ?? 0)) * qty)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Inyungu ikingira ku igiciro cyo kugura (igishoramwe)
                  </p>
                </CardContent>
              </Card>

              {/* Stock warning */}
              {qty > availableStock && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {t.noStockEnough} — Hari {numberFmtSafe(availableStock)} {selectedProduct?.unit ?? ""} ariko wifuza {numberFmtSafe(qty)} {selectedProduct?.unit ?? ""}.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !!canSave()}>
                {save.isPending && <span className="mr-2 animate-spin">↻</span>}
                EMEZA IGURISHA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <SetupBanner
        steps={[
          ...(branches.length === 0
            ? [{ message: "Banza wongereho ishami muri Amashami mbere yo kugurisha.", to: "/branches", label: t.branches }]
            : []),
          ...(products.length === 0
            ? [{ message: "Banza wongereho igicuruzwa muri Ibicuruzwa mbire yo kugurisha.", to: "/products", label: t.products }]
            : []),
        ]}
      />

      <Card>
        <CardHeader />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.product}</TableHead>
                <TableHead>{t.customer}</TableHead>
                <TableHead>{t.quantity}</TableHead>
                <TableHead>{t.sellingPrice}</TableHead>
                <TableHead>{t.total}</TableHead>
                <TableHead>{t.profit}</TableHead>
                {isOwner && <TableHead>{t.branch}</TableHead>}
                <TableHead className="text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">{t.noData}</TableCell>
                </TableRow>
              ) : (
                sales.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{fmtDate(s.sale_date)}</TableCell>
                    <TableCell className="font-medium">{s.products?.name}</TableCell>
                    <TableCell>{s.customer_name ?? "—"}</TableCell>
                    <TableCell>{s.quantity} {s.products?.unit}</TableCell>
                    <TableCell>{money(s.selling_price)}</TableCell>
                    <TableCell>{money(Number(s.selling_price) * Number(s.quantity))}</TableCell>
                    <TableCell className="font-semibold text-green-600">+{money(s.profit)}</TableCell>
                    {isOwner && <TableCell>{s.branches?.name}</TableCell>}
                    <TableCell className="text-right">
                      {isOwner && (
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(t.confirmDelete)) del.mutate(s.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
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

function numberFmtSafe(n: number | string | null | undefined): string {
  return Number(n ?? 0).toLocaleString("en-US");
}
