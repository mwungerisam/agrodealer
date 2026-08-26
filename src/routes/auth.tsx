import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Sprout, Eye, EyeOff, ShieldCheck, UserRound } from "lucide-react";
import { t, formatAuthError } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"owner" | "worker">("owner");
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return toast.error(t.requiredField);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(formatAuthError(error));
    toast.success(t.resetLinkSent);
    setMode("auth");
  };

  useEffect(() => {
    if (user && !authLoading) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return toast.error(t.requiredField);
    if (!password) return toast.error(t.requiredField);

    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    setBusy(false);

    if (error) {
      toast.error(formatAuthError(error));
      return;
    }

    if (data?.session && data.user) {
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
        <div className="mb-4 flex flex-col items-center text-center sm:mb-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg sm:h-14 sm:w-14">
            <Sprout className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t.appName}</h1>
        </div>

        <Card className="shadow-xl">
          {mode === "forgot" ? (
            <>
              <CardHeader>
                <CardTitle>{t.forgotPassword}</CardTitle>
                <CardDescription>
                  {t.sendResetLink}: {t.email} yawe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={sendReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fp-email">{t.email}</Label>
                    <Input
                      id="fp-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.sendResetLink}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("auth")}
                  >
                    {t.backToAuth}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>
                  {tab === "owner" ? t.ownerLogin : t.workerLogin}
                </CardTitle>
                <CardDescription>
                  {tab === "owner" ? t.ownerLoginDesc : t.workerLoginDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={tab}
                  onValueChange={(v) => setTab(v as "owner" | "worker")}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="owner" className="gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      {t.owner}
                    </TabsTrigger>
                    <TabsTrigger value="worker" className="gap-1.5">
                      <UserRound className="h-4 w-4" />
                      {t.worker}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="owner">
                    <form onSubmit={signIn} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="in-email">{t.email}</Label>
                        <Input
                          id="in-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="in-pw">{t.password}</Label>
                        <div className="relative">
                          <Input
                            id="in-pw"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setMode("forgot")}
                            className="text-sm text-primary hover:underline"
                          >
                            {t.forgotPassword}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={busy}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t.signIn}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="worker">
                    <form onSubmit={signIn} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="worker-email">{t.email}</Label>
                        <Input
                          id="worker-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="worker-pw">{t.password}</Label>
                        <div className="relative">
                          <Input
                            id="worker-pw"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                            aria-label={showPassword ? "Hisha ijambo ry'ibanga" : "Erekana ijambo ry'ibanga"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setMode("forgot")}
                            className="text-sm text-primary hover:underline"
                          >
                            {t.forgotPassword}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={busy}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t.workerLogin}
                      </Button>
                    </form>
                  </TabsContent>

                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground sm:mt-6">
          © {new Date().getFullYear()} UFBC Agrodealer
        </p>
      </div>
    </div>
  );
}
