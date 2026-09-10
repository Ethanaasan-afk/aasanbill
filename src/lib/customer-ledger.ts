import { round2 } from "@/lib/utils";
import type {
  CustomerLedgerEntry,
  CustomerLedgerSummary,
  CustomerOutstandingRow,
  Payment,
} from "@/lib/udhaar";
import type { Invoice } from "@/lib/types";

export function buildCustomerLedger(
  invoices: Invoice[],
  payments: Payment[]
): { summary: CustomerLedgerSummary; entries: CustomerLedgerEntry[] } {
  const activeInvoices = invoices.filter((i) => i.status !== "cancelled");
  const totalBilled = round2(
    activeInvoices.reduce((s, i) => s + Number(i.grand_total), 0)
  );
  const totalPaid = round2(payments.reduce((s, p) => s + Number(p.amount), 0));
  const outstanding = round2(Math.max(0, totalBilled - totalPaid));

  type Raw = {
    id: string;
    kind: "invoice" | "payment";
    date: string;
    created_at: string;
    label: string;
    delta: number;
    invoice_id?: string | null;
    payment_id?: string | null;
    payment_mode?: Payment["payment_mode"] | null;
    notes?: string | null;
  };

  const raw: Raw[] = [
    ...activeInvoices.map((inv) => ({
      id: `inv-${inv.id}`,
      kind: "invoice" as const,
      date: inv.invoice_date,
      created_at: inv.created_at,
      label: `Invoice ${inv.invoice_number}`,
      delta: round2(Number(inv.grand_total)),
      invoice_id: inv.id,
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      kind: "payment" as const,
      date: p.payment_date,
      created_at: p.created_at,
      label: p.invoice_id
        ? `Payment${p.invoice?.invoice_number ? ` · ${p.invoice.invoice_number}` : ""}`
        : "Payment (general)",
      delta: -round2(Number(p.amount)),
      invoice_id: p.invoice_id,
      payment_id: p.id,
      payment_mode: p.payment_mode,
      notes: p.notes,
    })),
  ];

  raw.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.created_at !== b.created_at) return a.created_at.localeCompare(b.created_at);
    if (a.kind !== b.kind) return a.kind === "invoice" ? -1 : 1;
    return 0;
  });

  let running = 0;
  const entries: CustomerLedgerEntry[] = raw.map((r) => {
    running = round2(running + r.delta);
    return { ...r, runningBalance: running };
  });

  return {
    summary: { totalBilled, totalPaid, outstanding },
    entries,
  };
}

export function buildOutstandingRows(
  customers: Array<{ id: string; name: string; phone: string | null }>,
  invoices: Invoice[],
  payments: Payment[]
): CustomerOutstandingRow[] {
  const rows: CustomerOutstandingRow[] = [];
  for (const c of customers) {
    const invs = invoices.filter((i) => i.customer_id === c.id);
    const pays = payments.filter((p) => p.customer_id === c.id);
    const { summary } = buildCustomerLedger(invs, pays);
    if (summary.outstanding > 0) {
      rows.push({
        customer_id: c.id,
        name: c.name,
        phone: c.phone,
        totalBilled: summary.totalBilled,
        totalPaid: summary.totalPaid,
        outstanding: summary.outstanding,
      });
    }
  }
  rows.sort((a, b) => b.outstanding - a.outstanding);
  return rows;
}
