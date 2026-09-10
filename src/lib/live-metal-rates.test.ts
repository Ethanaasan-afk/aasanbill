/**
 * Quick sanity checks - run with: npx tsx src/lib/live-metal-rates.test.ts
 */
import {
  buildLiveRateInserts,
  goldKaratPerGram,
  isLiveRatesStale,
  tozToPerGramInr,
} from "./live-metal-rates";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const perG = tozToPerGramInr(3110.35);
assert(perG === 100, `toz->g got ${perG}`);

assert(goldKaratPerGram(10000, "22k") === 9160, "22k");
assert(goldKaratPerGram(10000, "18k") === 7500, "18k");
assert(goldKaratPerGram(10000, "14k") === 5850, "14k");

const rows = buildLiveRateInserts({
  status: "success",
  metals: { gold: 62207, silver: 777.5875, platinum: 31103.5, palladium: 31103.5 },
});
assert(rows.length === 7, "7 rows");
assert(rows.find((r) => r.karat_or_purity === "24k")!.rate_per_gram_inr === 2000, "gold24");

assert(isLiveRatesStale(null) === true, "null stale");
assert(isLiveRatesStale(new Date().toISOString()) === false, "fresh");

console.log("live-metal-rates.test.ts: ok");
