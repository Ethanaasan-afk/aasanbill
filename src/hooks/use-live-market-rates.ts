"use client";

import { useQuery } from "@tanstack/react-query";
import type { LiveMetalRateRow } from "@/lib/live-metal-rates";

export type LiveMarketRatesData = {
  ok: boolean;
  rates: LiveMetalRateRow[];
  history: LiveMetalRateRow[];
  unavailable: string | null;
};

export function useLiveMarketRates(enabled = true, refetchMs = 0) {
  return useQuery<LiveMarketRatesData>({
    queryKey: ["live_metal_rates_market"],
    enabled,
    staleTime: refetchMs ? Math.min(refetchMs, 20_000) : 5 * 60 * 1000,
    refetchInterval: refetchMs || false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch("/api/metal-rates/live", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        rates?: LiveMetalRateRow[];
        history?: LiveMetalRateRow[];
        warning?: string;
      };
      return {
        ok: Boolean(json.ok && (json.rates?.length ?? 0) > 0),
        rates: json.rates ?? [],
        history: json.history ?? [],
        unavailable:
          !json.ok && !(json.rates && json.rates.length)
            ? json.detail || json.error || "Live rates unavailable right now"
            : json.warning ?? null,
      };
    },
  });
}
