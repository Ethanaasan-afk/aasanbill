/** Golden angle in degrees - spreads hues evenly as products accumulate. */
const GOLDEN_ANGLE = 137.5;

/** Fixed brand-safe vibrancy (vivid but not neon). */
const DEFAULT_SATURATION = 65;
const DEFAULT_LIGHTNESS = 55;

/** FNV-1a 32-bit hash of a product ID (stable across renames). */
export function hashProductId(productId: string): number {
  let h = 2166136261;
  for (let i = 0; i < productId.length; i++) {
    h ^= productId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic hue in [0, 360) via golden-angle spacing. */
export function productHue(productId: string): number {
  return (hashProductId(productId) * GOLDEN_ANGLE) % 360;
}

/**
 * Deterministic HSL color for a product ID.
 * Same ID always yields the same color; no DB storage required.
 */
export function productColor(
  productId: string,
  saturation = DEFAULT_SATURATION,
  lightness = DEFAULT_LIGHTNESS
): string {
  const hue = productHue(productId);
  return `hsl(${hue.toFixed(1)} ${saturation}% ${lightness}%)`;
}

/** Soft wash for tags / row backgrounds. */
export function productColorSoft(productId: string): string {
  return productColor(productId, 48, 92);
}

/** Stronger fill for chart areas / stock bars. */
export function productColorMuted(productId: string): string {
  return productColor(productId, 55, 62);
}

/**
 * Readable foreground on `productColor` fills.
 * Mid lightness (~55%) → white text; soft fills → deep ink.
 */
export function productFgOn(
  productId: string,
  lightness = DEFAULT_LIGHTNESS
): string {
  return lightness >= 62 ? "#132420" : "#ffffff";
}

/** Soft tag palette: soft bg + deep accent text. */
export function productTagStyle(productId: string): {
  background: string;
  color: string;
  borderColor: string;
} {
  return {
    background: productColorSoft(productId),
    color: productColor(productId, 55, 32),
    borderColor: productColor(productId, 40, 78),
  };
}
