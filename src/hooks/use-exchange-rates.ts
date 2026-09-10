"use client";

import { useQuery } from "@tanstack/react-query";
import { FALLBACK_RATES } from "@/lib/currencies";

type RatesResponse = {
  base: string;
  rates: Record<string, number>;
  updatedAt: string;
  source: "live" | "fallback";
};

async function fetchRates(): Promise<RatesResponse> {
  const res = await fetch("/api/exchange-rates");
  if (!res.ok) throw new Error("Failed to load rates");
  return res.json();
}

export function useExchangeRates() {
  return useQuery({
    queryKey: ["exchange-rates"],
    queryFn: fetchRates,
    staleTime: 60 * 60 * 1000,
    placeholderData: {
      base: "INR",
      rates: { INR: 1, ...FALLBACK_RATES },
      updatedAt: "",
      source: "fallback" as const,
    },
  });
}
