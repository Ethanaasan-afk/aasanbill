"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { calcInvoiceTotals } from "@/lib/gst";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type { Purchase } from "@/lib/types";
import { useOrgAccess } from "@/hooks/use-org-access";
import { checkPlanCapability, planLimitErrorMessage } from "@/lib/billing/limits";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type CreatePurchasePayload = {
  supplier_id: string;
  warehouse_id?: string | null;
  purchase_date: string;
  notes?: string;
  user_id: string;
  items: {
    product_id: string;
    quantity: number;
    unit_cost: number;
    batch_number?: string | null;
    mfg_date?: string | null;
    exp_date?: string | null;
  }[];
};

function mapPurchase(row: Record<string, unknown>): Purchase {
  return {
    ...(row as unknown as Purchase),
    subtotal: Number(row.subtotal),
    total_cgst: Number(row.total_cgst),
    total_sgst: Number(row.total_sgst),
    total_igst: Number(row.total_igst),
    round_off: Number(row.round_off),
    grand_total: Number(row.grand_total),
  };
}

export function usePurchases() {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["purchases"],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      if (isDemoMode()) return demoDb.getPurchases();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("purchases")
        .select(
          "*, supplier:suppliers(*), warehouse:warehouses(*), items:purchase_items(*, product:products(*))"
        )
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapPurchase(r as Record<string, unknown>));
    },
  });
}

export function usePurchaseMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate, assertCapability } = useOrgAccess();

  const create = useMutation({
    mutationFn: async (payload: CreatePurchasePayload) => {
      assertCanCreate();
      if (isDemoMode()) {
        assertCapability("purchasesCreditNotes");
        return demoDb.createPurchase(payload);
      }

      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const cap = await checkPlanCapability(supabase, orgId, "purchasesCreditNotes");
      if (!cap.ok) throw new Error(planLimitErrorMessage(cap));

      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, name, hsn_code, gst_rate")
        .in(
          "id",
          payload.items.map((i) => i.product_id)
        );
      if (pErr) throw pErr;

      const { data: supplier, error: sErr } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", payload.supplier_id)
        .single();
      if (sErr) throw sErr;

      const lineInputs = payload.items.map((item) => {
        const product = products?.find((p) => p.id === item.product_id);
        if (!product) throw new Error("Product not found");
        return {
          quantity: item.quantity,
          unitPrice: item.unit_cost,
          gstRate: Number(product.gst_rate),
        };
      });
      const totals = calcInvoiceTotals(lineInputs, supplier.state);

      const { data: purchaseNumber, error: nErr } = await supabase.rpc(
        "next_purchase_number",
        { p_prefix: "PO" }
      );
      if (nErr) throw nErr;

      const { data: purchase, error: insErr } = await supabase
        .from("purchases")
        .insert({
          purchase_number: purchaseNumber as string,
          supplier_id: payload.supplier_id,
          warehouse_id: payload.warehouse_id || null,
          purchase_date: payload.purchase_date,
          subtotal: totals.subtotal,
          total_cgst: totals.totalCgst,
          total_sgst: totals.totalSgst,
          total_igst: totals.totalIgst,
          round_off: totals.roundOff,
          grand_total: totals.grandTotal,
          status: "received",
          notes: payload.notes || null,
          created_by: payload.user_id,
          organization_id: orgId,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const itemRows = payload.items.map((item, idx) => {
        const product = products!.find((p) => p.id === item.product_id)!;
        const line = totals.lines[idx];
        return {
          purchase_id: purchase.id,
          product_id: item.product_id,
          hsn_code: product.hsn_code,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          taxable_value: line.taxableValue,
          gst_rate: Number(product.gst_rate),
          cgst_amount: line.cgstAmount,
          sgst_amount: line.sgstAmount,
          igst_amount: line.igstAmount,
          line_total: line.lineTotal,
          batch_number: item.batch_number || null,
          mfg_date: item.mfg_date || null,
          exp_date: item.exp_date || null,
          organization_id: orgId,
        };
      });

      const { error: itemsErr } = await supabase.from("purchase_items").insert(itemRows);
      if (itemsErr) throw itemsErr;

      const movements = payload.items.map((item) => ({
        product_id: item.product_id,
        movement_type: "in" as const,
        quantity: Math.abs(item.quantity),
        reference: purchase.purchase_number,
        reason: `Purchase ${purchase.purchase_number}`,
        batch_number: item.batch_number || null,
        mfg_date: item.mfg_date || null,
        exp_date: item.exp_date || null,
        created_by: payload.user_id,
        warehouse_id: payload.warehouse_id || null,
        organization_id: orgId,
      }));

      const { error: movErr } = await supabase.from("stock_movements").insert(movements);
      if (movErr) throw movErr;

      return purchase as Purchase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
    },
  });

  return { create };
}
