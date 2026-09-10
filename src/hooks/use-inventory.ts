"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import { resolveDefaultWarehouseId } from "@/lib/warehouse";
import type { StockMovement } from "@/lib/types";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useStockMovements(productId?: string) {
  return useQuery({
    queryKey: ["stock_movements", productId ?? "all"],
    queryFn: async () => {
      if (isDemoMode()) return demoDb.getMovements(productId);

      const supabase = createClient();
      let q = supabase
        .from("stock_movements")
        .select(
          "*, product:products(*), user:users!created_by(*), editor:users!edited_by(*)"
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (productId) q = q.eq("product_id", productId);
      let { data, error } = await q;

      // Fallback if edited_by column / FK not migrated yet
      if (error) {
        let q2 = supabase
          .from("stock_movements")
          .select("*, product:products(*), user:users!created_by(*)")
          .order("created_at", { ascending: false })
          .limit(200);
        if (productId) q2 = q2.eq("product_id", productId);
        const retry = await q2;
        if (retry.error) throw retry.error;
        data = retry.data;
        error = null;
      }
      if (error) throw error;
      return (data ?? []) as StockMovement[];
    },
  });
}

export function useStockMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate } = useOrgAccess();

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["stock_movements"] }),
      qc.invalidateQueries({ queryKey: ["products"] }),
    ]);
  };

  const stockIn = useMutation({
    mutationFn: async (input: {
      product_id: string;
      quantity: number;
      source: "production" | "purchase";
      batch_number?: string | null;
      mfg_date?: string | null;
      exp_date?: string | null;
      notes?: string | null;
      user_id: string;
      warehouse_id?: string | null;
    }) => {
      assertCanCreate();
      const warehouse_id = input.warehouse_id ?? (await resolveDefaultWarehouseId());
      if (isDemoMode()) {
        demoDb.stockIn({ ...input, warehouse_id });
        return;
      }
      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const payload = {
        product_id: input.product_id,
        movement_type: "in" as const,
        quantity: Math.abs(input.quantity),
        reference: input.source === "production" ? "Production batch" : "Purchase",
        reason: input.notes ?? null,
        batch_number: input.batch_number ?? null,
        mfg_date: input.mfg_date || null,
        exp_date: input.exp_date || null,
        created_by: input.user_id,
        warehouse_id,
        organization_id: orgId,
      };
      const { data, error } = await supabase
        .from("stock_movements")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const stockOut = useMutation({
    mutationFn: async (input: {
      product_id: string;
      quantity: number;
      reason: string;
      notes?: string | null;
      user_id: string;
      warehouse_id?: string | null;
    }) => {
      assertCanCreate();
      const warehouse_id = input.warehouse_id ?? (await resolveDefaultWarehouseId());
      if (isDemoMode()) {
        demoDb.stockOut({ ...input, warehouse_id });
        return;
      }
      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_movements")
        .insert({
          product_id: input.product_id,
          movement_type: "out",
          quantity: -Math.abs(input.quantity),
          reference: "Manual out",
          reason: `${input.reason}${input.notes ? ` - ${input.notes}` : ""}`,
          created_by: input.user_id,
          warehouse_id,
          organization_id: orgId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const adjust = useMutation({
    mutationFn: async (input: {
      product_id: string;
      new_quantity: number;
      reason: string;
      user_id: string;
      current_stock: number;
      warehouse_id?: string | null;
    }) => {
      assertCanCreate();
      const warehouse_id = input.warehouse_id ?? (await resolveDefaultWarehouseId());
      if (isDemoMode()) {
        demoDb.adjust({ ...input, warehouse_id });
        return;
      }
      const delta = input.new_quantity - input.current_stock;
      if (delta === 0) return;
      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_movements")
        .insert({
          product_id: input.product_id,
          movement_type: "adjustment",
          quantity: delta,
          reference: "Physical stock count",
          reason: input.reason,
          created_by: input.user_id,
          warehouse_id,
          organization_id: orgId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateMovement = useMutation({
    mutationFn: async (input: {
      id: string;
      movement_type: "in" | "out" | "adjustment";
      quantity: number;
      reason?: string | null;
      reference?: string | null;
      batch_number?: string | null;
      mfg_date?: string | null;
      exp_date?: string | null;
      edited_by: string;
    }) => {
      let quantity = input.quantity;
      if (input.movement_type === "in") quantity = Math.abs(input.quantity);
      if (input.movement_type === "out") quantity = -Math.abs(input.quantity);

      if (isDemoMode()) {
        return demoDb.updateMovement({
          id: input.id,
          quantity,
          reason: input.reason,
          reference: input.reference,
          batch_number: input.batch_number,
          mfg_date: input.mfg_date,
          exp_date: input.exp_date,
          edited_by: input.edited_by,
        });
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_movements")
        .update({
          quantity,
          reason: input.reason ?? null,
          reference: input.reference ?? null,
          batch_number: input.batch_number ?? null,
          mfg_date: input.mfg_date || null,
          exp_date: input.exp_date || null,
          edited_at: new Date().toISOString(),
          edited_by: input.edited_by,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  return { stockIn, stockOut, adjust, updateMovement };
}
