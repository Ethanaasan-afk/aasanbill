"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type { Supplier } from "@/lib/types";
import { useOrgAccess } from "@/hooks/use-org-access";
import { checkPlanCapability, planLimitErrorMessage } from "@/lib/billing/limits";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSuppliers(activeOnly = false) {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["suppliers"],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      if (isDemoMode()) return demoDb.getSuppliers();
      const supabase = createClient();
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Supplier[];
    },
    select: (rows) => (activeOnly ? rows.filter((s) => s.is_active) : rows),
  });
}

export function useSupplierMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate, assertCapability } = useOrgAccess();

  const upsert = useMutation({
    mutationFn: async (payload: Partial<Supplier> & { name: string }) => {
      if (!payload.id) {
        assertCanCreate();
        if (isDemoMode()) assertCapability("purchasesCreditNotes");
      }
      if (isDemoMode()) return demoDb.upsertSupplier(payload);
      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      if (!payload.id) {
        const cap = await checkPlanCapability(supabase, orgId, "purchasesCreditNotes");
        if (!cap.ok) throw new Error(planLimitErrorMessage(cap));
      }
      if (payload.id) {
        const rest = { ...payload } as Record<string, unknown>;
        delete rest.id;
        delete rest.created_at;
        delete rest.organization_id;
        const { data, error } = await supabase
          .from("suppliers")
          .update(rest)
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;
        return data as Supplier;
      }
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          name: payload.name,
          phone: payload.phone || null,
          email: payload.email || null,
          gstin: payload.gstin || null,
          address: payload.address || null,
          state: payload.state || "Gujarat",
          notes: payload.notes || null,
          is_active: payload.is_active ?? true,
          organization_id: orgId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) return demoDb.removeSupplier(id);
      const supabase = createClient();
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  return { upsert, remove };
}
