"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import type { MetalType } from "@/lib/jewellery";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type MetalRate = {
  id: string;
  organization_id: string;
  metal_type: MetalType;
  purity: string;
  rate_per_gram: number;
  effective_date: string;
  created_by: string | null;
  created_at: string;
};

type RateKey = string;

function rateKey(metal: string, purity: string): RateKey {
  return `${metal}|${purity}`;
}

/** Latest rate per metal+purity (by effective_date then created_at). */
export function latestRatesMap(rows: MetalRate[]): Map<RateKey, MetalRate> {
  const map = new Map<RateKey, MetalRate>();
  for (const row of rows) {
    const key = rateKey(row.metal_type, row.purity);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    const newerDate = row.effective_date > existing.effective_date;
    const sameDateNewer =
      row.effective_date === existing.effective_date &&
      row.created_at > existing.created_at;
    if (newerDate || sameDateNewer) map.set(key, row);
  }
  return map;
}

export function findLatestRate(
  rows: MetalRate[] | undefined,
  metal: string | null | undefined,
  purity: string | null | undefined
): MetalRate | null {
  if (!rows?.length || !metal || !purity) return null;
  return latestRatesMap(rows).get(rateKey(metal, purity)) ?? null;
}

const demoRates: MetalRate[] = [];

export function useMetalRates() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  return useQuery({
    queryKey: ["metal_rates", orgId],
    enabled: Boolean(orgId) || isDemoMode(),
    queryFn: async (): Promise<MetalRate[]> => {
      if (isDemoMode()) {
        return [...demoRates].sort((a, b) =>
          a.effective_date === b.effective_date
            ? b.created_at.localeCompare(a.created_at)
            : b.effective_date.localeCompare(a.effective_date)
        );
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from("metal_rates")
        .select("*")
        .order("effective_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as MetalRate[];
    },
  });
}

export function useMetalRateMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const saveRate = useMutation({
    mutationFn: async (input: {
      metal_type: MetalType;
      purity: string;
      rate_per_gram: number;
      effective_date?: string;
    }) => {
      if (isDemoMode()) {
        const row: MetalRate = {
          id: crypto.randomUUID(),
          organization_id: user?.organization_id ?? "demo-org",
          metal_type: input.metal_type,
          purity: input.purity,
          rate_per_gram: input.rate_per_gram,
          effective_date: input.effective_date ?? new Date().toISOString().slice(0, 10),
          created_by: user?.id ?? null,
          created_at: new Date().toISOString(),
        };
        demoRates.unshift(row);
        return row;
      }
      if (!user?.organization_id) throw new Error("No organization");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("metal_rates")
        .insert({
          organization_id: user.organization_id,
          metal_type: input.metal_type,
          purity: input.purity,
          rate_per_gram: input.rate_per_gram,
          effective_date: input.effective_date ?? new Date().toISOString().slice(0, 10),
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as MetalRate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metal_rates"] });
    },
  });

  const saveMany = useMutation({
    mutationFn: async (
      rows: {
        metal_type: MetalType;
        purity: string;
        rate_per_gram: number;
        effective_date?: string;
      }[]
    ) => {
      const results: MetalRate[] = [];
      for (const row of rows) {
        if (!(Number(row.rate_per_gram) > 0)) continue;
        results.push(await saveRate.mutateAsync(row));
      }
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metal_rates"] });
    },
  });

  return { saveRate, saveMany };
}
