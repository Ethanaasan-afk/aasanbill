"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type { BusinessDataCategory, PaymentMode } from "@/lib/constants";
import type { BusinessDataEntry } from "@/lib/types";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

function mapEntry(row: BusinessDataEntry): BusinessDataEntry {
  return { ...row, amount: Number(row.amount) };
}

export type BusinessDataSection = "product_costs" | "other_expenses";

export function useBusinessDataEntries(
  section: BusinessDataSection,
  from?: string,
  to?: string
) {
  return useQuery({
    queryKey: ["business_data_entries", section, from ?? "", to ?? ""],
    queryFn: async () => {
      if (isDemoMode()) {
        return demoDb.getBusinessDataEntries({ section, from, to });
      }
      const supabase = createClient();
      let q = supabase
        .from("business_data_entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (section === "product_costs") {
        q = q.eq("category", "product_purchase");
      } else {
        q = q.neq("category", "product_purchase");
      }
      if (from) q = q.gte("entry_date", from);
      if (to) q = q.lte("entry_date", to);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => mapEntry(r as BusinessDataEntry));
    },
  });
}

export type BusinessDataPayload = {
  company_person_name: string;
  category: BusinessDataCategory;
  item_name: string;
  expense_name: string;
  payment_method: PaymentMode;
  amount: number;
  note?: string | null;
  entry_date: string;
  created_by: string;
};

export function useBusinessDataMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate } = useOrgAccess();

  const add = useMutation({
    mutationFn: async (input: BusinessDataPayload) => {
      assertCanCreate();
      if (isDemoMode()) return demoDb.addBusinessDataEntry(input);
      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("business_data_entries")
        .insert({
          company_person_name: input.company_person_name.trim(),
          category: input.category,
          item_name: input.item_name.trim(),
          expense_name: input.expense_name.trim(),
          payment_method: input.payment_method,
          amount: input.amount,
          note: input.note?.trim() || null,
          entry_date: input.entry_date,
          created_by: input.created_by,
          organization_id: orgId,
        })
        .select()
        .single();
      if (error) throw error;
      return mapEntry(data as BusinessDataEntry);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["business_data_entries"] }),
  });

  const update = useMutation({
    mutationFn: async (
      payload: Partial<BusinessDataEntry> & { id: string }
    ) => {
      if (isDemoMode()) return demoDb.updateBusinessDataEntry(payload);
      const supabase = createClient();
      const rest = { ...payload } as Record<string, unknown>;
      delete rest.id;
      delete rest.created_at;
      delete rest.created_by;
      const clean: Record<string, unknown> = { ...rest };
      if (typeof rest.company_person_name === "string") {
        clean.company_person_name = rest.company_person_name.trim();
      }
      if (typeof rest.item_name === "string") clean.item_name = rest.item_name.trim();
      if (typeof rest.expense_name === "string") {
        clean.expense_name = rest.expense_name.trim();
      }
      if (rest.note !== undefined) {
        clean.note = typeof rest.note === "string" ? rest.note.trim() || null : null;
      }
      const { data, error } = await supabase
        .from("business_data_entries")
        .update(clean)
        .eq("id", payload.id)
        .select()
        .single();
      if (error) throw error;
      return mapEntry(data as BusinessDataEntry);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["business_data_entries"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        demoDb.deleteBusinessDataEntry(id);
        return;
      }
      const supabase = createClient();
      const { error } = await supabase
        .from("business_data_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["business_data_entries"] }),
  });

  return { add, update, remove };
}
