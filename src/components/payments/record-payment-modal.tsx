"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { usePaymentMutations } from "@/hooks/use-payments";
import { useToast } from "@/components/ui/toast";
import {
  PAYMENT_MODE_LABELS,
  type PaymentMode,
} from "@/lib/constants";
import { FormEvent, useEffect, useState } from "react";

const MODES: PaymentMode[] = ["cash", "bank_transfer", "upi", "cheque"];

export function RecordPaymentModal({
  open,
  onClose,
  customerId,
  invoiceId,
  defaultAmount,
  title = "Record payment",
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  invoiceId?: string | null;
  defaultAmount?: number;
  title?: string;
}) {
  const { record } = usePaymentMutations();
  const { toast } = useToast();
  const [amount, setAmount] = useState(String(defaultAmount ?? ""));
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(
      defaultAmount != null && defaultAmount > 0 ? String(defaultAmount) : ""
    );
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMode("cash");
    setNotes("");
  }, [open, defaultAmount]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast("Enter a valid amount greater than 0", "error");
      return;
    }
    try {
      await record.mutateAsync({
        customer_id: customerId,
        invoice_id: invoiceId ?? null,
        amount: value,
        payment_date: paymentDate,
        payment_mode: mode,
        notes: notes.trim() || null,
      });
      toast("Payment recorded");
      onClose();
    } catch (err) {
      toast((err as Error).message || "Could not record payment", "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Amount (₹)"
          type="number"
          min={0.01}
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Payment date"
          type="date"
          required
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />
        <Select
          label="Payment mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as PaymentMode)}
          options={MODES.map((m) => ({
            value: m,
            label: PAYMENT_MODE_LABELS[m],
          }))}
        />
        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Cash at counter"
        />
        {!invoiceId && (
          <p className="text-[11px] text-slate">
            This payment applies to the customer&apos;s overall outstanding
            balance (not a specific invoice).
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={record.isPending}>
            Save payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
