"use client";

import {
  calcLiveRateChange,
  LIVE_DISPLAY_SLOTS,
  type LiveMetalRateRow,
  type LiveRateChange,
} from "@/lib/live-metal-rates";
import { cn, formatINR } from "@/lib/utils";
import { LiveLineChart } from "@/components/charts/studio-charts";
import { format, parseISO } from "date-fns";
import { Copy } from "lucide-react";
import { useMemo } from "react";

const LIVE_SERIES = [
  { metal: "gold", purity: "24k", key: "g24", color: "#C9A227", label: "Gold 24K" },
  { metal: "gold", purity: "22k", key: "g22", color: "var(--primary)", label: "Gold 22K" },
  { metal: "silver", purity: "999", key: "ag", color: "#64748B", label: "Silver" },
] as const;

function rateUnit(metal: string) {
  return metal === "diamond" ? "/ct" : "/g";
}

function formatAsOf(iso: string | undefined) {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "dd MMM, h:mm a");
  } catch {
    return iso;
  }
}

function ChangeBadge({ change }: { change: LiveRateChange | null }) {
  if (!change) return null;
  const up = change.direction === "up";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        up ? "bg-emerald/15 text-emerald" : "bg-rose/15 text-rose"
      )}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {change.percent.toFixed(2)}%
    </span>
  );
}

