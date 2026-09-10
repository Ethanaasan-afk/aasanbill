import { createClient } from "@/lib/supabase/client";

/**
 * Live stock = sum of signed quantities in stock_movements
 * (in = +, out = -, adjustment = signed delta).
 *
 * Prefers the product_stock view; falls back to summing movements
 * if the view is missing or blocked (common after a minimal schema run).
 */
export async function fetchProductStockMap(
  supabase: ReturnType<typeof createClient>
): Promise<Map<string, number>> {
  const { data: viewRows, error: viewError } = await supabase
    .from("product_stock")
    .select("product_id, current_stock");

  if (!viewError && viewRows) {
    return new Map(
      viewRows.map((s) => [s.product_id as string, Number(s.current_stock) || 0])
    );
  }

  if (viewError) {
    console.warn(
      "[stock] product_stock view failed - falling back to stock_movements sum:",
      viewError.message
    );
  }

  const { data: movements, error: movError } = await supabase
    .from("stock_movements")
    .select("product_id, quantity");

  if (movError) {
    console.error("[stock] stock_movements sum failed:", movError);
    return new Map();
  }

  const map = new Map<string, number>();
  for (const m of movements ?? []) {
    const id = m.product_id as string;
    const qty = Number(m.quantity) || 0;
    map.set(id, (map.get(id) ?? 0) + qty);
  }
  return map;
}

export async function fetchProductStock(
  supabase: ReturnType<typeof createClient>,
  productId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("product_stock")
    .select("current_stock")
    .eq("product_id", productId)
    .maybeSingle();

  if (!error && data) return Number(data.current_stock) || 0;

  if (error) {
    console.warn(
      "[stock] product_stock row failed - falling back to movements:",
      error.message
    );
  }

  const { data: movements, error: movError } = await supabase
    .from("stock_movements")
    .select("quantity")
    .eq("product_id", productId);

  if (movError) {
    console.error("[stock] movements fallback failed:", movError);
    return 0;
  }

  return (movements ?? []).reduce((s, m) => s + (Number(m.quantity) || 0), 0);
}
