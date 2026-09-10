import { createClient } from "@/lib/supabase/server";
import { ensureFreshLiveRates } from "@/lib/live-metal-rates-server";
import { NextResponse } from "next/server";

/** Returns latest cached live rates; refreshes from Metals.Dev if older than 10 minutes. */
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await ensureFreshLiveRates();
  if (result.unavailable && !result.rows.length) {
    return NextResponse.json({
      ok: false,
      error: "Live rates unavailable right now",
      detail: result.unavailable,
      rates: [],
      history: [],
    });
  }
  return NextResponse.json({
    ok: true,
    rates: result.rows,
    history: result.history,
    refreshed: result.refreshed,
    warning:
      result.unavailable && result.rows.length ? result.unavailable : undefined,
  });
}
