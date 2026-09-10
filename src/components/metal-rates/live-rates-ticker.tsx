"use client";

import { useBusinessType } from "@/hooks/use-business-type";
import { useLiveMarketRates } from "@/hooks/use-live-market-rates";
import {
  calcLiveRateChange,
  TICKER_SLOTS,
  type LiveRateChange,
} from "@/lib/live-metal-rates";
import { cn, formatINR } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Gem } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function MiniChange({ change }: { change: LiveRateChange | null }) {
  if (!change) return null;
  const up = change.direction === "up";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold",
        up ? "text-emerald" : "text-rose"
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
      {change.percent.toFixed(1)}%
    </span>
  );
}

/** Slim jewellery-only strip: Gold 24K / 22K / Silver → Today's Rates. */
export function LiveRatesTicker() {
  const { isJewellery } = useBusinessType();
  const { data, isLoading } = useLiveMarketRates(isJewellery, 30_000);

  const items = useMemo(() => {
    const rates = data?.rates ?? [];
    const history = data?.history ?? [];
    const byKey = new Map(rates.map((r) => [`${r.metal_type}|${r.karat_or_purity}`, r] as const));
    return TICKER_SLOTS.map((slot) => {
      const row = byKey.get(`${slot.metal_type}|${slot.karat_or_purity}`);
      const change = calcLiveRateChange(history, slot.metal_type, slot.karat_or_purity, row);
      return { ...slot, row, change };
    });
  }, [data]);

  const rates = data?.rates ?? [];
  if (!isJewellery) return null;
  if (isLoading && !rates.length) return null;
  if (!rates.length) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-[12px] border border-border bg-surface">
      <div className="flex flex-wrap items-stretch divide-x divide-border">
        <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate">
          <Gem className="h-3.5 w-3.5 text-[#C9A227]" aria-hidden />
          Live
        </div>
        {items.map((item) => (
          <Link
            key={`${item.metal_type}|${item.karat_or_purity}`}
            href="/metal-rates"
            className="flex min-w-[140px] flex-1 items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-cloud"
            style={{ boxShadow: `inset 2px 0 0 ${item.accent}` }}
          >
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate">
                {item.label}
              </p>
              <p className="font-mono text-sm font-semibold text-ink">
                {item.row ? formatINR(Number(item.row.rate_per_gram_inr)) : "-"}
                <span className="ml-0.5 text-[10px] font-medium text-slate">/g</span>
              </p>
            </div>
            <MiniChange change={item.change} />
          </Link>
        ))}
      </div>
    </div>
  );
}
