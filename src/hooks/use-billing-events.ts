"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/client";
import type { BillingEvent } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export function useBillingEvents() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["billing_events", user?.organization_id ?? ""],
    enabled: !loading && !!user?.organization_id && !isDemoMode(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("billing_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as BillingEvent[];
    },
  });
}
