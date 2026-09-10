"use client";

import { useOrganization } from "@/hooks/use-company";
import {
  capabilityUpgradeMessage,
  getPlanCapabilities,
  getPlanLimits,
  type PlanCapabilities,
} from "@/lib/billing/plans";
import { useMemo } from "react";

export function useOrgAccess() {
  const { data: org, isLoading } = useOrganization();

  return useMemo(() => {
    const status = org?.subscription_status ?? "trialing";
    const trialEnds = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
    const trialExpired =
      status === "trialing" && !!trialEnds && trialEnds.getTime() < Date.now();
    const cancelled = status === "cancelled";
    const pastDue = status === "past_due";
    const writesBlocked = trialExpired || cancelled || pastDue;

    const trialDaysLeft =
      status === "trialing" && trialEnds
        ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    const capabilities = getPlanCapabilities(org?.plan);
    const limits = getPlanLimits(org?.plan);

    const can = (key: keyof PlanCapabilities) => !!capabilities[key];

    return {
      org,
      isLoading,
      trialExpired,
      cancelled,
      pastDue,
      trialDaysLeft,
      writesBlocked,
      capabilities,
      limits,
      can,
      assertCanCreate: () => {
        if (writesBlocked) {
          throw new Error(
            trialExpired
              ? "Your trial has ended - upgrade at Settings → Billing to continue."
              : pastDue
                ? "Payment is past due - update billing to continue."
                : "This organization subscription is cancelled - upgrade to continue."
          );
        }
      },
      assertCapability: (key: keyof PlanCapabilities) => {
        if (!capabilities[key]) {
          throw new Error(capabilityUpgradeMessage(key));
        }
      },
    };
  }, [org, isLoading]);
}
