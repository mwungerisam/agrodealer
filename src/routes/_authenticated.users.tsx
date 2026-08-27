import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { t, formatErrorMessage, localized } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  const { role } = useAuth();
  if (role && role.role !== "owner") return <Navigate to="/dashboard" replace />;

  const qc = useQueryClient();
  const [removing, setRemoving] = useState<any | null>(null);
  const [adding, setAdding] = useState(false);
  const [worker, setWorker] = useState({ fullName: "", email: "", phone: "", branchId: "", initialPassword: "" });

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

  const removeWorker = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase.rpc as any)("delete_worker", { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.workerRemoved);
      setRemoving(null);
      qc.invalidateQueries({ queryKey: ["user-roles-list"] });
    },
    onError: (error: Error) => toast.error(formatErrorMessage(error)),
  });

  const inviteWorker = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("create-worker", { body: worker });
      if (error) {
        // Edge Functions return their useful validation/authentication message in
        // the response body; surface it instead of a generic HTTP-status toast.
        const response = (error as { context?: Response }).context;
        if (response) {
          const payload = await response.json().catch(() => null) as { error?: string } | null;
          if (payload?.error) throw new Error(payload.error);
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success(t.workerCreated);
      setWorker({ fullName: "", email: "", phone: "", branchId: "", initialPassword: "" });
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["user-roles-list"] });
    },
    onError: (error: Error) => toast.error(formatErrorMessage(error)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
        <h1 className="text-3xl font-bold">{t.users}</h1>
        <p className="text-sm text-muted-foreground">{localized("Cunga abakoresha, inshingano zabo n'amashami bakoreramo.", "Manage users, their roles, and their branch assignments.")}</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus className="mr-2 h-4 w-4" />{t.addWorker}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{localized(`Abakoresha bose (${rows.length})`, `All users (${rows.length})`)}</CardTitle>
          <p className="text-xs text-muted-foreground">{localized("Umuyobozi ni we ushyiraho konti z'abakozi kandi akabagenera uruhare n'ishami.", "The owner creates worker accounts and assigns their role and branch.")}</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.fullName}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.branch}</TableHead>
                <TableHead className="w-16 text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t.noData}</TableCell></TableRow>
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
                    <TableCell className="text-right">
                      {r.role === "manager" && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setRemoving(r)} aria-label={t.removeWorker}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.createWorker}</DialogTitle><DialogDescription>{t.workerCreationDesc}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label htmlFor="worker-name">{t.fullName}</Label><Input id="worker-name" value={worker.fullName} onChange={(e) => setWorker({ ...worker, fullName: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="worker-email">{t.email}</Label><Input id="worker-email" type="email" value={worker.email} onChange={(e) => setWorker({ ...worker, email: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="worker-phone">{t.phone}</Label><Input id="worker-phone" value={worker.phone} onChange={(e) => setWorker({ ...worker, phone: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="worker-password">{t.initialPassword}</Label><Input id="worker-password" type="password" minLength={8} value={worker.initialPassword} onChange={(e) => setWorker({ ...worker, initialPassword: e.target.value })} /></div>
            <div className="space-y-1"><Label>{t.branch}</Label><Select value={worker.branchId} onValueChange={(branchId) => setWorker({ ...worker, branchId })}><SelectTrigger><SelectValue placeholder={t.chooseBranch} /></SelectTrigger><SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button onClick={() => inviteWorker.mutate()} disabled={!worker.fullName || !worker.email || !worker.branchId || worker.initialPassword.length < 8 || inviteWorker.isPending}>{inviteWorker.isPending ? t.loading : t.createWorker}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.removeWorkerTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.removeWorkerDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removing && removeWorker.mutate(removing.user_id)}>
              {removeWorker.isPending ? t.loading : t.removeWorker}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
