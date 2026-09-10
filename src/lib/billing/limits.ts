import type { SupabaseClient } from "@supabase/supabase-js";
import {
  capabilityUpgradeMessage,
  getPlanCapabilities,
  getPlanLimits,
  type PlanCapabilities,
} from "@/lib/billing/plans";

export type PlanResource = "invoices" | "products";

export type PlanLimitResult =
  | { ok: true }
  | { ok: false; message: string; upgradePath: string };

const UPGRADE = "/settings/billing";

function monthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

type OrgPlanOk = { plan: string; subscription_status: string };
type OrgPlanLookup = OrgPlanOk | Extract<PlanLimitResult, { ok: false }>;

async function getOrgPlanRow(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrgPlanLookup> {
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("plan, subscription_status")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgErr) throw orgErr;
  if (!org) {
    return {
      ok: false,
      message: "Organization not found.",
      upgradePath: UPGRADE,
    };
  }

  const status = String(org.subscription_status ?? "trialing");
  if (status === "past_due") {
    return {
      ok: false,
      message: "Payment is past due - update billing to continue creating records.",
      upgradePath: UPGRADE,
    };
  }
  if (status === "cancelled") {
    return {
      ok: false,
      message: "Subscription cancelled - upgrade to continue.",
      upgradePath: UPGRADE,
    };
  }

  return {
    plan: String(org.plan ?? "free"),
    subscription_status: status,
  };
}

function isLimitFailure(
  value: OrgPlanLookup
): value is Extract<PlanLimitResult, { ok: false }> {
  return "ok" in value && value.ok === false;
}

/**
 * Server- or client-callable plan usage gate.
 * Uses the caller's Supabase client (RLS applies for user clients).
 */
export async function checkPlanLimit(
  supabase: SupabaseClient,
  organizationId: string,
  resource: PlanResource
): Promise<PlanLimitResult> {
  const org = await getOrgPlanRow(supabase, organizationId);
  if (isLimitFailure(org)) return org;

  const limits = getPlanLimits(org.plan);

  if (resource === "invoices") {
    const max = limits.maxInvoicesPerMonth;
    if (max == null) return { ok: true };
    const { from, to } = monthBounds();
    const { count, error } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("invoice_date", from)
      .lt("invoice_date", to)
      .neq("status", "cancelled");
    if (error) throw error;
    if ((count ?? 0) >= max) {
      return {
        ok: false,
        message: `You've hit your plan's limit (${max} invoices/month) - upgrade to continue.`,
        upgradePath: UPGRADE,
      };
    }
    return { ok: true };
  }

  const maxProducts = limits.maxActiveProducts;
  if (maxProducts == null) return { ok: true };
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("is_active", true);
  if (error) throw error;
  if ((count ?? 0) >= maxProducts) {
    return {
      ok: false,
      message: `You've hit your plan's limit (${maxProducts} active products) - upgrade to continue.`,
      upgradePath: UPGRADE,
    };
  }
  return { ok: true };
}

/** Gate a boolean plan capability (purchases, multi-warehouse, etc.). */
export async function checkPlanCapability(
  supabase: SupabaseClient,
  organizationId: string,
  capability: keyof PlanCapabilities
): Promise<PlanLimitResult> {
  const org = await getOrgPlanRow(supabase, organizationId);
  if (isLimitFailure(org)) return org;

  const caps = getPlanCapabilities(org.plan);
  if (!caps[capability]) {
    return {
      ok: false,
      message: capabilityUpgradeMessage(capability),
      upgradePath: UPGRADE,
    };
  }
  return { ok: true };
}

/**
 * Allow at most one warehouse unless the plan includes multiWarehouse.
 * Editing an existing warehouse is always allowed (subject to subscription status).
 */
export async function checkCanCreateWarehouse(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PlanLimitResult> {
  const org = await getOrgPlanRow(supabase, organizationId);
  if (isLimitFailure(org)) return org;

  const caps = getPlanCapabilities(org.plan);
  if (caps.multiWarehouse) return { ok: true };

  const { count, error } = await supabase
    .from("warehouses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (error) throw error;

  if ((count ?? 0) >= 1) {
    return {
      ok: false,
      message: capabilityUpgradeMessage("multiWarehouse"),
      upgradePath: UPGRADE,
    };
  }
  return { ok: true };
}

export function planLimitErrorMessage(result: Extract<PlanLimitResult, { ok: false }>): string {
  return `${result.message} (${result.upgradePath})`;
}
