"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { requireOrganizationId } from "@/lib/org";
import { checkPlanLimit, planLimitErrorMessage } from "@/lib/billing/limits";
import { createClient } from "@/lib/supabase/client";
import { fetchProductStock, fetchProductStockMap } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Unused DB columns - never read/write from app UI. */
const UNUSED_PRODUCT_COLUMNS = [
  "distributor_price",
  "wholesaler_price",
  "retailer_price",
  "mrp",
] as const;

function stripUnusedProductFields<T extends Record<string, unknown>>(row: T) {
  const next = { ...row };
  for (const key of UNUSED_PRODUCT_COLUMNS) {
    delete next[key];
  }
  return next;
}

async function fetchProducts(): Promise<Product[]> {
  if (isDemoMode()) return demoDb.getProducts();

  const supabase = createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("name");
  if (error) throw error;

  const stockMap = await fetchProductStockMap(supabase);

  return (products ?? []).map((p) => {
    const cleaned = stripUnusedProductFields(p as Record<string, unknown>);
    return {
      ...cleaned,
      base_price: Number(p.base_price),
      manufacturing_cost:
        p.manufacturing_cost != null ? Number(p.manufacturing_cost) : null,
      gst_rate: Number(p.gst_rate),
      current_stock: stockMap.get(p.id) ?? 0,
    } as Product;
  });
}

export function useProducts(activeOnly = false) {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    select: (data) => (activeOnly ? data.filter((p) => p.is_active) : data),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    enabled: !!id,
    queryFn: async () => {
      if (isDemoMode()) {
        const p = demoDb.getProduct(id);
        if (!p) throw new Error("Product not found");
        return p;
      }
      const supabase = createClient();
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (error) throw error;
      const current_stock = await fetchProductStock(supabase, id);
      const cleaned = stripUnusedProductFields(data as Record<string, unknown>);
      return {
        ...cleaned,
        base_price: Number(data.base_price),
        manufacturing_cost:
          data.manufacturing_cost != null ? Number(data.manufacturing_cost) : null,
        gst_rate: Number(data.gst_rate),
        current_stock,
      } as Product;
    },
  });
}

export function useProductMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate } = useOrgAccess();

  const upsert = useMutation({
    mutationFn: async (payload: Partial<Product> & { name: string }) => {
      if (!payload.id) assertCanCreate();
      if (isDemoMode()) return demoDb.upsertProduct(payload);

      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      if (!payload.id) {
        const limit = await checkPlanLimit(supabase, orgId, "products");
        if (!limit.ok) throw new Error(planLimitErrorMessage(limit));
      }
      const cleaned = stripUnusedProductFields({
        ...payload,
        mfg_date: payload.mfg_date || null,
        exp_date: payload.exp_date || null,
        imei_serial: payload.imei_serial || null,
        batch_number: payload.batch_number || null,
        is_service: Boolean(payload.is_service),
        manufacturing_cost:
          payload.manufacturing_cost === undefined || payload.manufacturing_cost === null
            ? null
            : Number(payload.manufacturing_cost),
      } as Record<string, unknown>);
      
      if (cleaned.id) {
        const id = String(cleaned.id);
        const rest = { ...cleaned };
        delete rest.id;
        delete rest.current_stock;
        delete rest.created_at;
        delete rest.organization_id;
        let { data, error } = await supabase
          .from("products")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        
        if (error && /imei_serial|batch_number|is_service|metal_type|purity|huid|gross_weight|net_weight|making_charge|stone_value|wastage_percent|schema cache|Could not find the .* column/i.test(error.message)) {
          // FIX: Removed unused destructuring variables and used delete instead
          const withoutExtras = { ...rest } as Record<string, unknown>;
          delete withoutExtras.imei_serial;
          delete withoutExtras.batch_number;
          delete withoutExtras.is_service;
          delete withoutExtras.metal_type;
          delete withoutExtras.purity;
          delete withoutExtras.huid_number;
          delete withoutExtras.gross_weight;
          delete withoutExtras.net_weight;
          delete withoutExtras.making_charge_type;
          delete withoutExtras.making_charge_value;
          delete withoutExtras.stone_value;
          delete withoutExtras.wastage_percent;

          const retry = await supabase
            .from("products")
            .update({ ...withoutExtras, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }
        if (error) throw error;
        return data;
      }
      
      const rest = { ...cleaned };
      delete rest.id;
      delete rest.current_stock;
      delete rest.created_at;
      delete rest.updated_at;
      let { data, error } = await supabase
        .from("products")
        .insert({ ...rest, organization_id: orgId })
        .select()
        .single();
        
      if (error && /imei_serial|batch_number|is_service|metal_type|purity|huid|gross_weight|net_weight|making_charge|stone_value|wastage_percent|schema cache|Could not find the .* column/i.test(error.message)) {
        // FIX: Removed unused destructuring variables and used delete instead
        const withoutExtras = { ...rest } as Record<string, unknown>;
        delete withoutExtras.imei_serial;
        delete withoutExtras.batch_number;
        delete withoutExtras.is_service;
        delete withoutExtras.metal_type;
        delete withoutExtras.purity;
        delete withoutExtras.huid_number;
        delete withoutExtras.gross_weight;
        delete withoutExtras.net_weight;
        delete withoutExtras.making_charge_type;
        delete withoutExtras.making_charge_value;
        delete withoutExtras.stone_value;
        delete withoutExtras.wastage_percent;

        const retry = await supabase
          .from("products")
          .insert({ ...withoutExtras, organization_id: orgId })
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode()) {
        demoDb.deleteProduct(id);
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  return { upsert, remove };
}

export function usePriceHistory(productId: string) {
  return useQuery({
    queryKey: ["price_history", productId],
    enabled: !!productId,
    queryFn: async () => {
      if (isDemoMode()) return demoDb.getPriceHistory(productId);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("price_history")
        .select("*")
        .eq("product_id", productId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}