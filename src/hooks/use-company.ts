"use client";

import { isDemoMode } from "@/lib/demo/mode";
import { requireOrganizationId } from "@/lib/org";
import {
  companySettingsToOrganizationPatch,
  organizationToCompanySettings,
} from "@/lib/organization";
import { createClient } from "@/lib/supabase/client";
import type { CompanySettings, Organization } from "@/lib/types";
import { normalizeBusinessType } from "@/lib/business-types";
import { resolveBusinessType } from "@/lib/business-type-storage";
import { useAuth } from "@/components/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { demoDb } from "@/lib/demo/store";
import { useMemo } from "react";

function mapOrgRow(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    gstin: (row.gstin as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    state: String(row.state ?? "Gujarat"),
    bank_details: (row.bank_details as string | null) ?? null,
    logo_url: (row.logo_url as string | null) ?? null,
    plan: (row.plan as Organization["plan"]) ?? "free",
    subscription_status:
      (row.subscription_status as Organization["subscription_status"]) ?? "trialing",
    trial_ends_at: (row.trial_ends_at as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    brand_name: String(row.brand_name ?? ""),
    city: String(row.city ?? ""),
    pincode: String(row.pincode ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    bank_name: String(row.bank_name ?? ""),
    bank_account: String(row.bank_account ?? ""),
    bank_ifsc: String(row.bank_ifsc ?? ""),
    bank_branch: String(row.bank_branch ?? ""),
    invoice_prefix: String(row.invoice_prefix ?? "AB"),
    upi_id: String(row.upi_id ?? ""),
    signature_url: (row.signature_url as string | null) ?? null,
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    business_type: normalizeBusinessType(row.business_type),
    razorpay_customer_id: (row.razorpay_customer_id as string | null) ?? null,
    razorpay_subscription_id: (row.razorpay_subscription_id as string | null) ?? null,
    current_period_end: (row.current_period_end as string | null) ?? null,
    cancel_at_period_end: Boolean(row.cancel_at_period_end ?? false),
  };
}

/** @deprecated Prefer useOrganization - kept for invoice PDF / settings call sites. */
export function useCompanySettings() {
  return useOrganizationAsCompany();
}

export function useOrganization() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["organization", user?.organization_id ?? ""],
    enabled: !authLoading && (!!user?.organization_id || isDemoMode()),
    queryFn: async (): Promise<Organization> => {
      if (isDemoMode()) {
        return demoDb.getOrganization();
      }

      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle();

      if (error) {
        if (/relation|does not exist|schema cache/i.test(error.message)) {
          throw new Error(
            "organizations table missing. Run supabase/migrations/016_organizations.sql then 017–019."
          );
        }
        throw error;
      }

      if (!data) {
        throw new Error(
          "Organization not found for your account. Run migrations 016–019 and ensure your user has organization_id."
        );
      }

      return mapOrgRow(data as Record<string, unknown>);
    },
  });
}

function useOrganizationAsCompany() {
  const q = useOrganization();
  const data = useMemo(() => {
    if (!q.data) return undefined;
    return {
      ...organizationToCompanySettings(q.data),
      business_type: resolveBusinessType(q.data.business_type, q.data.id),
    };
  }, [q.data]);

  return {
    ...q,
    data,
  };
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CompanySettings> & { id: string }) => {
      if (isDemoMode()) {
        const org = demoDb.updateOrganization({
          id: payload.id,
          ...companySettingsToOrganizationPatch(payload),
        });
        return organizationToCompanySettings(org);
      }

      const supabase = createClient();
      const { id, ...rest } = payload;
      const patch = {
        ...companySettingsToOrganizationPatch(rest),
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await supabase
        .from("organizations")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      // Column not migrated yet - strip unknown cols and retry
      if (error && /business_type|signature_url|schema cache|Could not find the .* column/i.test(error.message)) {
        if (rest.business_type) {
          const { writeLocalBusinessType } = await import("@/lib/business-type-storage");
          const { normalizeBusinessType } = await import("@/lib/business-types");
          const { notifyBusinessTypeLocalChange } = await import("@/hooks/use-business-type");
          writeLocalBusinessType(id, normalizeBusinessType(rest.business_type));
          notifyBusinessTypeLocalChange();
        }
       const wantedSignature = rest.signature_url !== undefined;
        
        const safePatch = { ...patch } as Record<string, unknown>;
        delete safePatch.business_type;
        delete safePatch.signature_url;
        const retry = await supabase
          .from("organizations")
          .update(safePatch)
          .eq("id", id)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
        if (!error && wantedSignature) {
          throw new Error(
            "Other settings saved, but signature storage needs a DB update. Run PASTE_028_org_signature.sql in Supabase, then try again."
          );
        }
      }

      if (error) {
        if (/permission|policy|RLS/i.test(error.message)) {
          throw new Error("Permission denied - only an admin can update organization settings.");
        }
        throw error;
      }

      // Always keep local mirror so UI respects chosen type even if DB column is missing/defaulted
      if (rest.business_type) {
        const { writeLocalBusinessType } = await import("@/lib/business-type-storage");
        const { normalizeBusinessType } = await import("@/lib/business-types");
        const { notifyBusinessTypeLocalChange } = await import("@/hooks/use-business-type");
        writeLocalBusinessType(id, normalizeBusinessType(rest.business_type));
        notifyBusinessTypeLocalChange();
      }

      return organizationToCompanySettings(mapOrgRow(data as Record<string, unknown>));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization"] });
      qc.invalidateQueries({ queryKey: ["company_settings"] });
    },
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Organization> & { id: string }) => {
      if (isDemoMode()) {
        return demoDb.updateOrganization(payload);
      }
      const supabase = createClient();
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from("organizations")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapOrgRow(data as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization"] });
      qc.invalidateQueries({ queryKey: ["company_settings"] });
    },
  });
}