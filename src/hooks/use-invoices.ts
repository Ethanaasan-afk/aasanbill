"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/client";
import { calcInvoiceTotals } from "@/lib/gst";
import { requireOrganizationId } from "@/lib/org";
import { checkPlanLimit, planLimitErrorMessage } from "@/lib/billing/limits";
import type { CreateInvoicePayload, Invoice, UpdateInvoicePayload } from "@/lib/types";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Disambiguate invoices→users FKs (created_by vs edited_by). */
const INVOICE_LIST_SELECT =
  "*, customer:customers(*), creator:users!created_by(*)";
const INVOICE_DETAIL_SELECT =
  "*, customer:customers(*), creator:users!created_by(*), items:invoice_items(*, product:products(*))";

function normalizeRpcInvoice(data: unknown): Invoice {
  const raw = typeof data === "string" ? (JSON.parse(data) as unknown) : data;
  if (!raw || typeof raw !== "object") {
    throw new Error("Invoice RPC returned empty data");
  }
  const invoice = raw as Invoice;
  if (!invoice.id) {
    console.error("[invoices] RPC response missing id:", raw);
    throw new Error("Invoice RPC returned no id");
  }
  return {
    ...invoice,
    subtotal: Number(invoice.subtotal),
    total_cgst: Number(invoice.total_cgst),
    total_sgst: Number(invoice.total_sgst),
    total_igst: Number(invoice.total_igst),
    round_off: Number(invoice.round_off),
    grand_total: Number(invoice.grand_total),
  };
}

function mapInvoiceRow(data: Record<string, unknown>): Invoice {
  return {
    ...data,
    subtotal: Number(data.subtotal),
    total_cgst: Number(data.total_cgst),
    total_sgst: Number(data.total_sgst),
    total_igst: Number(data.total_igst),
    round_off: Number(data.round_off),
    grand_total: Number(data.grand_total),
    items: ((data.items as Record<string, unknown>[]) ?? []).map((it) => ({
      ...it,
      unit_price: Number(it.unit_price),
      taxable_value: Number(it.taxable_value),
      gst_rate: Number(it.gst_rate),
      cgst_amount: Number(it.cgst_amount),
      sgst_amount: Number(it.sgst_amount),
      igst_amount: Number(it.igst_amount),
      line_total: Number(it.line_total),
    })),
  } as Invoice;
}

export function useInvoices() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["invoices"],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      if (isDemoMode()) return demoDb.getInvoices();

      const supabase = createClient();
      const { data, error } = await supabase
        .from("invoices")
        .select(INVOICE_LIST_SELECT)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        console.error("[invoices] list fetch error:", error);
        throw error;
      }
      return (data ?? []).map((inv) => mapInvoiceRow(inv as Record<string, unknown>));
    },
  });
}

export function useInvoice(id: string) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["invoices", id],
    enabled: !!id && id !== "undefined" && !authLoading && !!user,
    queryFn: async () => {
      if (isDemoMode()) {
        const inv = demoDb.getInvoice(id);
        if (!inv) throw new Error("Invoice not found");
        return inv;
      }

      console.log("[invoices] detail fetch id:", id);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("invoices")
        .select(INVOICE_DETAIL_SELECT)
        .eq("id", id)
        .single();
      if (error) {
        console.error("[invoices] detail fetch error:", error, { id });
        throw error;
      }
      console.log("[invoices] detail fetch ok:", data?.id, data?.invoice_number);
      return mapInvoiceRow(data as Record<string, unknown>);
    },
  });
}

