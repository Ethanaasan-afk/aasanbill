"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { LiveMarketReferencePanel } from "@/components/metal-rates/live-market-reference-panel";
import { useBusinessType } from "@/hooks/use-business-type";
import { useLiveMarketRates } from "@/hooks/use-live-market-rates";
import {
  findLatestRate,
  latestRatesMap,
  useMetalRateMutations,
  useMetalRates,
} from "@/hooks/use-metal-rates";
import {
  formatMetalLabel,
  formatPurityLabel,
  GOLD_PURITIES,
  SILVER_PURITIES,
  type MetalType,
} from "@/lib/jewellery";
import { formatINR } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DraftKey = `${MetalType}|${string}`;

const QUICK_SLOTS: { metal: MetalType; purity: string }[] = [
  { metal: "gold", purity: "24k" },
  { metal: "gold", purity: "22k" },
  { metal: "gold", purity: "18k" },
  { metal: "silver", purity: "999" },
  { metal: "platinum", purity: "999" },
  { metal: "palladium", purity: "999" },
];

export default function MetalRatesPage() {
  const { businessType, isJewellery } = useBusinessType();
  const router = useRouter();
  const { toast } = useToast();
  const { data: rates, isLoading } = useMetalRates();
  const { saveMany } = useMetalRateMutations();
  const [drafts, setDrafts] = useState<Record<DraftKey, string>>({} as Record<DraftKey, string>);
  const [saving, setSaving] = useState(false);

  const {
    data: liveMarket,
    isLoading: liveLoading,
  } = useLiveMarketRates(isJewellery, 30_000);
  const liveRates = liveMarket?.rates ?? [];
  const liveHistory = liveMarket?.history ?? [];
  const liveUnavailable = liveMarket?.unavailable ?? null;

  useEffect(() => {
    if (businessType !== "jewellery") {
      router.replace("/dashboard");
    }
  }, [businessType, router]);

  const latest = useMemo(() => latestRatesMap(rates ?? []), [rates]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const slot of QUICK_SLOTS) {
      const key = `${slot.metal}|${slot.purity}` as DraftKey;
      const row = latest.get(key);
      next[key] = row ? String(row.rate_per_gram) : "";
    }
    setDrafts(next as Record<DraftKey, string>);
  }, [latest]);

  const history = useMemo(() => (rates ?? []).slice(0, 40), [rates]);

  const onUseLiveRate = useCallback(
    (draftKey: string, rate: number) => {
      setDrafts((prev) => ({
        ...prev,
        [draftKey]: String(Math.round(rate * 100) / 100),
      }));
      toast(`Copied ${formatINR(rate)}/g into shop rates - adjust then Save.`);
    },
    [toast]
  );

  const onSave = async () => {
    const rows = QUICK_SLOTS.map((slot) => {
      const key = `${slot.metal}|${slot.purity}` as DraftKey;
      const raw = drafts[key];
      const rate = Number(raw);
      return {
        metal_type: slot.metal,
        purity: slot.purity,
        rate_per_gram: rate,
      };
    }).filter((r) => Number.isFinite(r.rate_per_gram) && r.rate_per_gram > 0);

    if (!rows.length) {
      toast("Enter at least one rate to save.", "error");
      return;
    }

    setSaving(true);
    try {
      const toInsert = rows.filter((r) => {
        const prev = findLatestRate(rates, r.metal_type, r.purity);
        return !prev || Number(prev.rate_per_gram) !== r.rate_per_gram;
      });
      if (!toInsert.length) {
        toast("No changes to save.");
        return;
      }
      await saveMany.mutateAsync(toInsert);
      toast(`Saved ${toInsert.length} rate${toInsert.length === 1 ? "" : "s"}.`);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isJewellery) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's Rates"
        description="Punch in gold/silver rates each morning - used for ornament pricing and invoices"
      />

      <LiveMarketReferencePanel
        rates={liveRates}
        history={liveHistory}
        unavailable={liveUnavailable}
        loading={liveLoading}
        onUseRate={onUseLiveRate}
      />

      <section className="rounded-[14px] border border-border bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Quick update</h2>
            <p className="mt-1 text-xs text-slate">
              Change 2-3 numbers and hit Save. Only changed rates are stored. These shop rates
              are what invoices use.
            </p>
          </div>
          <Button type="button" loading={saving} onClick={() => void onSave()}>
            Save today&apos;s rates
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_SLOTS.map((slot) => {
            const key = `${slot.metal}|${slot.purity}` as DraftKey;
            const current = latest.get(key);
            return (
              <label
                key={key}
                className="block rounded-[12px] border border-border bg-cloud px-3 py-3"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                  {formatMetalLabel(slot.metal)} · {formatPurityLabel(slot.purity)}
                </span>
                <Input
                  id={`rate-${key}`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  className="mt-2"
                  value={drafts[key] ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  onFocus={(e) => e.target.select()}
                />
                <span className="mt-1 block text-[11px] text-slate-dim">
                  {current
                    ? `Last: ${formatINR(current.rate_per_gram)}/g · ${current.effective_date}`
                    : "No rate yet"}
                </span>
              </label>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-slate-dim">
          Also tracked when needed: {GOLD_PURITIES.map(formatPurityLabel).join(", ")} gold ·{" "}
          {SILVER_PURITIES.join(", ")} silver. Add extra purities by editing an ornament and
          saving a rate for that purity from here after first use (22K/24K/18K/999/925 cover
          most shops).
        </p>
      </section>

      <section>
        <h2 className="font-display text-base font-semibold text-ink">Recent rate log</h2>
        <div className="mt-3 overflow-x-auto rounded-[12px] border border-border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-cloud text-[11px] uppercase tracking-wide text-slate">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Metal</th>
                <th className="px-4 py-2.5 font-semibold">Purity</th>
                <th className="px-4 py-2.5 font-semibold">Rate / g</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate">
                    No rates yet. Enter today&apos;s rates above.
                  </td>
                </tr>
              )}
              {history.map((row) => (
                <tr key={row.id} className="border-t border-border/70">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate">
                    {row.effective_date}
                  </td>
                  <td className="px-4 py-2.5 text-ink">{formatMetalLabel(row.metal_type)}</td>
                  <td className="px-4 py-2.5 text-ink">{formatPurityLabel(row.purity)}</td>
                  <td className="px-4 py-2.5 font-mono text-ink">
                    {formatINR(row.rate_per_gram)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
