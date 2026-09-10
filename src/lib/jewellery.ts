/**
 * Jewellery pricing engine - weight × live/shop metal rate + making + wastage (+ stone).
 * Isolated from the fixed base_price model used by other business types.
 */

export const METAL_TYPES = ["gold", "silver", "platinum", "palladium"] as const;
export type MetalType = (typeof METAL_TYPES)[number];

/** Catalog purity choices aligned with live_metal_rates categories. */
export const JEWELLERY_PURITY_OPTIONS = [
  { metal_type: "gold" as const, purity: "24k", label: "24K" },
  { metal_type: "gold" as const, purity: "22k", label: "22K" },
  { metal_type: "gold" as const, purity: "18k", label: "18K" },
  { metal_type: "silver" as const, purity: "999", label: "Silver" },
  { metal_type: "platinum" as const, purity: "999", label: "Platinum" },
  { metal_type: "palladium" as const, purity: "999", label: "Palladium" },
] as const;

export type JewelleryPurityOption = (typeof JEWELLERY_PURITY_OPTIONS)[number];

export const GOLD_PURITIES = ["24k", "22k", "18k", "14k"] as const;
export const SILVER_PURITIES = ["999", "925"] as const;
export type GoldPurity = (typeof GOLD_PURITIES)[number];
export type SilverPurity = (typeof SILVER_PURITIES)[number];
export type MetalPurity = GoldPurity | SilverPurity | "999";

export const MAKING_CHARGE_TYPES = ["flat", "per_gram", "percent"] as const;
export type MakingChargeType = (typeof MAKING_CHARGE_TYPES)[number];

/** UI toggle: fixed ₹ amount OR % of metal value (per_gram kept for legacy rows). */
export const MAKING_CHARGE_TYPE_OPTIONS = [
  { value: "flat", label: "Fixed amount (₹)" },
  { value: "percent", label: "Percentage of metal value" },
] as const;

export const JEWELLERY_CATEGORIES = [
  "Ring",
  "Necklace",
  "Bangle",
  "Chain",
  "Earring",
  "Bracelet",
  "Coin",
  "Other",
] as const;

export const JEWELLERY_DEFAULT_GST = 3;
export const JEWELLERY_DEFAULT_HSN = "7113";
export const JEWELLERY_HSN_HELP =
  "Articles of jewellery of precious metal typically fall under HSN 7113 — confirm the exact code for your item.";

export const METAL_TYPE_OPTIONS = [
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "platinum", label: "Platinum" },
  { value: "palladium", label: "Palladium" },
] as const;

export type RateSource = "live_metal_rates" | "metal_rates" | "manual";

export function puritiesForMetal(metal: MetalType | string | null | undefined): readonly string[] {
  if (metal === "silver") return SILVER_PURITIES;
  if (metal === "platinum" || metal === "palladium") return ["999"] as const;
  return GOLD_PURITIES;
}

export function purityOptionsForMetal(metal: MetalType | string | null | undefined) {
  return puritiesForMetal(metal).map((p) => ({
    value: p,
    label: metal === "gold" || /^\d+k$/i.test(p) ? p.toUpperCase() : p,
  }));
}

export function jewelleryPurityKey(metal: string, purity: string): string {
  return `${metal}|${purity}`;
}

export function parseJewelleryPurityKey(key: string): { metal_type: MetalType; purity: string } {
  const [metal, purity] = key.split("|");
  const opt = JEWELLERY_PURITY_OPTIONS.find(
    (o) => o.metal_type === metal && o.purity === purity
  );
  if (opt) return { metal_type: opt.metal_type, purity: opt.purity };
  if (metal === "silver" || metal === "platinum" || metal === "palladium" || metal === "gold") {
    return { metal_type: metal, purity: purity || "22k" };
  }
  return { metal_type: "gold", purity: "22k" };
}

export function formatPurityLabel(purity: string | null | undefined): string {
  if (!purity) return "-";
  if (/^\d+k$/i.test(purity)) return purity.toUpperCase();
  if (purity === "999") return purity;
  return purity;
}

export function formatMetalLabel(metal: string | null | undefined): string {
  if (metal === "gold") return "Gold";
  if (metal === "silver") return "Silver";
  if (metal === "platinum") return "Platinum";
  if (metal === "palladium") return "Palladium";
  return metal ?? "-";
}

export function formatJewelleryCatalogLabel(
  metal: string | null | undefined,
  purity: string | null | undefined
): string {
  const opt = JEWELLERY_PURITY_OPTIONS.find(
    (o) => o.metal_type === metal && o.purity === purity
  );
  if (opt) return opt.label;
  return `${formatMetalLabel(metal)} ${formatPurityLabel(purity)}`.trim();
}

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcMakingCharge(input: {
  type: MakingChargeType | string | null | undefined;
  value: number;
  netWeight: number;
  metalValue: number;
}): number {
  const v = Number(input.value) || 0;
  const type = input.type ?? "flat";
  if (type === "per_gram") return roundMoney(v * (Number(input.netWeight) || 0));
  if (type === "percent") return roundMoney(((Number(input.metalValue) || 0) * v) / 100);
  return roundMoney(v);
}

