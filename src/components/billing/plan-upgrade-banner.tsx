"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function PlanUpgradeBanner({
  title,
  description,
  requiredPlan = "Pro",
}: {
  title: string;
  description: string;
  requiredPlan?: string;
}) {
  return (
    <div className="rounded-[14px] border border-primary/25 bg-primary-soft px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        {requiredPlan} plan
      </p>
      <h2 className="mt-1 font-display text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-xl text-sm text-slate">{description}</p>
      <Link href="/settings/billing" className="mt-4 inline-block">
        <Button type="button">Upgrade at Billing</Button>
      </Link>
    </div>
  );
}
