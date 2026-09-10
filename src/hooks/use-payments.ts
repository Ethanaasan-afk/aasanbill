"use client";

import { useAuth } from "@/components/auth-provider";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { requireOrganizationId } from "@/lib/org";
import { createClient } from "@/lib/supabase/client";
import type { Payment } from "@/lib/udhaar";
import type { PaymentMode } from "@/lib/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePayments(customerId?: string) {
  return useQuery({
    queryKey: ["payments", customerId ?? "all"],
    queryFn: async (): Promise<Payment[]> => {
      if (isDemoMode()) {
        const all = demoDb.getPayments();
        return customerId ? all.filter((p) => p.customer_id === customerId) : all;
      }
      const supabase = createClient();
      let q = supabase
        .from("payments")
        .select("*, invoice:invoices(invoice_number, grand_total), customer:customers(name, phone)")
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (customerId) q = q.eq("customer_id", customerId);
      const { data, error } = await q;
      if (error) {
        if (/relation|does not exist|schema cache|payments/i.test(error.message)) {
          console.warn("[payments]", error.message);
          return [];
        }
        throw error;
      }
      return (data ?? []).map((row) => ({
        ...row,
        amount: Number(row.amount),
      })) as Payment[];
    },
  });
}

export function usePaymentMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const record = useMutation({
    mutationFn: async (input: {
      customer_id: string;
      invoice_id?: string | null;
      amount: number;
      payment_date: string;
      payment_mode: PaymentMode;
      notes?: string | null;
    }) => {
      if (isDemoMode()) {
        return demoDb.recordPayment({
          ...input,
          user_id: user?.id ?? "demo",
        });
      }

      const orgId = requireOrganizationId(user);
      const supabase = createClient();
      const payload = {
        customer_id: input.customer_id,
        invoice_id: input.invoice_id || null,
        amount: input.amount,
        payment_date: input.payment_date,
        payment_mode: input.payment_mode,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
        organization_id: orgId,
      };

      const { data: rpcData, error: rpcError } = await supabase.rpc("record_payment", {
        payload,
      });

      if (!rpcError) return rpcData as Payment;

      // Fallback if RPC not migrated yet: insert + update invoice manually
      if (!/function|schema cache|Could not find/i.test(rpcError.message)) {
        throw rpcError;
      }

      const { data: payment, error: pErr } = await supabase
        .from("payments")
        .insert({
          organization_id: orgId,
          customer_id: input.customer_id,
          invoice_id: input.invoice_id || null,
          amount: input.amount,
          payment_date: input.payment_date,
          payment_mode: input.payment_mode,
          notes: input.notes ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (pErr) throw pErr;

      if (input.invoice_id) {
        const { data: inv, error: iErr } = await supabase
          .from("invoices")
          .select("id, grand_total, amount_paid, status")
          .eq("id", input.invoice_id)
          .single();
        if (iErr) throw iErr;
        if (inv.status === "cancelled") {
          throw new Error("Cannot record payment on a cancelled invoice");
        }
        const { invoiceStatusFromPaid } = await import("@/lib/invoice-payment");
        const newPaid = Math.min(
          Number(inv.grand_total),
          Number(inv.amount_paid ?? 0) + input.amount
        );
        const status = invoiceStatusFromPaid(newPaid, Number(inv.grand_total));
        const { error: uErr } = await supabase
          .from("invoices")
          .update({ amount_paid: newPaid, status })
          .eq("id", input.invoice_id);
        if (uErr) throw uErr;
      }

      return payment as Payment;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      if (vars.invoice_id) {
        qc.invalidateQueries({ queryKey: ["invoices", vars.invoice_id] });
      }
      qc.invalidateQueries({ queryKey: ["customer-ledger"] });
      qc.invalidateQueries({ queryKey: ["outstanding"] });
    },
  });

  return { record };
}
