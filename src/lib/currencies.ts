/** Major / most-traded world currencies for reference pricing (base = INR). */

export type CurrencyInfo = {
  code: string;
  name: string;
  /** Highlight as globally most used */
  mostUsed?: boolean;
};

/** Ordered: most-used first, then other major & regionally useful codes */
export const WORLD_CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar", mostUsed: true },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "THB", name: "Thai Baht" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "KRW", name: "South Korean Won" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "ZAR", name: "South African Rand" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "RUB", name: "Russian Ruble" },
];

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "JPY" || currency === "KRW" || currency === "IDR" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" || currency === "KRW" || currency === "IDR" ? 0 : 4,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Fallback rates: foreign units per 1 INR (approx Jul 2026) */
export const FALLBACK_RATES: Record<string, number> = {
  USD: 0.01035,
  EUR: 0.0091,
  GBP: 0.00777,
  JPY: 1.696,
  CNY: 0.0702,
  AED: 0.038,
  SAR: 0.0388,
  AUD: 0.0148,
  CAD: 0.0146,
  CHF: 0.00846,
  SGD: 0.0134,
  HKD: 0.0812,
  MYR: 0.0424,
  THB: 0.349,
  IDR: 185.5,
  KRW: 15.13,
  NZD: 0.0179,
  ZAR: 0.174,
  BRL: 0.0526,
  MXN: 0.181,
  TRY: 0.49,
  RUB: 0.81,
};
