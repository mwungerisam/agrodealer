import { createFileRoute, Navigate } from "@tanstack/react-router";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { t, money, formatErrorMessage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
});

interface Product {
  id: string;
  name: string;
  category: "ifumbire" | "imbuto";
  buying_price: number;
  selling_price: number;
  unit: string;
  status: boolean;
}

type Form = {
  name: string;
  category: "ifumbire" | "imbuto";
  buying_price: number;
  selling_price: number;
  unit: string;
  status: boolean;
};
const empty: Form = {
  name: "",
  category: "ifumbire",
  buying_price: 0,
  selling_price: 0,
  unit: "kg",
  status: true,
};

function ProductsPage() {
  const { role } = useAuth();
  if (role && role.role !== "owner") return <Navigate to="/dashboard" replace />;

  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, buying_price, selling_price, unit, status")
        .order("name");
      return (data ?? []) as Product[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error(t.requiredField);
      if (form.buying_price < 0 || form.selling_price < 0) throw new Error(t.invalidNumber);
      const payload = {
        name: form.name.trim(),
        category: form.category,
        buying_price: Number(form.buying_price),
        selling_price: Number(form.selling_price),
        unit: form.unit.trim() || "kg",
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? t.updated : t.saved);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(formatErrorMessage(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.deleted);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
    },
    onError: (e: Error) => toast.error(formatErrorMessage(e)),
  });

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (cat === "all" || p.category === cat),
  );

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      buying_price: p.buying_price,
      selling_price: p.selling_price,
      unit: p.unit,
      status: p.status,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t.products}</h1>
          <p className="text-sm text-muted-foreground">Cunga ibicuruzwa byawe</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> {t.add}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? t.edit : t.add} {t.product}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>{t.name} *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t.category} *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ifumbire">{t.ifumbire}</SelectItem>
                    <SelectItem value="imbuto">{t.imbuto}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.unit}</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, sac, kilo" />
              </div>
              <div className="space-y-2">
                <Label>{t.buyingPrice} *</Label>
                <Input type="number" min={0} value={form.buying_price} onChange={(e) => setForm({ ...form, buying_price: +e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t.sellingPrice} *</Label>
                <Input type="number" min={0} value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: +e.target.value })} />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={form.status} onCheckedChange={(v) => setForm({ ...form, status: v })} />
                <Label>{form.status ? t.active : t.inactive}</Label>
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
        <CardHeader className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Byose</SelectItem>
              <SelectItem value="ifumbire">{t.ifumbire}</SelectItem>
              <SelectItem value="imbuto">{t.imbuto}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.category}</TableHead>
                <TableHead>{t.unit}</TableHead>
                <TableHead>{t.buyingPrice}</TableHead>
                <TableHead>{t.sellingPrice}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{t.noData}</TableCell></TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><span className="capitalize">{p.category === "ifumbire" ? t.ifumbire : t.imbuto}</span></TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell>{money(p.buying_price)}</TableCell>
                    <TableCell>{money(p.selling_price)}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.status ? "bg-green-100/50 text-green-800" : "bg-red-100/50 text-red-800"}`}>
                        {p.status ? t.active : t.inactive}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm(t.confirmDelete)) del.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
