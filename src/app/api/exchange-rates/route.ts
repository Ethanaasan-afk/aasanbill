import { NextResponse } from "next/server";
import { FALLBACK_RATES, WORLD_CURRENCIES } from "@/lib/currencies";

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/INR", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    if (data.result !== "success" || !data.rates) throw new Error("Bad payload");

    const codes = WORLD_CURRENCIES.map((c) => c.code);
    const rates: Record<string, number> = { INR: 1 };
    for (const code of codes) {
      if (typeof data.rates[code] === "number") rates[code] = data.rates[code];
    }

    return NextResponse.json({
      base: "INR",
      rates,
      updatedAt: data.time_last_update_utc ?? new Date().toUTCString(),
      source: "live",
    });
  } catch {
    return NextResponse.json({
      base: "INR",
      rates: { INR: 1, ...FALLBACK_RATES },
      updatedAt: new Date().toUTCString(),
      source: "fallback",
    });
  }
}
