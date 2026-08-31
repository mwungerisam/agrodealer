import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface UserRoleInfo {
  role: AppRole | null;
  branch_id: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: UserRoleInfo | null;
  loading: boolean;
  unavailable: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRoleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const loadRole = async (uid: string) => {
    try {
      let { data } = await supabase
        .from("user_roles")
        .select("role, branch_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (!data) {
        try {
          await (supabase.rpc as any)("ensure_user_role");
          const { data: retry } = await supabase
            .from("user_roles")
            .select("role, branch_id")
            .eq("user_id", uid)
            .maybeSingle();
          data = retry ?? null;
        } catch {
          // Fallback if the role helper is unavailable
        }
      }


      setRole(
        data
          ? { role: data.role as AppRole, branch_id: data.branch_id }
          : { role: null, branch_id: null },
      );
    } catch {
      setRole({ role: null, branch_id: null });
    }
  };

  useEffect(() => {
    let active = true;
    const startupTimeout = window.setTimeout(() => {
      if (!active) return;
      setUnavailable(true);
      setLoading(false);
    }, 12_000);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      setUnavailable(false);
      if (s?.user) {
        setTimeout(() => loadRole(s.user.id), 0);
      } else {
        setRole(null);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          loadRole(data.session.user.id).finally(() => active && setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (!active) return;
        setUnavailable(true);
        setLoading(false);
      })
      .finally(() => window.clearTimeout(startupTimeout));

    return () => {
      active = false;
      window.clearTimeout(startupTimeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        role,
        loading,
        unavailable,
        refreshRole: async () => {
          if (user) await loadRole(user.id);
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

/** Helper: true when the logged-in user is the business owner. */
export function useIsOwner(): boolean {
  const { role } = useAuth();
  return role?.role === "owner";
}

/** Helper: returns the worker's branch id (null for owner). */
export function useBranchId(): string | null {
  const { role } = useAuth();
  if (role?.role === "owner") return null;
  return role?.branch_id ?? null;
}

/** Helper: true when the user is an owner OR has a branch assignment. */
export function useCanOperate(): boolean {
  const { role, loading } = useAuth();
  if (loading) return false;
  return role?.role === "owner" || (!!role?.branch_id && !!role?.role);
}
