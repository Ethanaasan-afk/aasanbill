import { round2 } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/constants";

/** Derive invoice status from amount paid vs grand total (non-cancelled). */
export function invoiceStatusFromPaid(
  amountPaid: number,
  grandTotal: number,
  current?: InvoiceStatus | string
): Exclude<InvoiceStatus, "cancelled"> {
  if (current === "cancelled") {
    // callers should not use this for cancelled; keep issued as safe fallback type-wise
    return "issued";
  }
  const paid = round2(Math.max(0, amountPaid));
  const total = round2(Math.max(0, grandTotal));
  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partially_paid";
  return "issued";
}

export function invoiceAmountDue(grandTotal: number, amountPaid: number): number {
  return Math.max(0, round2(grandTotal - Math.max(0, amountPaid)));
}