function MetalGlyph({ metal, color }: { metal: string; color: string }) {
  const letter =
    metal === "gold"
      ? "Au"
      : metal === "silver"
        ? "Ag"
        : metal === "platinum"
          ? "Pt"
          : metal === "diamond"
            ? "◆"
            : "Pd";
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] font-mono text-[11px] font-bold"
      style={{
        background: color,
        color: metal === "palladium" ? "#F8FAFC" : "#0F172A",
      }}
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function LiveMarketReferencePanel({
  rates,
  history,
  unavailable,
  loading,
  onUseRate,
}: {
  rates: LiveMetalRateRow[];
  history: LiveMetalRateRow[];
  unavailable?: string | null;
  loading?: boolean;
  onUseRate: (draftKey: string, rate: number) => void;
}) {
  const byKey = useMemo(() => {
    const map = new Map<string, LiveMetalRateRow>();
    for (const row of rates) {
      map.set(`${row.metal_type}|${row.karat_or_purity}`, row);
    }
    return map;
  }, [rates]);

  const newestFetchedAt = useMemo(() => {
    return rates.reduce<string | null>((acc, r) => {
      if (!acc || r.fetched_at > acc) return r.fetched_at;
      return acc;
    }, null);
  }, [rates]);

  const heroSlot = LIVE_DISPLAY_SLOTS.find((s) => s.hero)!;
  const supportSlots = LIVE_DISPLAY_SLOTS.filter((s) => !s.hero);

  const chartData = useMemo(() => {
    const buckets = new Map<string, Record<string, string | number>>();
    for (const s of LIVE_SERIES) {
      const rows = history
        .filter((r) => r.metal_type === s.metal && r.karat_or_purity === s.purity)
        .sort((a, b) => a.fetched_at.localeCompare(b.fetched_at));
      for (const r of rows) {
        const t = r.fetched_at.slice(0, 16);
        const prev = buckets.get(t) ?? {
          t,
          label: format(parseISO(r.fetched_at), "dd MMM HH:mm"),
        };
        prev[s.key] = Number(r.rate_per_gram_inr);
        buckets.set(t, prev);
      }
    }
    return Array.from(buckets.values()).sort((a, b) => String(a.t).localeCompare(String(b.t)));
  }, [history]);

  return (
    <section className="rounded-[14px] border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
            Live market reference
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
              Live
            </span>
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate">
            Live market reference - for your convenience, not used in invoices unless you copy it
            below.
          </p>
        </div>
        {newestFetchedAt && rates.length > 0 && (
          <p className="font-mono text-[11px] text-slate-dim">
            as of {formatAsOf(newestFetchedAt)}
          </p>
        )}
      </div>

      <div className="mt-4 min-h-[420px]">
        {loading && <p className="text-sm text-slate">Loading live rates…</p>}

      {!loading && unavailable && rates.length === 0 && (
        <div className="mt-4 rounded-[10px] border border-amber/30 bg-amber/10 px-3 py-2.5 text-sm text-ink">
          <p className="font-medium">Live rates unavailable right now.</p>
          <p className="mt-1 text-xs text-slate">
            You can still enter shop rates below. Technical detail: {unavailable}
          </p>
        </div>
      )}

        {!loading && rates.length > 0 && (
        <>
          {unavailable && (
            <p className="mt-3 text-[11px] text-amber">
              Could not refresh live feed - showing last cached rates.
            </p>
          )}

          {/* Hero: Gold 24K */}
          {(() => {
            const row = byKey.get(`${heroSlot.metal_type}|${heroSlot.karat_or_purity}`);
            const change = calcLiveRateChange(
              history,
              heroSlot.metal_type,
              heroSlot.karat_or_purity,
              row
            );
            return (
              <div
                className="mt-4 rounded-[14px] border border-border bg-cloud p-4 sm:p-5"
                style={{ boxShadow: `inset 3px 0 0 ${heroSlot.accent}` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <MetalGlyph metal={heroSlot.metal_type} color={heroSlot.chipBg} />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                        {heroSlot.label}
                        <span className="ml-2 rounded-full bg-[rgba(201,162,39,0.18)] px-2 py-0.5 text-[10px] font-semibold text-[#8A7018]">
                          Most used
                        </span>
                      </p>
                      <div className="mt-1 flex flex-wrap items-end gap-2">
                        <p className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                          {row ? formatINR(Number(row.rate_per_gram_inr)) : "-"}
                          <span className="ml-1 text-sm font-medium text-slate">
                            {rateUnit(heroSlot.metal_type)}
                          </span>
                        </p>
                        <ChangeBadge change={change} />
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-slate-dim">
                        {row ? `as of ${formatAsOf(row.fetched_at)}` : "No data"}
                      </p>
                    </div>
                  </div>
                  {heroSlot.draftKey && row && (
                    <button
                      type="button"
                      onClick={() =>
                        onUseRate(heroSlot.draftKey!, Number(row.rate_per_gram_inr))
                      }
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[11px] font-semibold text-ink hover:bg-surface-hover"
                    >
                      <Copy className="h-3 w-3" aria-hidden />
                      Use this rate
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Supporting metals */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supportSlots.map((slot) => {
              const row = byKey.get(`${slot.metal_type}|${slot.karat_or_purity}`);
              const change = calcLiveRateChange(
                history,
                slot.metal_type,
                slot.karat_or_purity,
                row
              );
              return (
                <div
                  key={`${slot.metal_type}|${slot.karat_or_purity}`}
                  className="rounded-[12px] border border-border bg-cloud px-3 py-3"
                  style={{ boxShadow: `inset 3px 0 0 ${slot.accent}` }}
                >
                  <div className="flex items-start gap-2.5">
                    <MetalGlyph metal={slot.metal_type} color={slot.chipBg} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">
                        {slot.label}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <p className="font-display text-lg font-semibold text-ink">
                          {row ? formatINR(Number(row.rate_per_gram_inr)) : "-"}
                          <span className="ml-1 text-xs font-medium text-slate">
                            {rateUnit(slot.metal_type)}
                          </span>
                        </p>
                        <ChangeBadge change={change} />
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-dim">
                        {row ? `as of ${formatAsOf(row.fetched_at)}` : "No data"}
                      </p>
                      {slot.metal_type === "diamond" && (
                        <p className="mt-0.5 text-[10px] text-slate-dim">
                          Gold-linked 1ct index (reference)
                        </p>
                      )}
                      {slot.draftKey && row && (
                        <button
                          type="button"
                          onClick={() =>
                            onUseRate(slot.draftKey!, Number(row.rate_per_gram_inr))
                          }
                          className="mt-2 inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-[10px] font-semibold text-ink hover:bg-surface-hover"
                        >
                          <Copy className="h-3 w-3" aria-hidden />
                          Use this rate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
                Live line · Gold &amp; silver
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] text-slate">
                {LIVE_SERIES.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <LiveLineChart
                data={chartData}
                series={LIVE_SERIES.map((s) => ({
                  key: s.key,
                  color: s.color,
                  label: s.label,
                }))}
                unit="₹/g"
              />
            </div>
          </div>
        </>
        )}
      </div>
    </section>
  );
}
