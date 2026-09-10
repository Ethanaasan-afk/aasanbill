import { createClient } from "@/lib/supabase/server";
import {
  backfillLiveRateHistory,
  ensureDiamondIndexFromHistory,
  refreshLiveMetalRates,
} from "@/lib/live-metal-rates-server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await refreshLiveMetalRates();
    try {
      await backfillLiveRateHistory(7);
      await ensureDiamondIndexFromHistory(7);
    } catch {
      /* trend backfill is best-effort */
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message || "Live rates unavailable right now" },
      { status: 502 }
    );
  }
}
