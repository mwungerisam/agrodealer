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
import { t, money, fmtDate, formatErrorMessage, localized } from "@/lib/i18n";
import { useIsOwner, useBranchId, useAuth } from "@/lib/auth-context";
import { SetupBanner } from "@/components/setup-banner";
import { localDateInput } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesPage,
});

type SaleProduct = {
  id: string;
  name: string;
  unit: string;
  selling_price: number;
  category: "ifumbire" | "imbuto";
  buying_price?: number;
};

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
    sale_date: localDateInput(),
  });

  // Default branch for worker
  const defaultBranch = isOwner ? "" : workerBranchId ?? "";

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-active"],
    queryFn: async () =>
      (await supabase.from("branches").select("id, name").eq("status", true).order("name")).data ?? [],
  });

  const { data: products = [] } = useQuery<SaleProduct[]>({
    queryKey: ["products-active", isOwner],
    queryFn: async () => {
      if (isOwner) {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, unit, selling_price, category, buying_price")
          .eq("status", true)
          .order("name");
        if (error) throw error;
        return (data ?? []) as SaleProduct[];
      }
      const { data, error } = await supabase
        .from("products")
        .select("id, name, unit, selling_price, category")
        .eq("status", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedProduct = products.find((p) => p.id === form.product_id);

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
          "id, quantity, selling_price, profit, sale_date, customer_name, products(name, unit), branches(name), created_by",
        )
        .order("sale_date", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  // Auto-calculate total
  const qty = Number(form.quantity) || 0;
  const catalogPrice = Number(selectedProduct?.selling_price) || 0;
  const unitPrice = isOwner ? Number(form.selling_price) || catalogPrice : catalogPrice;
  const lineTotal = qty * unitPrice;
  const availableStock = Number(stock?.quantity ?? 0);

  const canSave = () => {
    if (!form.branch_id) return t.chooseBranch;
    if (!form.product_id) return t.chooseProduct;
    if (qty <= 0) return t.invalidNumber;
    if (!customerName.trim()) return t.customerRequired;
    if (qty > availableStock) return t.noStockEnough;
    return null;
  };

  const save = useMutation({
    mutationFn: async () => {
      const err = canSave();
      if (err) throw new Error(err);

      const cleanCustomerName = customerName.trim();
      const cleanCustomerPhone = customerPhone.trim() || null;
      const { data: matchingCustomers, error: lookupError } = await supabase
        .from("customers")
        .select("id, phone")
        .eq("branch_id", form.branch_id)
        .eq("name", cleanCustomerName)
        .limit(20);
      if (lookupError) throw lookupError;
      const existingCustomer = matchingCustomers?.find((customer) => (customer.phone ?? null) === cleanCustomerPhone);
      let customerId = existingCustomer?.id ?? null;
      if (!customerId) {
        const { data: createdCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({ name: cleanCustomerName, phone: cleanCustomerPhone, branch_id: form.branch_id, created_by: user?.id ?? null })
          .select("id")
          .single();
        if (customerError) throw customerError;
        customerId = createdCustomer.id;
      }

      const { error } = await supabase.from("sales").insert({
        branch_id: form.branch_id,
        product_id: form.product_id,
        quantity: qty,
        selling_price: unitPrice,
        sale_date: form.sale_date,
        customer_id: customerId,
        customer_name: cleanCustomerName,
        customer_phone: cleanCustomerPhone,
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
      sale_date: localDateInput(),
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
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.sales}</h1>
          <p className="text-sm text-muted-foreground">{localized("Andika amakuru y'igurisha ry'ibicuruzwa.", "Record product sales.")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} disabled={branches.length === 0 || products.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> {t.add}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
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
                      <SelectValue />
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
                />
              </div>
              <div className="space-y-2">
                <Label>{t.customerPhone}</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isOwner ? products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.unit}) — {t.buyingPrice}: {money(p.buying_price)}
                      </SelectItem>
                    )) : products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.unit})
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.quantity} *</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.sellingPrice} *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={isOwner ? form.selling_price : catalogPrice.toString()}
                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                    readOnly={!isOwner}
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
                  <div className="flex flex-wrap items-end justify-between gap-3 text-xl font-bold">
                    <span>{money(lineTotal)}</span>
                    {isOwner && <span className="text-green-600">{money((unitPrice - Number(selectedProduct?.buying_price ?? 0)) * qty)}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isOwner ? localized("Inyungu ibarwa hakurikijwe igiciro cyashyizweho n'umuyobozi.", "Profit is calculated from the owner-set catalog price.") : "The total uses the approved selling price."}
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">{t.cancel}</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !!canSave()} className="w-full sm:w-auto">
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
            ? [{ message: localized("Banza wongereho ishami mbere yo kwandika igurisha.", "Add a branch before recording sales."), to: "/branches", label: t.branches }]
            : []),
          ...(products.length === 0
            ? [{ message: localized("Banza wongereho igicuruzwa mbere yo kwandika igurisha.", "Add a product before recording sales."), to: "/products", label: t.products }]
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
                {isOwner && <TableHead>{t.profit}</TableHead>}
                {isOwner && <TableHead>{t.branch}</TableHead>}
                <TableHead className="text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isOwner ? 9 : 7} className="py-10 text-center text-muted-foreground">{t.noData}</TableCell>
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
                    {isOwner && <TableCell className="font-semibold text-green-600">+{money(s.profit)}</TableCell>}
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
