"use client";

import Link from "next/link";
import { useOrgAccess } from "@/hooks/use-org-access";

export function TrialBanner() {
  const { writesBlocked, trialExpired, cancelled, pastDue } = useOrgAccess();

  if (!writesBlocked) return null;

  const message = trialExpired
    ? "Your trial has ended - upgrade to continue creating invoices and products."
    : pastDue
      ? "Payment is past due - update your subscription to restore create access."
      : cancelled
        ? "This organization’s subscription is cancelled. Upgrade to continue creating records."
        : null;

  if (!message) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950 md:px-8">
      {message}{" "}
      <Link href="/settings/billing" className="font-semibold underline underline-offset-2">
        Go to Billing
      </Link>
    </div>
  );
}
