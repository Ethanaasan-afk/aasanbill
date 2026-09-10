"use client";

import { DeltaBadge, FlashValue } from "@/components/dashboard/flash-value";
import { LoadingBlock } from "@/components/ui/page-header";
import { formatDate, formatINR } from "@/lib/utils";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer } from "recharts";

function MiniSpark({
  data,
  color,
}: {
  data: { v: number }[];
  color: string;
}) {
  if (!data.length) {
    return <div className="h-8 w-20 opacity-30" />;
  }
  return (
    <div className="h-8 w-24 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type BloombergStats = {
  monthRevenue: number;
  monthExpense: number;
  monthMfgCostSold: number;
  monthGrossAfterMfg: number;
  monthSalesCount: number;
  todayRevenue: number;
  salesSpark: { v: number }[];
  allInvoices: Array<{
    id: string;
    invoice_number: string;
    invoice_date: string;
    grand_total: number;
    status: string;
    customer?: { name?: string } | null;
  }>;
  attentionList: Array<{
    id: string;
    name: string;
    current_stock?: number;
    reorder_threshold: number;
  }>;
  needsAttention: number;
  skusOutOfStock: number;
  skusLow: number;
};

export type ProductRow = {
  id: string;
  name: string;
  units: number;
  mfgCost: number;
  revenue: number;
  marginPct: number | null;
  missingMfg: boolean;
};

type Props = {
  loading: boolean;
  stats: BloombergStats;
  productRows: ProductRow[];
  prior: {
    revenue: number;
    mfg: number;
    gross: number;
    expense: number;
  };
  grossSpark: { v: number }[];
  missingMfgCount: number;
};

export function BloombergBoard({
  loading,
  stats,
  productRows,
  prior,
  grossSpark,
  missingMfgCount,
}: Props) {
  if (loading) {
    return (
      <div className="bloomberg-terminal -mx-4 -my-6 min-h-[60vh] px-4 py-10 md:-mx-8 md:-my-8 md:px-8">
        <LoadingBlock className="bg-transparent text-[var(--bb-label)]" />
      </div>
    );
  }

  const deltas = {
    revenue: pctDelta(stats.monthRevenue, prior.revenue),
    mfg: pctDelta(stats.monthMfgCostSold, prior.mfg),
    gross: pctDelta(stats.monthGrossAfterMfg, prior.gross),
    expense: pctDelta(stats.monthExpense, prior.expense),
  };

  const ticker = [
    {
      key: "rev",
      label: "Revenue",
      value: stats.monthRevenue,
      tone: "amber" as const,
      delta: deltas.revenue,
      spark: stats.salesSpark,
      sparkColor: "var(--bb-amber)",
    },
    {
      key: "mfg",
      label: "Manufacturing Cost of Stock Sold",
      value: stats.monthMfgCostSold,
      tone: "amber" as const,
      delta: deltas.mfg,
      spark: null as { v: number }[] | null,
      sparkColor: "var(--bb-amber)",
    },
    {
      key: "gross",
      label: "Gross Profit",
      value: stats.monthGrossAfterMfg,
      tone:
        stats.monthGrossAfterMfg >= 0 ? ("emerald" as const) : ("rose" as const),
      delta: deltas.gross,
      spark: grossSpark,
      sparkColor: stats.monthGrossAfterMfg >= 0 ? "var(--bb-emerald)" : "var(--bb-rose)",
    },
    {
      key: "exp",
      label: "Expense (est. COGS)",
      value: stats.monthExpense,
      tone: "amber" as const,
      delta: deltas.expense,
      spark: null as { v: number }[] | null,
      sparkColor: "var(--bb-amber)",
    },
  ];

  return (
    <div className="bloomberg-terminal -mx-4 -mb-6 -mt-2 min-h-[calc(100vh-5rem)] px-4 pb-10 pt-2 md:-mx-8 md:-mb-8 md:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--bb-line)] pb-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--bb-muted)]">
            Terminal · This month
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--bb-text)]">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[var(--bb-label)]">
          <span className="bb-mono text-[var(--bb-amber)]">
            {stats.monthSalesCount} INV
          </span>
          <span className="bb-mono">TODAY {formatINR(stats.todayRevenue)}</span>
          <Link
            href="/invoices/new"
            className="border border-[var(--bb-line)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--bb-amber)] transition-colors hover:border-[var(--bb-amber)]"
          >
            New invoice
          </Link>
        </div>
      </header>

      {missingMfgCount > 0 && (
        <div
          className="mb-4 border border-[var(--bb-line)] border-l-[3px] border-l-[var(--bb-amber)] bg-[var(--bb-bg)] px-3 py-2 text-[12px] text-[var(--bb-label)]"
          role="status"
        >
          <span className="font-medium text-[var(--bb-amber)]">Mfg cost incomplete - </span>
          {missingMfgCount} product{missingMfgCount === 1 ? "" : "s"} sold this month{" "}
          {missingMfgCount === 1 ? "has" : "have"} no manufacturing cost. Gross profit may be
          overstated.{" "}
          <Link href="/products" className="text-[var(--bb-amber)] underline-offset-2 hover:underline">
            Fix in Products
          </Link>
        </div>
      )}

      {/* Ticker strip */}
      <div className="mb-6 grid grid-cols-1 border border-[var(--bb-line)] sm:grid-cols-2 lg:grid-cols-4">
        {ticker.map((item, idx) => (
          <div
            key={item.key}
            className={`flex flex-col gap-1 px-4 py-4 ${
              idx > 0 ? "border-t border-[var(--bb-line)] lg:border-l lg:border-t-0" : ""
            } ${idx === 1 ? "sm:border-l sm:border-t-0" : ""} ${
              idx === 2 ? "sm:border-t lg:border-t-0" : ""
            } ${idx === 3 ? "sm:border-l" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--bb-label)]">
                {item.label}
              </p>
              <DeltaBadge pct={item.delta} />
            </div>
            <div className="flex items-end justify-between gap-2">
              <FlashValue
                value={item.value}
                tone={item.tone}
                className="text-xl leading-none md:text-2xl"
              />
              {item.spark && <MiniSpark data={item.spark} color={item.sparkColor} />}
            </div>
          </div>
        ))}
      </div>

      {/* Product breakdown table */}
      <section className="mb-6 border border-[var(--bb-line)]">
        <div className="flex items-center justify-between border-b border-[var(--bb-line)] px-4 py-2.5">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--bb-label)]">
            Product P&amp;L · This period
          </h2>
          <span className="bb-mono text-[10px] text-[var(--bb-muted)]">
            {productRows.length} SKU{productRows.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[var(--bb-line)] text-[10px] uppercase tracking-[0.12em] text-[var(--bb-muted)]">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 text-right font-medium">Units</th>
                <th className="px-4 py-2 text-right font-medium">Mfg cost</th>
                <th className="px-4 py-2 text-right font-medium">Revenue</th>
                <th className="px-4 py-2 text-right font-medium">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {!productRows.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--bb-muted)]">
                    No product sales this month yet.
                  </td>
                </tr>
              ) : (
                productRows.map((row) => (
                  <tr
                    key={row.id}
                    className="bb-row-alt border-b border-[var(--bb-line)] last:border-b-0"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/products/${row.id}`}
                        className="text-[var(--bb-text)] hover:text-[var(--bb-amber)]"
                      >
                        {row.name}
                      </Link>
                      {row.missingMfg && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--bb-amber)]">
                          no mfg
                        </span>
                      )}
                    </td>
                    <td className="bb-mono px-4 py-2.5 text-right tabular-nums text-[var(--bb-text)]">
                      {row.units}
                    </td>
                    <td className="bb-mono px-4 py-2.5 text-right tabular-nums text-[var(--bb-amber)]">
                      {formatINR(row.mfgCost)}
                    </td>
                    <td className="bb-mono px-4 py-2.5 text-right tabular-nums text-[var(--bb-text)]">
                      {formatINR(row.revenue)}
                    </td>
                    <td
                      className={`bb-mono px-4 py-2.5 text-right tabular-nums ${
                        row.marginPct == null
                          ? "text-[var(--bb-muted)]"
                          : row.marginPct >= 0
                            ? "text-[var(--bb-emerald)]"
                            : "text-[var(--bb-rose)]"
                      }`}
                    >
                      {row.marginPct == null ? "-" : `${row.marginPct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dense secondary strips */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-[var(--bb-line)]">
          <div className="flex items-center justify-between border-b border-[var(--bb-line)] px-4 py-2.5">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--bb-label)]">
              Recent invoices
            </h2>
            <Link
              href="/invoices"
              className="text-[10px] uppercase tracking-wider text-[var(--bb-muted)] hover:text-[var(--bb-amber)]"
            >
              All
            </Link>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {!stats.allInvoices.length ? (
              <li className="px-4 py-6 text-center text-[12px] text-[var(--bb-muted)]">No invoices</li>
            ) : (
              stats.allInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="bb-row-alt flex items-center justify-between gap-3 border-b border-[var(--bb-line)] px-4 py-2 last:border-b-0"
                >
                  <Link href={`/invoices/${inv.id}`} className="min-w-0 flex-1 hover:text-[var(--bb-amber)]">
                    <p className="bb-mono text-[11px] text-[var(--bb-amber)]">{inv.invoice_number}</p>
                    <p className="truncate text-[12px] text-[var(--bb-label)]">
                      {inv.customer?.name ?? "-"} · {formatDate(inv.invoice_date)}
                    </p>
                  </Link>
                  <span className="bb-mono shrink-0 text-[12px] tabular-nums text-[var(--bb-text)]">
                    {formatINR(inv.grand_total)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border border-[var(--bb-line)]">
          <div className="flex items-center justify-between border-b border-[var(--bb-line)] px-4 py-2.5">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--bb-label)]">
              Stock attention
            </h2>
            <span className="bb-mono text-[10px] text-[var(--bb-rose)]">{stats.needsAttention}</span>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {!stats.attentionList.length ? (
              <li className="px-4 py-6 text-center text-[12px] text-[var(--bb-muted)]">
                All SKUs above reorder
              </li>
            ) : (
              stats.attentionList.map((p) => {
                const qty = p.current_stock ?? 0;
                const out = qty <= 0;
                return (
                  <li
                    key={p.id}
                    className="bb-row-alt flex items-center justify-between gap-3 border-b border-[var(--bb-line)] px-4 py-2 last:border-b-0"
                  >
                    <Link
                      href={`/products/${p.id}`}
                      className="truncate text-[12px] text-[var(--bb-text)] hover:text-[var(--bb-amber)]"
                    >
                      {p.name}
                    </Link>
                    <span
                      className={`bb-mono text-[11px] tabular-nums ${
                        out ? "text-[var(--bb-rose)]" : "text-[var(--bb-amber)]"
                      }`}
                    >
                      {out ? "OUT" : `LOW ${qty}`}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
          <p className="border-t border-[var(--bb-line)] px-4 py-2 text-[10px] text-[var(--bb-muted)]">
            {stats.skusOutOfStock} out · {stats.skusLow} low
          </p>
        </section>
      </div>
    </div>
  );
}
