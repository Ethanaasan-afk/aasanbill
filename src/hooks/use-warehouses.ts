"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type { Warehouse } from "@/lib/types";
import { useOrgAccess } from "@/hooks/use-org-access";
import { checkCanCreateWarehouse, planLimitErrorMessage } from "@/lib/billing/limits";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useWarehouses(activeOnly = false) {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["warehouses"],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      if (isDemoMode()) return demoDb.getWarehouses();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Warehouse[];
    },
    select: (rows) => (activeOnly ? rows.filter((w) => w.is_active) : rows),
  });
}

export function useWarehouseMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate, assertCapability } = useOrgAccess();

  const upsert = useMutation({
    mutationFn: async (payload: Partial<Warehouse> & { name: string; code: string }) => {
      if (!payload.id) assertCanCreate();
      if (isDemoMode()) {
        if (!payload.id) {
          const existing = demoDb.getWarehouses();
          if (existing.length >= 1) assertCapability("multiWarehouse");
        }
        return demoDb.upsertWarehouse(payload);
      }
      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      if (!payload.id) {
        const allowed = await checkCanCreateWarehouse(supabase, orgId);
        if (!allowed.ok) throw new Error(planLimitErrorMessage(allowed));
      }
      if (payload.is_default) {
        const { error: clearErr } = await supabase
          .from("warehouses")
          .update({ is_default: false })
          .neq("id", payload.id ?? "00000000-0000-0000-0000-000000000000");
        if (clearErr) throw clearErr;
      }
      if (payload.id) {
        const rest = { ...payload } as Record<string, unknown>;
        delete rest.id;
        delete rest.created_at;
        delete rest.organization_id;
        const { data, error } = await supabase
          .from("warehouses")
          .update(rest)
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;
        return data as Warehouse;
      }
      const { data, error } = await supabase
        .from("warehouses")
        .insert({
          name: payload.name,
          code: payload.code,
          address: payload.address ?? null,
          is_default: payload.is_default ?? false,
          is_active: payload.is_active ?? true,
          organization_id: orgId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Warehouse;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["warehouses"] }),
  });

  return { upsert };
}
