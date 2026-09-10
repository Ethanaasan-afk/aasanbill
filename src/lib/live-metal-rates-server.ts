import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildLiveRateInserts,
  buildTimeseriesHistoryInserts,
  diamondIndexFromGold24,
  isLiveRatesStale,
  withDiamondIndexRows,
  type LiveMetalRateRow,
  type MetalsDevLatestResponse,
  type MetalsDevTimeseriesResponse,
} from "@/lib/live-metal-rates";
import fs from "fs";
import path from "path";

/** Read METALS_API_KEY even if Next.js failed to inject process.env (common after late .env edits). */
function getMetalsApiKey(): string | undefined {
  const fromEnv = (process.env.METALS_API_KEY || "").trim();
  if (fromEnv) return fromEnv;

  try {
    const filePath = path.join(process.cwd(), ".env.local");
    const text = fs.readFileSync(filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const name = line.slice(0, eq).trim();
      if (name !== "METALS_API_KEY") continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value.trim() || undefined;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function insertLiveRateRows(
  inserts: Omit<LiveMetalRateRow, "id">[]
): Promise<LiveMetalRateRow[]> {
  if (!inserts.length) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.from("live_metal_rates").insert(inserts).select("*");

  if (error) {
    if (/relation .*live_metal_rates.* does not exist|Could not find the table/i.test(error.message)) {
      throw new Error(
        "Table live_metal_rates is missing. Run PASTE_033_live_metal_rates.sql in Supabase SQL Editor."
      );
    }
    throw new Error(error.message);
  }
  return (data ?? []) as LiveMetalRateRow[];
}

export async function refreshLiveMetalRates(): Promise<{
  rows: LiveMetalRateRow[];
  fetched_at: string;
}> {
  const apiKey = getMetalsApiKey();
  if (!apiKey) {
    throw new Error(
      "METALS_API_KEY is missing. Add it to .env.local on its own line (METALS_API_KEY=your_key), save, stop npm run dev, then start it again."
    );
  }

  const url = new URL("https://api.metals.dev/v1/latest");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("currency", "INR");
  url.searchParams.set("unit", "toz");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  let json: MetalsDevLatestResponse;
  try {
    json = (await res.json()) as MetalsDevLatestResponse;
  } catch {
    throw new Error(`Metals.Dev returned non-JSON (HTTP ${res.status})`);
  }

  if (!res.ok || json.status === "failure") {
    throw new Error(
      json.error_message ||
        json.error_code ||
        `Metals.Dev request failed (HTTP ${res.status}). Check the API key on metals.dev.`
    );
  }

  const fetchedAt = json.timestamp || new Date().toISOString();
  const inserts = withDiamondIndexRows(buildLiveRateInserts(json, fetchedAt));
  const data = await insertLiveRateRows(inserts);
  return {
    rows: data,
    fetched_at: fetchedAt,
  };
}

/**
 * Pull last N days from Metals.Dev timeseries and insert any calendar days
 * we do not already have (so the 7-day chart works immediately).
 */
export async function backfillLiveRateHistory(days = 7): Promise<number> {
  const apiKey = getMetalsApiKey();
  if (!apiKey) return 0;

  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const url = new URL("https://api.metals.dev/v1/timeseries");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("start_date", isoDateUTC(start));
  url.searchParams.set("end_date", isoDateUTC(end));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  let json: MetalsDevTimeseriesResponse;
  try {
    json = (await res.json()) as MetalsDevTimeseriesResponse;
  } catch {
    return 0;
  }

  if (!res.ok || json.status === "failure" || !json.rates) {
    return 0;
  }

  const existing = await getLiveRateHistory(days + 1);
  const daysWithGold = new Set(
    existing
      .filter((r) => r.metal_type === "gold" && r.karat_or_purity === "24k")
      .map((r) => r.fetched_at.slice(0, 10))
  );
  const daysWithDiamond = new Set(
    existing
      .filter((r) => r.metal_type === "diamond" && r.karat_or_purity === "1ct")
      .map((r) => r.fetched_at.slice(0, 10))
  );

  const fromSeries = withDiamondIndexRows(buildTimeseriesHistoryInserts(json));
  const inserts: Omit<LiveMetalRateRow, "id">[] = [];

  for (const row of fromSeries) {
    const day = row.fetched_at.slice(0, 10);
    if (!daysWithGold.has(day)) {
      inserts.push(row);
      continue;
    }
    // Day already has metals - only fill missing diamond index
    if (row.metal_type === "diamond" && !daysWithDiamond.has(day)) {
      inserts.push(row);
    }
  }

  // Deduplicate identical metal|purity|day in this batch
  const seen = new Set<string>();
  const unique = inserts.filter((row) => {
    const key = `${row.metal_type}|${row.karat_or_purity}|${row.fetched_at.slice(0, 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!unique.length) return 0;
  await insertLiveRateRows(unique);
  return unique.length;
}

/** If gold history exists but diamond rows are missing, seed diamond from gold. */
export async function ensureDiamondIndexFromHistory(days = 7): Promise<number> {
  const history = await getLiveRateHistory(days);
  const goldByDay = new Map<string, LiveMetalRateRow>();
  const diamondDays = new Set<string>();
  for (const row of history) {
    const day = row.fetched_at.slice(0, 10);
    if (row.metal_type === "gold" && row.karat_or_purity === "24k") {
      goldByDay.set(day, row);
    }
    if (row.metal_type === "diamond" && row.karat_or_purity === "1ct") {
      diamondDays.add(day);
    }
  }

  const inserts: Omit<LiveMetalRateRow, "id">[] = [];
  for (const [day, gold] of Array.from(goldByDay.entries())) {
    if (diamondDays.has(day)) continue;
    inserts.push({
      metal_type: "diamond",
      karat_or_purity: "1ct",
      rate_per_gram_inr: diamondIndexFromGold24(Number(gold.rate_per_gram_inr)),
      fetched_at: `${day}T12:00:00.000Z`,
    });
  }
  if (!inserts.length) return 0;
  await insertLiveRateRows(inserts);
  return inserts.length;
}

export async function getLatestLiveRates(): Promise<LiveMetalRateRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("live_metal_rates")
    .select("*")
    .order("fetched_at", { ascending: false })
    .limit(200);
  if (error) {
    if (/relation .*live_metal_rates.* does not exist|Could not find the table/i.test(error.message)) {
      throw new Error(
        "Table live_metal_rates is missing. Run PASTE_033_live_metal_rates.sql in Supabase SQL Editor."
      );
    }
    throw new Error(error.message);
  }

  const latest = new Map<string, LiveMetalRateRow>();
  for (const row of (data ?? []) as LiveMetalRateRow[]) {
    const key = `${row.metal_type}|${row.karat_or_purity}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return Array.from(latest.values());
}

export async function getLiveRateHistory(days = 7): Promise<LiveMetalRateRow[]> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await admin
    .from("live_metal_rates")
    .select("*")
    .gte("fetched_at", since.toISOString())
    .order("fetched_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as LiveMetalRateRow[];
}

function uniqueGoldDays(history: LiveMetalRateRow[]): number {
  return new Set(
    history
      .filter((r) => r.metal_type === "gold" && r.karat_or_purity === "24k")
      .map((r) => r.fetched_at.slice(0, 10))
  ).size;
}

/** Refresh only when cache is older than 10 minutes; backfill trend history when sparse. */
export async function ensureFreshLiveRates(): Promise<{
  rows: LiveMetalRateRow[];
  history: LiveMetalRateRow[];
  refreshed: boolean;
  unavailable?: string;
}> {
  try {
    let rows = await getLatestLiveRates();
    const newest = rows.reduce<string | null>((acc, r) => {
      if (!acc || r.fetched_at > acc) return r.fetched_at;
      return acc;
    }, null);

    let refreshed = false;
    let refreshError: string | undefined;
    if (isLiveRatesStale(newest)) {
      try {
        await refreshLiveMetalRates();
        rows = await getLatestLiveRates();
        refreshed = true;
      } catch (e) {
        refreshError = (e as Error).message || "Live rates unavailable right now";
        if (!rows.length) {
          return {
            rows: [],
            history: [],
            refreshed: false,
            unavailable: refreshError,
          };
        }
      }
    }

    let history = await getLiveRateHistory(7);
    if (uniqueGoldDays(history) < 7) {
      try {
        await backfillLiveRateHistory(7);
        history = await getLiveRateHistory(7);
      } catch {
        /* keep whatever we have */
      }
    }

    try {
      await ensureDiamondIndexFromHistory(7);
      history = await getLiveRateHistory(7);
      rows = await getLatestLiveRates();
    } catch {
      /* optional */
    }

    return {
      rows,
      history,
      refreshed,
      unavailable: refreshError,
    };
  } catch (e) {
    return {
      rows: [],
      history: [],
      refreshed: false,
      unavailable: (e as Error).message || "Live rates unavailable right now",
    };
  }
}
