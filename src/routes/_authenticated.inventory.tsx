import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { t, fmtDate } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { role } = useAuth();
  const isOwner = role?.role === "owner";
  const branchFilter = role?.branch_id;

  const { data: stock = [] } = useQuery({
    queryKey: ["inventory-list", branchFilter, isOwner],
    queryFn: async () => {
      let q = supabase.from("inventory").select("quantity, updated_at, products(name, unit, category), branches(name)");
      if (!isOwner && branchFilter) q = q.eq("branch_id", branchFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["movements", branchFilter, isOwner],
    queryFn: async () => {
      let q = supabase.from("inventory_movements").select("id, type, quantity, created_at, ref_type, products(name, unit), branches(name)").order("created_at", { ascending: false }).limit(50);
      if (!isOwner && branchFilter) q = q.eq("branch_id", branchFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.inventory}</h1>
        <p className="text-sm text-muted-foreground">Reba ububiko n'ibyagiye byinjira n'ibyagiye bisohoka</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t.currentStock}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.product}</TableHead>
                <TableHead>{t.category}</TableHead>
                {isOwner && <TableHead>{t.branch}</TableHead>}
                <TableHead>{t.quantity}</TableHead>
                <TableHead>{t.unit}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t.noData}</TableCell></TableRow>
              ) : (
                stock.map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.products?.name}</TableCell>
                    <TableCell>{s.products?.category === "ifumbire" ? t.ifumbire : t.imbuto}</TableCell>
                    {isOwner && <TableCell>{s.branches?.name}</TableCell>}
                    <TableCell>
                      <span className={`font-semibold ${Number(s.quantity) < 10 ? "text-warning" : ""}`}>{Number(s.quantity)}</span>
                    </TableCell>
                    <TableCell>{s.products?.unit}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ibyagiye byinjira n'ibisohoka</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.product}</TableHead>
                {isOwner && <TableHead>{t.branch}</TableHead>}
                <TableHead>Ubwoko</TableHead>
                <TableHead>{t.quantity}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t.noData}</TableCell></TableRow>
              ) : (
                movements.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{fmtDate(m.created_at)}</TableCell>
                    <TableCell className="font-medium">{m.products?.name}</TableCell>
                    {isOwner && <TableCell>{m.branches?.name}</TableCell>}
                    <TableCell>
                      {m.type === "in" ? (
                        <span className="inline-flex items-center gap-1 text-success"><ArrowDownRight className="h-4 w-4" /> Yinjiye</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive"><ArrowUpRight className="h-4 w-4" /> Yasohotse</span>
                      )}
                    </TableCell>
                    <TableCell>{m.quantity} {m.products?.unit}</TableCell>
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
