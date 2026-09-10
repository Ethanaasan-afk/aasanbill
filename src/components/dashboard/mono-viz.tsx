"use client";

import {
  FunnelChart,
  MarkerLineChart,
  ProfitLossLine,
  RingChart,
} from "@/components/charts/studio-charts";
import { MonoChartPatterns, MONO_TOOLTIP } from "@/components/dashboard/mono-chart-patterns";
import { formatINR } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

export type WavePoint = { label: string; sales: number; collected: number };
export type BarPoint = { label: string; billed: number; collected: number; unpaid: number };
export type HeatCell = { date: string; count: number };

export function MonoVizGrid({
  wave,
  billed,
  collected,
  unpaid,
  monthBills,
  paidShare,
  collectedShare,
  stockOkShare,
  donut,
  bars,
  heat,
  pl,
  funnel,
  ringLegend,
}: {
  wave: WavePoint[];
  billed: number;
  collected: number;
  unpaid: number;
  monthBills: number;
  paidShare: number;
  collectedShare: number;
  stockOkShare: number;
  donut: { name: string; value: number; fill: string }[];
  bars: BarPoint[];
  heat: HeatCell[];
  pl: { label: string; v: number }[];
  funnel: { label: string; value: string; pct: number }[];
  ringLegend: { label: string; value: string; pct: number; color: string }[];
}) {
  const donutTotal = donut.reduce((s, d) => s + d.value, 0);
  const weeks = 12;
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    cols.push(heat.slice(w * 7, w * 7 + 7));
  }
  const maxHeat = Math.max(1, ...heat.map((h) => h.count));

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <MonoChartPatterns />

      <MarkerLineChart
        title="Sales line"
        subtitle="Last 14 days · billed vs collected"
        data={wave}
        series={[
          { key: "sales", color: "var(--primary)", label: "Billed" },
          { key: "collected", color: "var(--aqua)", label: "Collected" },
        ]}
      />

      <ProfitLossLine title="Profit / loss line" data={pl} />

      <RingChart
        title="Ring · this month"
        centerValue={String(monthBills)}
        centerLabel="Bills"
        rings={[
          { pct: 1, color: "var(--primary-soft)" },
          { pct: paidShare, color: "var(--primary)" },
          { pct: collectedShare, color: "var(--aqua)" },
          { pct: stockOkShare, color: "var(--emerald)" },
        ]}
        legend={ringLegend}
      />

      <div className="sm:col-span-2">
        <FunnelChart title="From book to paid" stages={funnel} />
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-4 sm:p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate">Stock mix</p>
        <div className="mt-2 flex items-center gap-4">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutTotal ? donut : [{ name: "None", value: 1, fill: "var(--border)" }]}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={68}
                  stroke="var(--surface)"
                  strokeWidth={3}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {(donutTotal ? donut : [{ fill: "var(--border)" }]).map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-2xl font-semibold text-ink">{donutTotal}</p>
              <p className="text-[11px] text-slate">Items</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-slate">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> In stock
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber" /> Low
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose" /> Out
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-4 sm:p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate">Daily billed</p>
        <p className="mt-1 text-[11px] text-slate-dim">Last 6 days · billed / in / still due</p>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} barGap={2} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 6" />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--slate)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={MONO_TOOLTIP}
                formatter={(v, name) => [
                  formatINR(Number(v ?? 0)),
                  name === "billed" ? "Billed" : name === "collected" ? "Collected" : "Still due",
                ]}
              />
              <Bar dataKey="billed" fill="var(--primary)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="collected" fill="var(--aqua)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="unpaid" fill="var(--amber)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-4 sm:col-span-2 sm:p-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate">
              Billing activity
            </p>
            <p className="text-[11px] text-slate-dim">Bills per day · last 12 weeks</p>
          </div>
          <p className="text-[10px] text-slate-dim">Less → more</p>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {cols.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell) => {
                const t = cell.count / maxHeat;
                const bg =
                  cell.count === 0
                    ? "var(--cloud)"
                    : t < 0.35
                      ? "var(--primary-soft)"
                      : t < 0.7
                        ? "var(--aqua)"
                        : "var(--primary)";
                return (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.count} bill${cell.count === 1 ? "" : "s"}`}
                    className="h-2.5 w-2.5 rounded-[2px]"
                    style={{ background: bg }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <p className="sr-only">
          Unpaid this month {formatINR(unpaid)}. Collected {formatINR(collected)}.
        </p>
      </div>
    </div>
  );
}
