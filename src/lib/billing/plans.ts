import type { Organization } from "@/lib/types";

export type PaidPlanId = "starter" | "pro" | "business";
export type PlanId = "free" | PaidPlanId;
export type BillingInterval = "monthly" | "annual";

export type PlanLimits = {
  maxInvoicesPerMonth: number | null; // null = unlimited
  maxActiveProducts: number | null;
};

/** Capability flags used for comparison checklist + future gating. */
export type PlanCapabilities = {
  inventoryGst: boolean;
  gstrExport: boolean;
  purchasesCreditNotes: boolean;
  multiWarehouse: boolean;
  emailSupport: boolean;
  prioritySupport: boolean;
  dedicatedSupport: boolean;
};

export type PlanDefinition = {
  id: PaidPlanId;
  name: string;
  /** Monthly list price (INR). Also used for Razorpay monthly checkout. */
  priceInr: number;
  /** Annual billed price (INR) when paying yearly. */
  priceAnnualInr: number;
  /**
   * Optional strikethrough “was” price for monthly.
   * Leave undefined/null when no promo is running — never invent a fake discount.
   */
  compareAtMonthlyInr?: number | null;
  /** Optional strikethrough “was” price for annual (e.g. 12× monthly). */
  compareAtAnnualInr?: number | null;
  periodLabel: string;
  description: string;
  /** @deprecated Prefer PLAN_CHECKLIST_FEATURES — kept for simple bullet fallbacks */
  features: string[];
  limits: PlanLimits;
  capabilities: PlanCapabilities;
  /** Highlight this card as the recommended / most popular tier */
  recommended?: boolean;
  envPlanIdKey: "RAZORPAY_PLAN_STARTER" | "RAZORPAY_PLAN_PRO" | "RAZORPAY_PLAN_BUSINESS";
};

export type PlanPriceView = {
  /** Amount charged for the selected interval */
  price: number;
  /** Strikethrough amount, if a real compare-at is configured */
  compareAt: number | null;
  /** Effective ₹ per month (annual_price / 12 when annual) */
  perMonth: number;
  periodSuffix: string;
};

/** Single source of truth for tier names, prices, limits, and capabilities. */
export const PAID_PLANS: Record<PaidPlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceInr: 499,
    priceAnnualInr: 4999,
    compareAtMonthlyInr: null,
    compareAtAnnualInr: 5988,
    periodLabel: "/ month",
    description: "For small teams getting started with GST billing.",
    features: [
      "Up to 50 invoices / month",
      "Up to 100 active products",
      "Inventory & GST invoices",
      "Email support",
    ],
    limits: { maxInvoicesPerMonth: 50, maxActiveProducts: 100 },
    capabilities: {
      inventoryGst: true,
      gstrExport: true,
      purchasesCreditNotes: false,
      multiWarehouse: false,
      emailSupport: true,
      prioritySupport: false,
      dedicatedSupport: false,
    },
    envPlanIdKey: "RAZORPAY_PLAN_STARTER",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceInr: 999,
    priceAnnualInr: 9999,
    compareAtMonthlyInr: null,
    compareAtAnnualInr: 11988,
    periodLabel: "/ month",
    description: "Growing businesses with higher volume.",
    features: [
      "Up to 300 invoices / month",
      "Unlimited products",
      "Purchases & credit notes",
      "Priority support",
    ],
    limits: { maxInvoicesPerMonth: 300, maxActiveProducts: null },
    capabilities: {
      inventoryGst: true,
      gstrExport: true,
      purchasesCreditNotes: true,
      multiWarehouse: false,
      emailSupport: true,
      prioritySupport: true,
      dedicatedSupport: false,
    },
    recommended: true,
    envPlanIdKey: "RAZORPAY_PLAN_PRO",
  },
  business: {
    id: "business",
    name: "Business",
    priceInr: 1999,
    priceAnnualInr: 19999,
    compareAtMonthlyInr: null,
    compareAtAnnualInr: 23988,
    periodLabel: "/ month",
    description: "Unlimited usage for established operations.",
    features: [
      "Unlimited invoices",
      "Unlimited products",
      "Multi-warehouse ready",
      "Dedicated support",
    ],
    limits: { maxInvoicesPerMonth: null, maxActiveProducts: null },
    capabilities: {
      inventoryGst: true,
      gstrExport: true,
      purchasesCreditNotes: true,
      multiWarehouse: true,
      emailSupport: true,
      prioritySupport: true,
      dedicatedSupport: true,
    },
    envPlanIdKey: "RAZORPAY_PLAN_BUSINESS",
  },
};

export const PAID_PLAN_ORDER: PaidPlanId[] = ["starter", "pro", "business"];

export const TRIAL_LIMITS: PlanLimits = {
  maxInvoicesPerMonth: 50,
  maxActiveProducts: 100,
};

export type PlanChecklistItem = {
  id: string;
  label: string;
  included: boolean;
};

/**
 * Comparison checklist derived from each plan’s limits + capabilities
 * so the cards stay in sync with what gating actually uses.
 */
