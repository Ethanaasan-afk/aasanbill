"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      if (isDemoMode()) return demoDb.getCustomers();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

export function useCustomerMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate } = useOrgAccess();

  const upsert = useMutation({
    mutationFn: async (
      payload: Partial<Customer> & { name: string; state: string; customer_type: "b2b" | "b2c" }
    ) => {
      if (!payload.id) assertCanCreate();
      if (isDemoMode()) return demoDb.upsertCustomer(payload);

      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const clean = {
        ...payload,
        email: payload.email || null,
        phone: payload.phone || null,
        gstin: payload.gstin || null,
        billing_address: payload.billing_address || null,
      };
      if (payload.id) {
        const rest = { ...clean } as Record<string, unknown>;
        delete rest.id;
        delete rest.created_at;
        delete rest.organization_id;
        const { data, error } = await supabase
          .from("customers")
          .update(rest)
          .eq("id", payload.id)
          .select()
          .single();
        if (error) throw error;
        return data as Customer;
      }
      const insertRow = { ...clean } as Record<string, unknown>;
      delete insertRow.id;
      delete insertRow.created_at;
      insertRow.organization_id = orgId;
      const { data, error } = await supabase.from("customers").insert(insertRow).select().single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        demoDb.deleteCustomer(id);
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  return { upsert, remove };
}
