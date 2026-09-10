"use client";

import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useCompanySettings } from "@/hooks/use-company";
import { useCustomers } from "@/hooks/use-customers";
import { useInvoices } from "@/hooks/use-invoices";
import { usePayments } from "@/hooks/use-payments";
import { buildOutstandingRows } from "@/lib/customer-ledger";
import { formatINR } from "@/lib/utils";
import {
  outstandingReminderMessage,
  whatsappShareUrl,
} from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function OutstandingPage() {
  const router = useRouter();
  const { data: customers, isLoading: loadingCust } = useCustomers();
  const { data: invoices, isLoading: loadingInv } = useInvoices();
  const { data: payments, isLoading: loadingPay } = usePayments();
  const { data: company } = useCompanySettings();

  const rows = useMemo(
    () =>
      buildOutstandingRows(customers ?? [], invoices ?? [], payments ?? []),
    [customers, invoices, payments]
  );

  const totalOutstanding = useMemo(
    () => rows.reduce((s, r) => s + r.outstanding, 0),
    [rows]
  );

  if (loadingCust || loadingInv || loadingPay) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        eyebrow="Udhaar"
        title="Outstanding / Udhaar"
        description="Customers with a running credit balance - highest first"
        accent="tangerine"
        actions={
          <div className="rounded-[10px] border border-border bg-surface px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate">
              Total outstanding
            </p>
            <p className="font-display text-lg font-semibold text-coral-deep tabular-nums">
              {formatINR(totalOutstanding)}
            </p>
          </div>
        }
      />

      {!rows.length ? (
        <EmptyState
          title="No outstanding balances"
          description="When customers have unpaid invoices, they will show up here."
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-cloud/80 text-xs uppercase tracking-wide text-slate">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium text-right">Total billed</th>
                  <th className="px-5 py-3 font-medium text-right">Total paid</th>
                  <th className="px-5 py-3 font-medium text-right">Outstanding</th>
                  <th className="px-5 py-3 font-medium text-right">Reminder</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const wa = whatsappShareUrl(
                    r.phone,
                    outstandingReminderMessage({
                      companyName:
                        company?.brand_name || company?.company_name || "our shop",
                      customerName: r.name,
                      amount: r.outstanding,
                    })
                  );
                  return (
                    <tr
                      key={r.customer_id}
                      className="cursor-pointer border-b border-border/60 text-ink hover:bg-surface-hover/40"
                      onClick={() => router.push(`/customers/${r.customer_id}`)}
                    >
                      <td className="px-5 py-3 font-medium">
                        <Link
                          href={`/customers/${r.customer_id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate">{r.phone || "-"}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatINR(r.totalBilled)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatINR(r.totalPaid)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-coral-deep">
                        {formatINR(r.outstanding)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" variant="outline" type="button">
                            <MessageCircle className="h-3.5 w-3.5" /> Send reminder
                          </Button>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
