import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { t, formatErrorMessage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  const { role } = useAuth();
  if (role && role.role !== "owner") return <Navigate to="/dashboard" replace />;

  const qc = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ["user-roles-list"],
    queryFn: async () => {
      const { data: roles = [] } = await supabase.from("user_roles").select("id, user_id, role, branch_id").order("created_at");
      const { data: profiles = [] } = await supabase.from("profiles").select("id, full_name, phone");

      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r]));
      const list: any[] = (roles ?? []).map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.id === r.user_id),
      }));

      (profiles ?? []).forEach((p) => {
        if (!roleMap.has(p.id)) {
          list.push({
            id: `new-${p.id}`,
            user_id: p.id,
            role: "manager",
            branch_id: null,
            profile: p,
          });
        }
      });

      return list;
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-all"],
    queryFn: async () => (await supabase.from("branches").select("id, name").order("name")).data ?? [],
  });

  const updateRow = useMutation({
    mutationFn: async (v: { id: string; user_id?: string; role: "owner" | "manager"; branch_id: string | null }) => {
      if (v.id.startsWith("new-") && v.user_id) {
        const { error } = await supabase.from("user_roles").insert({
          user_id: v.user_id,
          role: v.role,
          branch_id: v.branch_id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: v.role, branch_id: v.branch_id })
          .eq("id", v.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t.updated);
      qc.invalidateQueries({ queryKey: ["user-roles-list"] });
    },
    onError: (e: Error) => toast.error(formatErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.users}</h1>
        <p className="text-sm text-muted-foreground">Cunga abakoresha n'amashami bacunga</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abakoresha bose ({rows.length})</CardTitle>
          <p className="text-xs text-muted-foreground">Abakoresha bashya biyandikisha kuri urubuga rw'injira, hanyuma ubaha uruhare rukwiye hano.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.fullName}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.branch}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">{t.noData}</TableCell></TableRow>
              ) : (
                rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.profile?.full_name || "—"}</TableCell>
                    <TableCell>{r.profile?.phone || "—"}</TableCell>
                    <TableCell>
                      <Select value={r.role} onValueChange={(v) => updateRow.mutate({ id: r.id, role: v as any, branch_id: r.branch_id })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">{t.owner}</SelectItem>
                          <SelectItem value="manager">{t.manager}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.branch_id ?? "none"}
                        onValueChange={(v) => updateRow.mutate({ id: r.id, role: r.role, branch_id: v === "none" ? null : v })}
                        disabled={r.role === "owner"}
                      >
                        <SelectTrigger className="w-52"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
