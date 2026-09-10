"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { calcInvoiceTotals } from "@/lib/gst";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type { CreditNote, Invoice } from "@/lib/types";
import { useOrgAccess } from "@/hooks/use-org-access";
import { checkPlanCapability, planLimitErrorMessage } from "@/lib/billing/limits";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type CreateCreditNotePayload = {
  invoice_id: string;
  credit_date: string;
  reason?: string;
  user_id: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
};

function mapCreditNote(row: Record<string, unknown>): CreditNote {
  return {
    ...(row as unknown as CreditNote),
    subtotal: Number(row.subtotal),
    total_cgst: Number(row.total_cgst),
    total_sgst: Number(row.total_sgst),
    total_igst: Number(row.total_igst),
    round_off: Number(row.round_off),
    grand_total: Number(row.grand_total),
  };
}

export function useCreditNotes() {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["credit_notes"],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      if (isDemoMode()) return demoDb.getCreditNotes();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("credit_notes")
        .select(
          "*, customer:customers(*), invoice:invoices(invoice_number, invoice_date, status), items:credit_note_items(*, product:products(*))"
        )
        .order("credit_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapCreditNote(r as Record<string, unknown>));
    },
  });
}

export function useCreditNoteMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate, assertCapability } = useOrgAccess();

  const create = useMutation({
    mutationFn: async (payload: CreateCreditNotePayload) => {
      assertCanCreate();
      if (isDemoMode()) {
        assertCapability("purchasesCreditNotes");
        return demoDb.createCreditNote(payload);
      }

      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const cap = await checkPlanCapability(supabase, orgId, "purchasesCreditNotes");
      if (!cap.ok) throw new Error(planLimitErrorMessage(cap));

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .select(
          "*, customer:customers(*), items:invoice_items(*, product:products(*))"
        )
        .eq("id", payload.invoice_id)
        .single();
      if (invErr) throw invErr;
      if (invoice.status === "cancelled") {
        throw new Error("Cannot credit a cancelled invoice");
      }

      const inv = invoice as Invoice;
      const invItems = inv.items ?? [];

      const { data: priorNotes, error: priorErr } = await supabase
        .from("credit_notes")
        .select("items:credit_note_items(product_id, quantity)")
        .eq("invoice_id", inv.id)
        .eq("status", "issued");
      if (priorErr) throw priorErr;

      const alreadyCredited = new Map<string, number>();
      for (const cn of priorNotes ?? []) {
        for (const it of (
          cn as { items?: { product_id: string; quantity: number }[] }
        ).items ?? []) {
          alreadyCredited.set(
            it.product_id,
            (alreadyCredited.get(it.product_id) ?? 0) + Number(it.quantity)
          );
        }
      }

      for (const item of payload.items) {
        const orig = invItems.find((i) => i.product_id === item.product_id);
        if (!orig) throw new Error("Product not on original invoice");
        const remaining = orig.quantity - (alreadyCredited.get(item.product_id) ?? 0);
        if (item.quantity > remaining) {
          throw new Error(
            `Return qty for ${orig.product?.name ?? "product"} exceeds remaining (${remaining} left)`
          );
        }
      }

      const lineInputs = payload.items.map((item) => {
        const orig = invItems.find((i) => i.product_id === item.product_id)!;
        return {
          quantity: item.quantity,
          unitPrice: item.unit_price,
          gstRate: orig.gst_rate,
        };
      });
      const totals = calcInvoiceTotals(lineInputs, inv.customer?.state ?? "Gujarat");

      const { data: cnNumber, error: nErr } = await supabase.rpc(
        "next_credit_note_number",
        { p_prefix: "CN" }
      );
      if (nErr) throw nErr;

      const { data: cn, error: cnErr } = await supabase
        .from("credit_notes")
        .insert({
          credit_note_number: cnNumber as string,
          invoice_id: inv.id,
          customer_id: inv.customer_id,
          warehouse_id: inv.warehouse_id ?? null,
          credit_date: payload.credit_date,
          subtotal: totals.subtotal,
          total_cgst: totals.totalCgst,
          total_sgst: totals.totalSgst,
          total_igst: totals.totalIgst,
          round_off: totals.roundOff,
          grand_total: totals.grandTotal,
          reason: payload.reason || null,
          status: "issued",
          created_by: payload.user_id,
          organization_id: orgId,
        })
        .select()
        .single();
      if (cnErr) throw cnErr;

      const itemRows = payload.items.map((item, idx) => {
        const orig = invItems.find((i) => i.product_id === item.product_id)!;
        const line = totals.lines[idx];
        return {
          credit_note_id: cn.id,
          product_id: item.product_id,
          hsn_code: orig.hsn_code,
          quantity: item.quantity,
          unit_price: item.unit_price,
          taxable_value: line.taxableValue,
          gst_rate: orig.gst_rate,
          cgst_amount: line.cgstAmount,
          sgst_amount: line.sgstAmount,
          igst_amount: line.igstAmount,
          line_total: line.lineTotal,
          organization_id: orgId,
        };
      });

      const { error: itemsErr } = await supabase.from("credit_note_items").insert(itemRows);
      if (itemsErr) throw itemsErr;

      const movements = payload.items.map((item) => ({
        product_id: item.product_id,
        movement_type: "in" as const,
        quantity: Math.abs(item.quantity),
        reference: cn.credit_note_number,
        reason: `Credit note ${cn.credit_note_number} (return)`,
        batch_number: null,
        mfg_date: null,
        exp_date: null,
        created_by: payload.user_id,
        warehouse_id: inv.warehouse_id ?? null,
        organization_id: orgId,
      }));

      const { error: movErr } = await supabase.from("stock_movements").insert(movements);
      if (movErr) throw movErr;

      return mapCreditNote(cn as Record<string, unknown>);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit_notes"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
    },
  });

  return { create };
}