export function useInvoiceMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { assertCanCreate } = useOrgAccess();

  const create = useMutation({
    mutationFn: async (payload: CreateInvoicePayload & { user_id: string; prefix: string }) => {
      assertCanCreate();
      if (isDemoMode()) return demoDb.createInvoice(payload);

      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const limit = await checkPlanLimit(supabase, orgId, "invoices");
      if (!limit.ok) throw new Error(planLimitErrorMessage(limit));

      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .select("*")
        .eq("id", payload.customer_id)
        .single();
      if (cErr || !customer) throw cErr ?? new Error("Customer not found");

      const productIds = payload.items
        .map((i) => i.product_id)
        .filter((id): id is string => !!id);
      const productMap = new Map<string, { hsn_code: string; gst_rate: number }>();
      if (productIds.length) {
        const { data: products, error: pErr } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds);
        if (pErr) throw pErr;
        for (const p of products ?? []) productMap.set(p.id, p);
      }

      for (const item of payload.items) {
        if (item.room_booking_id) continue;
        if (!item.product_id || !productMap.has(item.product_id)) {
          throw new Error("One or more products were not found");
        }
      }

      const lineInputs = payload.items.map((item) => {
        const product = item.product_id ? productMap.get(item.product_id) : null;
        return {
          quantity: item.quantity,
          unitPrice: item.unit_price,
          gstRate: Number(item.gst_rate ?? product?.gst_rate ?? 0),
        };
      });

      const totals = calcInvoiceTotals(lineInputs, customer.state);

      // Single RPC: allocates invoice number + inserts invoice/items/stock
      // inside one Postgres transaction (all-or-nothing).
      const rpcPayload = {
        prefix: payload.prefix || "AB",
        customer_id: payload.customer_id,
        invoice_date: payload.invoice_date,
        notes: payload.notes ?? null,
        created_by: payload.user_id,
        warehouse_id: payload.warehouse_id ?? null,
        subtotal: totals.subtotal,
        total_cgst: totals.totalCgst,
        total_sgst: totals.totalSgst,
        total_igst: totals.totalIgst,
        round_off: totals.roundOff,
        grand_total: totals.grandTotal,
        items: payload.items.map((item, idx) => {
          const product = item.product_id ? productMap.get(item.product_id) : null;
          const line = totals.lines[idx];
          return {
            product_id: item.product_id ?? null,
            hsn_code: item.hsn_code ?? product?.hsn_code ?? "",
            quantity: item.quantity,
            unit_price: item.unit_price,
            price_overridden: item.price_overridden,
            taxable_value: line.taxableValue,
            gst_rate: Number(item.gst_rate ?? product?.gst_rate ?? 0),
            cgst_amount: line.cgstAmount,
            sgst_amount: line.sgstAmount,
            igst_amount: line.igstAmount,
            line_total: line.lineTotal,
            imei_serial: item.imei_serial ?? null,
            batch_number: item.batch_number ?? null,
            variant_tag: item.variant_tag ?? null,
            metal_rate_used: item.metal_rate_used ?? null,
            rate_locked_at_sale:
              item.rate_locked_at_sale ?? item.metal_rate_used ?? null,
            rate_source: item.rate_source ?? null,
            gross_weight: item.gross_weight ?? null,
            net_weight: item.net_weight ?? null,
            making_charge_amount: item.making_charge_amount ?? null,
            stone_value: item.stone_value ?? null,
            jewellery_purity: item.jewellery_purity ?? null,
            jewellery_huid: item.jewellery_huid ?? null,
            check_in_date: item.check_in_date ?? null,
            check_out_date: item.check_out_date ?? null,
            guest_id_proof: item.guest_id_proof ?? null,
            room_booking_id: item.room_booking_id ?? null,
          };
        }),
      };

      const { data, error } = await supabase.rpc("create_invoice_atomic", {
        payload: rpcPayload,
      });
      if (error) throw error;

      const invoice = normalizeRpcInvoice(data);

      // Allocate public short PDF link code (best-effort; also lazy on WhatsApp share)
      try {
        const { generateShortCode } = await import("@/lib/invoice-short-link");
        for (let attempt = 0; attempt < 8; attempt++) {
          const code = generateShortCode();
          const { error: codeErr } = await supabase
            .from("invoices")
            .update({ short_code: code })
            .eq("id", invoice.id)
            .is("short_code", null);
          if (!codeErr) {
            invoice.short_code = code;
            break;
          }
          if (codeErr.code !== "23505") break;
        }
      } catch (e) {
        console.warn("[invoices] short_code allocate skipped:", e);
      }

      console.log(
        "[invoices] create_invoice_atomic returned id:",
        invoice.id,
        "number:",
        invoice.invoice_number
      );
      return invoice;
    },
    onSuccess: (invoice) => {
      qc.setQueryData(["invoices", invoice.id], invoice);
      qc.invalidateQueries({ queryKey: ["invoices"], exact: true });
      qc.invalidateQueries({ queryKey: ["invoices", invoice.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
    },
  });

  const update = useMutation({
    mutationFn: async (
      input: UpdateInvoicePayload & { invoice_id: string; user_id: string }
    ) => {
      if (isDemoMode()) {
        return demoDb.updateInvoice(input.invoice_id, {
          customer_id: input.customer_id,
          invoice_date: input.invoice_date,
          notes: input.notes,
          items: input.items,
          user_id: input.user_id,
          force: input.force,
        });
      }

      const supabase = createClient();
      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .select("*")
        .eq("id", input.customer_id)
        .single();
      if (cErr || !customer) throw cErr ?? new Error("Customer not found");

      const productIds = input.items
        .map((i) => i.product_id)
        .filter((id): id is string => !!id);
      const productMap = new Map<string, { hsn_code: string; gst_rate: number }>();
      if (productIds.length) {
        const { data: products, error: pErr } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds);
        if (pErr) throw pErr;
        for (const p of products ?? []) productMap.set(p.id, p);
      }

      for (const item of input.items) {
        if (item.room_booking_id) continue;
        if (!item.product_id || !productMap.has(item.product_id)) {
          throw new Error("One or more products were not found");
        }
      }

      const lineInputs = input.items.map((item) => {
        const product = item.product_id ? productMap.get(item.product_id) : null;
        return {
          quantity: item.quantity,
          unitPrice: item.unit_price,
          gstRate: Number(item.gst_rate ?? product?.gst_rate ?? 0),
        };
      });

      const totals = calcInvoiceTotals(lineInputs, customer.state);

      const rpcPayload = {
        customer_id: input.customer_id,
        invoice_date: input.invoice_date,
        notes: input.notes ?? null,
        edited_by: input.user_id,
        force: !!input.force,
        warehouse_id: input.warehouse_id ?? null,
        subtotal: totals.subtotal,
        total_cgst: totals.totalCgst,
        total_sgst: totals.totalSgst,
        total_igst: totals.totalIgst,
        round_off: totals.roundOff,
        grand_total: totals.grandTotal,
        items: input.items.map((item, idx) => {
          const product = item.product_id ? productMap.get(item.product_id) : null;
          const line = totals.lines[idx];
          return {
            product_id: item.product_id ?? null,
            hsn_code: item.hsn_code ?? product?.hsn_code ?? "",
            quantity: item.quantity,
            unit_price: item.unit_price,
            price_overridden: item.price_overridden,
            taxable_value: line.taxableValue,
            gst_rate: Number(item.gst_rate ?? product?.gst_rate ?? 0),
            cgst_amount: line.cgstAmount,
            sgst_amount: line.sgstAmount,
            igst_amount: line.igstAmount,
            line_total: line.lineTotal,
            imei_serial: item.imei_serial ?? null,
            batch_number: item.batch_number ?? null,
            variant_tag: item.variant_tag ?? null,
            metal_rate_used: item.metal_rate_used ?? null,
            rate_locked_at_sale:
              item.rate_locked_at_sale ?? item.metal_rate_used ?? null,
            rate_source: item.rate_source ?? null,
            gross_weight: item.gross_weight ?? null,
            net_weight: item.net_weight ?? null,
            making_charge_amount: item.making_charge_amount ?? null,
            stone_value: item.stone_value ?? null,
            jewellery_purity: item.jewellery_purity ?? null,
            jewellery_huid: item.jewellery_huid ?? null,
            check_in_date: item.check_in_date ?? null,
            check_out_date: item.check_out_date ?? null,
            guest_id_proof: item.guest_id_proof ?? null,
            room_booking_id: item.room_booking_id ?? null,
          };
        }),
      };

      const { data, error } = await supabase.rpc("update_invoice_atomic", {
        p_invoice_id: input.invoice_id,
        payload: rpcPayload,
      });
      if (error) throw error;

      const invoice = normalizeRpcInvoice(data);
      console.log(
        "[invoices] update_invoice_atomic returned id:",
        invoice.id,
        "number:",
        invoice.invoice_number
      );
      return invoice;
    },
    onSuccess: (invoice, vars) => {
      qc.invalidateQueries({ queryKey: ["invoices"], exact: true });
      qc.invalidateQueries({ queryKey: ["invoices", vars.invoice_id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (input: {
      id: string;
      status: "issued" | "paid" | "partially_paid" | "cancelled";
      cancelled_reason?: string;
      user_id: string;
      restoreStock?: boolean;
    }) => {
      if (isDemoMode()) {
        demoDb.updateInvoiceStatus(input);
        return;
      }

      const supabase = createClient();
      const { data: invoice, error: fErr } = await supabase
        .from("invoices")
        .select("*, items:invoice_items(*)")
        .eq("id", input.id)
        .single();
      if (fErr) throw fErr;

      if (invoice.status === "cancelled") {
        throw new Error("Invoice is already cancelled");
      }

      if (input.status === "paid") {
        const remaining = Math.max(
          0,
          Number(invoice.grand_total) - Number(invoice.amount_paid ?? 0)
        );
        if (remaining > 0) {
          const orgId = requireOrganizationId(user);
          const { error: rpcError } = await supabase.rpc("record_payment", {
            payload: {
              customer_id: invoice.customer_id,
              invoice_id: invoice.id,
              amount: remaining,
              payment_date: new Date().toISOString().slice(0, 10),
              payment_mode: "cash",
              notes: "Marked paid",
              created_by: input.user_id,
              organization_id: orgId,
            },
          });
          if (rpcError) {
            // Fallback without RPC
            const { error: pErr } = await supabase.from("payments").insert({
              organization_id: orgId,
              customer_id: invoice.customer_id,
              invoice_id: invoice.id,
              amount: remaining,
              payment_date: new Date().toISOString().slice(0, 10),
              payment_mode: "cash",
              notes: "Marked paid",
              created_by: input.user_id,
            });
            if (pErr && !/relation|does not exist|schema cache/i.test(pErr.message)) {
              throw pErr;
            }
            const { error } = await supabase
              .from("invoices")
              .update({
                status: "paid",
                amount_paid: Number(invoice.grand_total),
                cancelled_reason: null,
              })
              .eq("id", input.id);
            if (error) throw error;
          }
          return;
        }
      }

      const { error } = await supabase
        .from("invoices")
        .update({
          status: input.status,
          cancelled_reason: input.status === "cancelled" ? input.cancelled_reason ?? null : null,
          ...(input.status === "paid"
            ? { amount_paid: Number(invoice.grand_total) }
            : {}),
        })
        .eq("id", input.id);
      if (error) throw error;

      if (input.status === "cancelled" && input.restoreStock) {
        const orgId = requireOrganizationId(user);
        const movements = (invoice.items ?? []).map(
          (item: { product_id: string; quantity: number }) => ({
            product_id: item.product_id,
            movement_type: "in" as const,
            quantity: Math.abs(item.quantity),
            reference: invoice.invoice_number,
            reason: `Void restore - ${input.cancelled_reason ?? ""}`,
            created_by: input.user_id,
            warehouse_id: invoice.warehouse_id ?? null,
            organization_id: orgId,
          })
        );
        if (movements.length) {
          const { error: mErr } = await supabase.from("stock_movements").insert(movements);
          if (mErr) throw mErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      qc.invalidateQueries({ queryKey: ["outstanding"] });
    },
  });

  return { create, update, updateStatus };
}
