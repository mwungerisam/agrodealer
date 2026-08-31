import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Sprout, Eye, EyeOff, ShieldCheck, UserRound, BarChart3, Boxes, Store } from "lucide-react";
import { t, formatAuthError } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { user, loading: authLoading, unavailable } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"owner" | "worker">("owner");
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && !authLoading) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return toast.error(t.requiredField);
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setBusy(false);
    if (error) return toast.error(formatAuthError(error));
    if (data?.session && data.user) {
      const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
      const expectsOwner = tab === "owner";
      if ((expectsOwner && userRole?.role !== "owner") || (!expectsOwner && userRole?.role === "owner")) {
        await supabase.auth.signOut();
        toast.error(t.wrongPortal);
        return;
      }
      toast.success(t.welcome);
      navigate({ to: "/dashboard", replace: true });
    }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return toast.error(t.requiredField);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return toast.error(formatAuthError(error));
    toast.success(t.resetLinkSent);
    setMode("auth");
  };

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />

      <section className="relative hidden flex-1 overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, currentColor 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative max-w-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Sprout className="h-6 w-6" /></div>
            <div><p className="font-extrabold tracking-wide">UFBC AGRODEALER</p><p className="text-xs text-sidebar-foreground/55">Agricultural business management</p></div>
          </div>
          <div className="mt-24">
            <p className="text-sm font-semibold text-sidebar-primary">RUN YOUR AGRO BUSINESS BETTER</p>
            <h1 className="mt-3 text-5xl font-extrabold leading-[1.05] tracking-tight">Everything your agro-dealer needs, in one place.</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-sidebar-foreground/65">Manage inventory, purchases, sales, branches, customers and performance without losing track of the numbers.</p>
          </div>
        </div>
        <div className="relative grid max-w-xl grid-cols-3 gap-3">
          {[{ icon: Boxes, label: "Inventory" }, { icon: BarChart3, label: "Reports" }, { icon: Store, label: "Branches" }].map((item) => (
            <div key={item.label} className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-4 backdrop-blur-sm">
              <item.icon className="h-5 w-5 text-sidebar-primary" />
              <p className="mt-3 text-xs font-semibold">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative flex w-full items-center justify-center p-4 sm:p-8 lg:max-w-[560px] lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sprout className="h-5 w-5" /></div>
            <div><p className="text-sm font-extrabold tracking-wide">UFBC AGRODEALER</p><p className="text-[11px] text-muted-foreground">Agricultural business management</p></div>
          </div>

          {unavailable && <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">The service is currently unavailable. Check your internet connection and try again.</div>}

          <Card className="overflow-hidden border shadow-lg shadow-black/5">
            {mode === "forgot" ? (
              <>
                <CardHeader className="border-b bg-muted/20 pb-5"><CardTitle className="text-xl">{t.forgotPassword}</CardTitle><CardDescription>{t.resetLinkDescription}</CardDescription></CardHeader>
                <CardContent className="p-6 sm:p-7">
                  <form onSubmit={sendReset} className="space-y-5">
                    <div className="space-y-2"><Label htmlFor="fp-email">{t.email}</Label><Input id="fp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                    <Button type="submit" className="h-10 w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t.sendResetLink}</Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("auth")}>{t.backToAuth}</Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="border-b bg-muted/20 pb-5"><CardTitle className="text-xl">Welcome back</CardTitle><CardDescription>{tab === "owner" ? t.ownerLoginDesc : t.workerLoginDesc}</CardDescription></CardHeader>
                <CardContent className="p-6 sm:p-7">
                  <Tabs value={tab} onValueChange={(v) => setTab(v as "owner" | "worker")}>
                    <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted p-1">
                      <TabsTrigger value="owner" className="rounded-lg gap-1.5"><ShieldCheck className="h-4 w-4" />{t.owner}</TabsTrigger>
                      <TabsTrigger value="worker" className="rounded-lg gap-1.5"><UserRound className="h-4 w-4" />{t.worker}</TabsTrigger>
                    </TabsList>
                    {(["owner", "worker"] as const).map((portal) => (
                      <TabsContent key={portal} value={portal}>
                        <form onSubmit={signIn} className="space-y-5 pt-5">
                          <div className="space-y-2"><Label htmlFor={`${portal}-email`}>{t.email}</Label><Input id={`${portal}-email`} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                          <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor={`${portal}-pw`}>{t.password}</Label><button type="button" onClick={() => setMode("forgot")} className="text-xs font-semibold text-primary hover:underline">{t.forgotPassword}</button></div>
                            <div className="relative"><Input id={`${portal}-pw`} type={showPassword ? "text" : "password"} autoComplete="current-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 pr-10" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                          </div>
                          <Button type="submit" className="h-10 w-full font-semibold" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{portal === "owner" ? t.signIn : t.workerLogin}</Button>
                        </form>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </>
            )}
          </Card>
          <p className="mt-5 text-center text-[11px] text-muted-foreground">© {new Date().getFullYear()} UFBC Agrodealer · Secure business workspace</p>
        </div>
      </section>
    </main>
  );
}
