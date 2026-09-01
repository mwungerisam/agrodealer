import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { t, fmtDateTime, numberFmt } from "@/lib/i18n";
import { useIsOwner } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/audit")({
  component: AuditPage,
});

function AuditPage() {
  const isOwner = useIsOwner();
  if (!isOwner) return <Navigate to="/dashboard" replace />;

  const { data: logs = [] } = useQuery({
    queryKey: ["audit-log"],
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("audit_log")
          .select(
            "action, entity, entity_id, branch_id, user_id, created_at, details, branches(name)",
          )
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) return [];
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.audit}</h1>
        <p className="text-sm text-muted-foreground">Review recorded activity by user.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity ({numberFmt(logs.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.actions}</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>{t.branch}</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {t.noData}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: any, i: number) => (
                    <TableRow key={log.id ?? i}>
                      <TableCell className="text-xs">{fmtDateTime(log.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.entity}</TableCell>
                      <TableCell>{log.branches?.name ?? "—"}</TableCell>
                      <TableCell>
                        {log.profiles?.full_name ?? log.user_id?.slice(0, 8) ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
