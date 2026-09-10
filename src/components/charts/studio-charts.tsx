"use client";

import { formatINR } from "@/lib/utils";
import { useId, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TOOLTIP = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 12,
  boxShadow: "var(--card-shadow)",
};

export type RingLegendItem = {
  label: string;
  value: string;
  pct: number;
  color: string;
};

export function RingChart({
  title,
  centerValue,
  centerLabel,
  rings,
  legend,
}: {
  title: string;
  centerValue: string;
  centerLabel: string;
  rings: { pct: number; color: string }[];
  legend: RingLegendItem[];
}) {
  const radii = [78, 66, 54, 42, 30, 18].slice(0, rings.length);
  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate">{title}</p>
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative h-[180px] w-[180px] shrink-0">
          <svg viewBox="0 0 180 180" className="h-full w-full" aria-hidden>
            {radii.map((r) => (
              <circle
                key={r}
                cx="90"
                cy="90"
                r={r}
                fill="none"
                stroke="var(--border)"
                strokeWidth="7"
              />
            ))}
            {rings.map((ring, i) => {
              const r = radii[i];
              const c = 2 * Math.PI * r;
              const p = Math.min(1, Math.max(0, ring.pct));
              return (
                <circle
                  key={i}
                  cx="90"
                  cy="90"
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${c * p} ${c}`}
                  transform="rotate(-90 90 90)"
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-xl font-semibold text-ink">{centerValue}</p>
            <p className="text-[11px] text-slate">{centerLabel}</p>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-2.5">
          {legend.map((item) => (
            <li key={item.label}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-ink">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </span>
                <span className="font-mono text-slate">
                  {item.value} · {Math.round(item.pct * 100)}%
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-cloud">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(item.pct * 100)}%`, background: item.color }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ProfitLossLine({
  title,
  data,
}: {
  title: string;
  data: { label: string; v: number }[];
}) {
  const gid = useId().replace(/:/g, "");
  const { min, max, offset } = useMemo(() => {
    const vals = data.map((d) => d.v);
    const minV = Math.min(0, ...vals);
    const maxV = Math.max(0, ...vals);
    const span = maxV - minV || 1;
    return { min: minV, max: maxV, offset: maxV / span };
  }, [data]);
  const has = data.some((d) => d.v !== 0);

  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate">{title}</p>
      <p className="mt-0.5 text-[11px] text-slate-dim">Collected minus billed · above 0 is green</p>
      <div className="mt-3 h-40">
        {has ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset={offset} stopColor="var(--emerald)" />
                  <stop offset={offset} stopColor="var(--rose)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--slate)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide domain={[min, max]} />
              <ReferenceLine y={0} stroke="var(--ink)" strokeOpacity={0.35} />
              <Tooltip
                contentStyle={TOOLTIP}
                formatter={(v) => [formatINR(Number(v ?? 0)), "Net"]}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke={`url(#${gid})`}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center text-sm text-slate">No billed vs collected yet.</p>
        )}
      </div>
      <div className="mt-2 flex justify-center gap-4 text-[11px] text-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald" /> Profit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose" /> Loss
        </span>
      </div>
    </div>
  );
}

export type FunnelStage = { label: string; value: string; pct: number };

export function FunnelChart({ title, stages }: { title: string; stages: FunnelStage[] }) {
  const n = Math.max(1, stages.length);
  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate">{title}</p>
      <div className="relative mt-4 h-[120px] overflow-hidden">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="funnel-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--aqua)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M2 4 C 22 4, 28 8, 50 12 S 78 16, 98 18 L 98 22 C 78 24, 72 28, 50 28 S 22 36, 2 36 Z"
            fill="url(#funnel-fill)"
            stroke="var(--primary)"
            strokeOpacity="0.25"
            strokeWidth="0.4"
          />
          <path
            d="M4 8 C 24 8, 30 11, 50 14 S 76 17, 96 19 L 96 21 C 76 23, 70 25, 50 26 S 24 32, 4 32 Z"
            fill="var(--primary)"
            fillOpacity="0.06"
          />
        </svg>
        <div className="relative z-[1] grid h-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {stages.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center px-1 text-center">
              <p className="font-display text-sm font-semibold text-ink sm:text-base">{s.value}</p>
              <span className="mt-1 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink shadow-card">
                {Math.round(s.pct * 100)}%
              </span>
              <p className="mt-1 text-[10px] text-slate">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarkerLineChart({
  title,
  subtitle,
  data,
  series,
}: {
  title: string;
  subtitle?: string;
  data: Record<string, string | number>[];
  series: { key: string; color: string; label: string }[];
}) {
  const has = data.length > 1 && series.some((s) => data.some((d) => Number(d[s.key]) > 0));
  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate">{title}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-slate-dim">{subtitle}</p>}
      <div className="mt-3 h-44">
        {has ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--slate)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={TOOLTIP}
                formatter={(v, name) => [
                  formatINR(Number(v ?? 0)),
                  series.find((s) => s.key === name)?.label ?? String(name),
                ]}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--surface)", stroke: s.color, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center text-sm text-slate">No trend yet.</p>
        )}
      </div>
    </div>
  );
}

export function LiveLineChart({
  data,
  series,
  unit,
}: {
  data: Record<string, string | number>[];
  series: { key: string; color: string; label: string }[];
  unit: string;
}) {
  const has = data.length > 1;
  return (
    <div className="h-48 w-full">
      {has ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--slate)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              width={56}
              tick={{ fontSize: 10, fill: "var(--slate)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${Math.round(Number(v)).toLocaleString("en-IN")}`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={TOOLTIP}
              formatter={(v, name) => [
                formatINR(Number(v ?? 0)),
                series.find((s) => s.key === name)?.label ?? String(name),
              ]}
              labelFormatter={(l) => String(l)}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded-[12px] border border-dashed border-border bg-cloud/60 text-center text-xs text-slate">
          Live trend builds as the market feed refreshes.
        </div>
      )}
      <p className="sr-only">{unit}</p>
    </div>
  );
}