export type JewelleryPriceBreakdown = {
  ratePerGram: number;
  netWeight: number;
  grossWeight: number;
  metalValue: number;
  makingCharge: number;
  wastageAmount: number;
  stoneValue: number;
  taxableValue: number;
  wastagePercent: number;
};

/**
 * Metal = weight × rate/g
 * Wastage = metal × wastage_percent / 100
 * Taxable = metal + making + wastage + stone (before GST)
 */
export function calcJewelleryTaxable(input: {
  netWeight: number;
  grossWeight?: number;
  ratePerGram: number;
  makingChargeType: MakingChargeType | string | null | undefined;
  makingChargeValue: number;
  stoneValue?: number | null;
  wastagePercent?: number | null;
}): JewelleryPriceBreakdown {
  const netWeight = Number(input.netWeight) || 0;
  const grossWeight = Number(input.grossWeight ?? netWeight) || 0;
  const ratePerGram = Number(input.ratePerGram) || 0;
  const wastagePercent = Number(input.wastagePercent) || 0;
  const metalValue = roundMoney(netWeight * ratePerGram);
  const makingCharge = calcMakingCharge({
    type: input.makingChargeType,
    value: Number(input.makingChargeValue) || 0,
    netWeight,
    metalValue,
  });
  const wastageAmount = roundMoney((metalValue * wastagePercent) / 100);
  const stoneValue = roundMoney(Number(input.stoneValue) || 0);
  const taxableValue = roundMoney(metalValue + makingCharge + wastageAmount + stoneValue);
  return {
    ratePerGram,
    netWeight,
    grossWeight,
    metalValue,
    makingCharge,
    wastageAmount,
    stoneValue,
    taxableValue,
    wastagePercent,
  };
}

export function isJewelleryProduct(
  product: { metal_type?: string | null } | null | undefined
): boolean {
  const m = product?.metal_type;
  return m === "gold" || m === "silver" || m === "platinum" || m === "palladium";
}

/** Resolve ₹/g from live market rows (live_metal_rates shape). */
export function findLiveRatePerGram(
  rows:
    | { metal_type: string; karat_or_purity: string; rate_per_gram_inr: number }[]
    | undefined,
  metal: string | null | undefined,
  purity: string | null | undefined
): number | null {
  if (!rows?.length || !metal || !purity) return null;
  const hit = rows.find(
    (r) => r.metal_type === metal && r.karat_or_purity === purity
  );
  if (!hit || !(Number(hit.rate_per_gram_inr) > 0)) return null;
  return Number(hit.rate_per_gram_inr);
}

/**
 * Prefer live_metal_rates, then org Today's Rates (metal_rates).
 * Returns rate + which source was used.
 */
export function resolveJewelleryRatePerGram(input: {
  metal: string | null | undefined;
  purity: string | null | undefined;
  liveRates?:
    | { metal_type: string; karat_or_purity: string; rate_per_gram_inr: number }[]
    | undefined;
  shopRatePerGram?: number | null;
}): { ratePerGram: number; source: RateSource | null } {
  const live = findLiveRatePerGram(input.liveRates, input.metal, input.purity);
  if (live != null) return { ratePerGram: live, source: "live_metal_rates" };
  const shop = Number(input.shopRatePerGram) || 0;
  if (shop > 0) return { ratePerGram: shop, source: "metal_rates" };
  return { ratePerGram: 0, source: null };
}

/** Build line pricing from product catalog + a locked metal rate (₹/g). */
export function jewelleryLineFromProduct(
  product: {
    metal_type?: string | null;
    purity?: string | null;
    huid_number?: string | null;
    gross_weight?: number | null;
    net_weight?: number | null;
    making_charge_type?: string | null;
    making_charge_value?: number | null;
    stone_value?: number | null;
    wastage_percent?: number | null;
    base_price: number;
  },
  ratePerGram: number
) {
  const breakdown = calcJewelleryTaxable({
    netWeight: Number(product.net_weight) || 0,
    grossWeight: Number(product.gross_weight) || Number(product.net_weight) || 0,
    ratePerGram,
    makingChargeType: product.making_charge_type,
    makingChargeValue: Number(product.making_charge_value) || 0,
    stoneValue: Number(product.stone_value) || 0,
    wastagePercent: Number(product.wastage_percent) || 0,
  });
  return {
    ...breakdown,
    jewellery_purity: product.purity ?? null,
    jewellery_huid: product.huid_number ?? null,
    /** Piece qty stays 1; unit_price carries full taxable for GST engine */
    quantity: 1,
    unit_price: breakdown.taxableValue,
  };
}
