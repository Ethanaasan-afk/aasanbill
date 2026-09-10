/** Internal margin vs base_price - never used for invoices or GST. */

export type MarginTone = "emerald" | "amber" | "rose";

export type MarginInfo = {
  percent: number;
  tone: MarginTone;
  label: string;
};

/**
 * (base − cost) / base × 100.
 * Returns null when cost is unset or base is 0 (nothing useful to show).
 */
export function calcProductMargin(
  basePrice: number,
  manufacturingCost: number | null | undefined
): MarginInfo | null {
  if (manufacturingCost == null || !Number.isFinite(manufacturingCost)) return null;
  const base = Number(basePrice) || 0;
  if (base <= 0) return null;
  const percent = ((base - manufacturingCost) / base) * 100;
  const tone: MarginTone =
    percent < 0 ? "rose" : percent <= 20 ? "amber" : "emerald";
  const rounded = Math.round(percent * 10) / 10;
  const label = `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
  return { percent, tone, label };
}

export const MARGIN_BADGE_CLASS: Record<MarginTone, string> = {
  emerald: "bg-emerald-soft text-emerald",
  amber: "bg-[rgba(255,159,90,0.16)] text-tangerine-deep",
  rose: "bg-rose-soft text-coral-deep",
};

/** UI helper - base excl. GST + GST%. Not stored. */
export function priceWithGst(baseExclGst: number, gstRate: number): number {
  const base = Number(baseExclGst) || 0;
  const rate = Number(gstRate) || 0;
  return base + (base * rate) / 100;
}
