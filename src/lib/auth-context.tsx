import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  const lastKnownSessionRef = useRef<Session | null>(null);

  const loadRole = async (uid: string) => {
    try {
      let record: { role: AppRole; branch_id: string | null } | null = null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role, branch_id")
        .eq("user_id", uid)
        .limit(1);

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      record = data?.[0] ?? null;

      if (!record) {
        setRole(null);
        setUnavailable(true);
        return;
      }

      setRole(
        { role: record.role as AppRole, branch_id: record.branch_id },
      );
      setUnavailable(false);
    } catch {
      setRole({ role: null, branch_id: null });
      setUnavailable(true);
    }
  };

  useEffect(() => {
    let active = true;
    const startupTimeout = window.setTimeout(() => {
      if (!active) return;
      setUnavailable(true);
      setLoading(false);
    }, 12_000);

    const applySession = (nextSession: Session | null) => {
      if (!active) return;

      if (!nextSession?.user) {
        if (lastKnownSessionRef.current?.user) {
          return;
        }

        lastKnownSessionRef.current = null;
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      lastKnownSessionRef.current = nextSession;
      setSession(nextSession);
      setUser(nextSession.user);
      setUnavailable(false);
      setLoading(true);

      void loadRole(nextSession.user.id).finally(() => {
        if (active) setLoading(false);
      });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        lastKnownSessionRef.current = null;
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      if (!s?.user) {
        lastKnownSessionRef.current = null;
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      applySession(s);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        applySession(data.session);
      })
      .catch(() => {
        if (!active) return;
        setUnavailable(true);
        setSession(null);
        setUser(null);
        setRole(null);
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
