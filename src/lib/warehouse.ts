import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/client";

/** Resolve active default warehouse (or first active). Cached per call site via React Query elsewhere. */
export async function resolveDefaultWarehouseId(): Promise<string | null> {
  if (isDemoMode()) {
    const list = demoDb.getWarehouses().filter((w) => w.is_active);
    return (list.find((w) => w.is_default) ?? list[0])?.id ?? null;
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, is_default")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .limit(1);
  if (error) {
    // Warehouses table may not exist yet (migration 013 not run)
    console.warn("[warehouse]", error.message);
    return null;
  }
  return data?.[0]?.id ?? null;
}