export function getPlanChecklist(planId: PaidPlanId): PlanChecklistItem[] {
  const plan = PAID_PLANS[planId];
  const { limits, capabilities } = plan;

  const invoiceLabel =
    limits.maxInvoicesPerMonth == null
      ? "Unlimited invoices"
      : `Up to ${limits.maxInvoicesPerMonth} invoices / month`;

  const productLabel =
    limits.maxActiveProducts == null
      ? "Unlimited products"
      : `Up to ${limits.maxActiveProducts} active products`;

  return [
    { id: "invoices", label: invoiceLabel, included: true },
    { id: "products", label: productLabel, included: true },
    {
      id: "inventory_gst",
      label: "Inventory & GST invoices",
      included: capabilities.inventoryGst,
    },
    {
      id: "gstr_export",
      label: "GSTR-1 / 3B ready exports",
      included: capabilities.gstrExport,
    },
    {
      id: "purchases",
      label: "Purchases & credit notes",
      included: capabilities.purchasesCreditNotes,
    },
    {
      id: "multi_warehouse",
      label: "Multi-warehouse ready",
      included: capabilities.multiWarehouse,
    },
    {
      id: "email_support",
      label: "Email support",
      included: capabilities.emailSupport,
    },
    {
      id: "priority_support",
      label: "Priority support",
      included: capabilities.prioritySupport,
    },
    {
      id: "dedicated_support",
      label: "Dedicated support",
      included: capabilities.dedicatedSupport,
    },
  ];
}

export function getPlanPrice(plan: PlanDefinition, interval: BillingInterval): PlanPriceView {
  if (interval === "annual") {
    const price = plan.priceAnnualInr;
    const compareAt =
      plan.compareAtAnnualInr != null && plan.compareAtAnnualInr > price
        ? plan.compareAtAnnualInr
        : null;
    return {
      price,
      compareAt,
      perMonth: Math.round(price / 12),
      periodSuffix: "/ year",
    };
  }

  const price = plan.priceInr;
  const compareAt =
    plan.compareAtMonthlyInr != null && plan.compareAtMonthlyInr > price
      ? plan.compareAtMonthlyInr
      : null;
  return {
    price,
    compareAt,
    perMonth: price,
    periodSuffix: "/ month",
  };
}

export function getPlanLimits(plan: Organization["plan"] | string | null | undefined): PlanLimits {
  if (plan === "starter") return PAID_PLANS.starter.limits;
  if (plan === "pro") return PAID_PLANS.pro.limits;
  if (plan === "business") return PAID_PLANS.business.limits;
  // free / trial / unknown
  return TRIAL_LIMITS;
}

/** Trial / free use Starter capabilities so pricing and enforcement stay aligned. */
export const TRIAL_CAPABILITIES: PlanCapabilities = { ...PAID_PLANS.starter.capabilities };

export function getPlanCapabilities(
  plan: Organization["plan"] | string | null | undefined
): PlanCapabilities {
  if (plan === "starter") return PAID_PLANS.starter.capabilities;
  if (plan === "pro") return PAID_PLANS.pro.capabilities;
  if (plan === "business") return PAID_PLANS.business.capabilities;
  return TRIAL_CAPABILITIES;
}

export function hasPlanCapability(
  plan: Organization["plan"] | string | null | undefined,
  capability: keyof PlanCapabilities
): boolean {
  return !!getPlanCapabilities(plan)[capability];
}

export function capabilityUpgradeMessage(capability: keyof PlanCapabilities): string {
  switch (capability) {
    case "purchasesCreditNotes":
      return "Purchases & credit notes are available on Pro and Business - upgrade at Settings → Billing.";
    case "multiWarehouse":
      return "Multiple warehouses are available on the Business plan - upgrade at Settings → Billing.";
    case "gstrExport":
      return "GSTR exports are not included on your current plan - upgrade at Settings → Billing.";
    case "prioritySupport":
      return "Priority support is available on Pro and Business - upgrade at Settings → Billing.";
    case "dedicatedSupport":
      return "Dedicated support is available on the Business plan - upgrade at Settings → Billing.";
    default:
      return "This feature is not included on your current plan - upgrade at Settings → Billing.";
  }
}

export function getRazorpayPlanId(plan: PaidPlanId): string {
  const def = PAID_PLANS[plan];
  const value = process.env[def.envPlanIdKey];
  if (!value) {
    throw new Error(`Missing env ${def.envPlanIdKey}. Create the plan in Razorpay and add it to .env.local.`);
  }
  return value;
}

export function mapRazorpayPlanIdToTier(razorpayPlanId: string | undefined | null): PaidPlanId | null {
  if (!razorpayPlanId) return null;
  const starter = process.env.RAZORPAY_PLAN_STARTER;
  const pro = process.env.RAZORPAY_PLAN_PRO;
  const business = process.env.RAZORPAY_PLAN_BUSINESS;
  if (starter && razorpayPlanId === starter) return "starter";
  if (pro && razorpayPlanId === pro) return "pro";
  if (business && razorpayPlanId === business) return "business";
  return null;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
