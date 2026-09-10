"use client";

import { DEMO_ADMIN, isDemoMode } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AuthContextValue {
  user: AppUser | null;
  /** Auth session exists but no usable public.users profile / org link. */
  unlinked: boolean;
  sessionEmail: string | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("YOUR_PROJECT") &&
      key !== "your-anon-key" &&
      url.startsWith("http")
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [unlinked, setUnlinked] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const demo = isDemoMode();
  const configured = !demo && hasSupabaseEnv();
  const supabase = useMemo(() => (configured ? createClient() : null), [configured]);

  const refresh = useCallback(async () => {
    if (demo) {
      setUser(DEMO_ADMIN);
      setUnlinked(false);
      setSessionEmail(DEMO_ADMIN.full_name ? "demo@local" : null);
      setLoading(false);
      return;
    }

    if (!supabase) {
      setUser(null);
      setUnlinked(false);
      setSessionEmail(null);
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await Promise.race([
        supabase.auth.getUser(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Auth timed out")), 8000)
        ),
      ]);

      console.log("[auth] session user.id:", authUser?.id ?? null, "email:", authUser?.email ?? null);
      if (authError) console.error("[auth] getUser error:", authError);

      if (!authUser) {
        setUser(null);
        setUnlinked(false);
        setSessionEmail(null);
        return;
      }

      setSessionEmail(authUser.email ?? null);

      const profileQuery = supabase
        .from("users")
        .select("id, full_name, role, created_at, organization_id, has_seen_onboarding")
        .eq("id", authUser.id)
        .maybeSingle();

      let { data, error } = await Promise.race([
        profileQuery,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Profile query timed out")), 8000)
        ),
      ]);

      // Column may be missing until migration 023 is applied
      if (error?.message?.includes("has_seen_onboarding")) {
        const fallback = await supabase
          .from("users")
          .select("id, full_name, role, created_at, organization_id")
          .eq("id", authUser.id)
          .maybeSingle();
        data = fallback.data as typeof data;
        error = fallback.error;
      }

      console.log("[auth] public.users query result:", data);
      if (error) console.error("[auth] public.users query error:", error);

      const profile = (data as AppUser | null) ?? null;
      if (profile?.organization_id) {
        setUser(profile);
        setUnlinked(false);
      } else {
        setUser(null);
        setUnlinked(true);
      }
    } catch (err) {
      console.error("[auth] refresh failed:", err);
      setUser(null);
      setUnlinked(false);
      setSessionEmail(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, demo]);

  useEffect(() => {
    refresh();
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.log("[auth] onAuthStateChange:", event);
      void refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh, supabase]);

  const signOut = async () => {
    if (demo) {
      window.location.href = "/";
      return;
    }
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setUnlinked(false);
    setSessionEmail(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        unlinked,
        sessionEmail,
        loading,
        isAdmin: user?.role === "admin",
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
