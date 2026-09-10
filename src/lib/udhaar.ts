import type { PaymentMode } from "@/lib/constants";

export interface Payment {
  id: string;
  organization_id?: string;
  customer_id: string;
  invoice_id: string | null;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  /** Optional join */
  invoice?: { invoice_number?: string; grand_total?: number } | null;
  customer?: { name?: string; phone?: string | null } | null;
}

export interface CustomerLedgerSummary {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
}

export type LedgerEntryKind = "invoice" | "payment";

export interface CustomerLedgerEntry {
  id: string;
  kind: LedgerEntryKind;
  date: string;
  created_at: string;
  label: string;
  /** Positive increases outstanding (invoice); negative decreases (payment) */
  delta: number;
  runningBalance: number;
  invoice_id?: string | null;
  payment_id?: string | null;
  payment_mode?: PaymentMode | null;
  notes?: string | null;
}

export interface CustomerOutstandingRow {
  customer_id: string;
  name: string;
  phone: string | null;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
}
