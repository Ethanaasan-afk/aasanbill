"use client";

import { InvoiceCompanyHeader } from "@/components/invoices/invoice-company-header";
import { RecordPaymentModal } from "@/components/payments/record-payment-modal";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useCompanySettings } from "@/hooks/use-company";
import { useInvoice, useInvoiceMutations } from "@/hooks/use-invoices";
import { HelpTip } from "@/components/ui/help-tip";
import { amountInWords } from "@/lib/amount-in-words";
import { buildPdfBlob, downloadInvoicePdf, printInvoicePdf } from "@/lib/invoice-pdf-download";
import { invoiceAmountDue } from "@/lib/invoice-payment";
import { isDemoMode } from "@/lib/demo/mode";
import { formatDate, formatINR } from "@/lib/utils";
import { Download, MessageCircle, Pencil, Printer, IndianRupee } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buildUpiPayUrl, upiQrImageUrl } from "@/lib/upi";
import {
  invoiceShareMessage,
  paymentReminderMessage,
  whatsappShareUrl,
  whatsappUrl,
} from "@/lib/whatsapp";
import { useToast } from "@/components/ui/toast";
import { useBusinessType } from "@/hooks/use-business-type";
import { formatPurityLabel } from "@/lib/jewellery";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { isAdmin, user, loading: authLoading } = useAuth();
  const { isJewellery, isHotel } = useBusinessType();
  const {
    data: invoice,
    isLoading,
    isFetching,
    error: fetchError,
  } = useInvoice(id);
  const { data: company } = useCompanySettings();
  const { updateStatus } = useInvoiceMutations();
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [forceEditOpen, setForceEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [waSharing, setWaSharing] = useState(false);
  const [noPhoneNote, setNoPhoneNote] = useState(false);

  const upiUri = useMemo(() => {
    if (!company?.upi_id || !invoice) return null;
    if (invoice.status !== "issued" && invoice.status !== "partially_paid") return null;
    const due = invoiceAmountDue(invoice.grand_total, invoice.amount_paid ?? 0);
    if (due <= 0) return null;
    return buildUpiPayUrl({
      upiId: company.upi_id,
      payeeName: company.brand_name || company.company_name,
      amount: due,
      note: invoice.invoice_number,
    });
  }, [company, invoice]);

  const hasCustomerPhone = Boolean(
    invoice?.customer?.phone && invoice.customer.phone.replace(/\D/g, "").length > 0
  );

  const remindWa = useMemo(() => {
    if (!invoice || !company) return null;
    if (invoice.status !== "issued" && invoice.status !== "partially_paid") return null;
    const due = invoiceAmountDue(invoice.grand_total, invoice.amount_paid ?? 0);
    if (due <= 0) return null;
    return whatsappUrl(
      invoice.customer?.phone,
      paymentReminderMessage({
        companyName: company.brand_name || company.company_name,
        invoiceNumber: invoice.invoice_number,
        amount: due,
        customerName: invoice.customer?.name ?? "Customer",
        invoiceDate: formatDate(invoice.invoice_date),
        upiId: company.upi_id,
      })
    );
  }, [invoice, company]);

  if (authLoading || isLoading || (isFetching && !invoice)) return <LoadingBlock />;
  if (fetchError) {
    return (
      <EmptyState
        title="Could not load invoice"
        description={
          (fetchError as Error).message ||
          "Check the browser console for [invoices] detail fetch error"
        }
      />
    );
  }
  if (!invoice) return <EmptyState title="Invoice not found" description={`No row for id ${id}`} />;

  const intra = invoice.total_igst === 0;
  const amountPaid = invoice.amount_paid ?? 0;
  const amountDue = invoiceAmountDue(invoice.grand_total, amountPaid);

  const handlePdf = async (mode: "download" | "print", copy: 0 | 1 | 2 = 0) => {
    if (!company) {
      toast("Company settings not loaded yet", "error");
      return;
    }
    setPdfLoading(true);
    try {
      if (mode === "print") await printInvoicePdf(invoice, company);
      else await downloadInvoicePdf(invoice, company, copy);
      if (mode === "download") toast("PDF downloaded");
    } catch (e) {
      console.error("[pdf]", e);
      toast((e as Error).message || "PDF failed", "error");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!company) {
      toast("Company settings not loaded yet", "error");
      return;
    }
    setWaSharing(true);
    setNoPhoneNote(!hasCustomerPhone);
    try {
      if (isDemoMode()) {
        const message = invoiceShareMessage({
          companyName: company.brand_name || company.company_name,
          invoiceNumber: invoice.invoice_number,
          amount: amountDue,
          customerName: invoice.customer?.name ?? "Customer",
          upiId: company.upi_id,
        });
        const url = whatsappShareUrl(invoice.customer?.phone, message);
        toast("Demo mode - sharing without PDF link (Storage requires live Supabase)", "info");
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      const blob = await buildPdfBlob(invoice, company, 0);
      const form = new FormData();
      form.append(
        "pdf",
        new File([blob], "AasanBill Invoice.pdf", { type: "application/pdf" })
      );

      const res = await fetch(`/api/invoices/${invoice.id}/share-whatsapp`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as {
        error?: string;
        whatsappUrl?: string;
        hasPhone?: boolean;
      };
      if (!res.ok || !json.whatsappUrl) {
        throw new Error(json.error ?? "Could not prepare WhatsApp share");
      }
      if (json.hasPhone === false) setNoPhoneNote(true);
      window.open(json.whatsappUrl, "_blank", "noopener,noreferrer");
      toast("WhatsApp ready - short download link included");
    } catch (e) {
      console.error("[whatsapp-share]", e);
      toast((e as Error).message || "WhatsApp share failed", "error");
    } finally {
      setWaSharing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={invoice.invoice_number}
        description={`Dated ${formatDate(invoice.invoice_date)} · ${invoice.customer?.name ?? ""}`}
        actions={
          <>
            <Link href="/invoices">
              <Button variant="outline">Back</Button>
            </Link>
            <Button
              variant="outline"
              loading={pdfLoading}
              onClick={() => handlePdf("print")}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button loading={pdfLoading} onClick={() => handlePdf("download", 0)}>
              <Download className="h-4 w-4" /> PDF
            </Button>
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="secondary"
                type="button"
                loading={waSharing}
                onClick={() => void handleWhatsAppShare()}
              >
                <MessageCircle className="h-4 w-4" /> Share on WhatsApp
              </Button>
              {(noPhoneNote || !hasCustomerPhone) && (
                <p className="max-w-[220px] text-right text-[11px] text-slate">
                  No phone number on file for this customer.
                </p>
              )}
            </div>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge
          variant={
            invoice.status === "paid"
              ? "success"
              : invoice.status === "cancelled"
                ? "danger"
                : invoice.status === "partially_paid"
                  ? "warning"
                  : "info"
          }
        >
          {invoice.status === "partially_paid" ? "Partially paid" : invoice.status}
        </Badge>
        {(invoice.status === "issued" || invoice.status === "partially_paid") && (
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
        )}
        {isAdmin && invoice.status !== "issued" && invoice.status !== "partially_paid" && (
          <Button size="sm" variant="outline" onClick={() => setForceEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
        {(invoice.status === "issued" || invoice.status === "partially_paid") && user && (
          <>
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <IndianRupee className="h-3.5 w-3.5" /> Record payment
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                updateStatus.mutate({ id: invoice.id, status: "paid", user_id: user.id })
              }
            >
              Mark paid
            </Button>
          </>
        )}
        {remindWa && (
          <a href={remindWa} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" type="button">
              <MessageCircle className="h-3.5 w-3.5" /> Payment reminder
            </Button>
          </a>
        )}
        {isAdmin && invoice.status !== "cancelled" && (
          <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>
            Void invoice
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[10px] bg-[var(--logo-plate)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/aasanbill-icon.png"
              alt="AasanBill"
              className="h-8 w-8 object-contain"
            />
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => handlePdf("download", 0)}>
              Original
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handlePdf("download", 1)}>
              Duplicate
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handlePdf("download", 2)}>
              Triplicate
            </Button>
          </div>
        </div>
      </div>

      {company ? (
        <div className="panel mb-6 p-4 sm:p-5">
          <InvoiceCompanyHeader company={company} />
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="panel p-4 text-sm">
          <p className="mb-1 text-xs text-slate">Bill to</p>
          <p className="font-semibold text-ink">{invoice.customer?.name}</p>
          <p className="text-slate">{invoice.customer?.billing_address}</p>
          <p className="text-ink">
            {invoice.customer?.state}
            {invoice.customer?.gstin ? (
              <span className="font-mono"> · {invoice.customer.gstin}</span>
            ) : (
              " · Retail"
            )}
          </p>
        </div>
        <div className="panel p-4 text-sm">
          <p className="mb-1 text-xs text-slate">Supply type</p>
          <p className="font-semibold text-ink">
            {intra ? "Intra-state (CGST + SGST)" : "Inter-state (IGST)"}
          </p>
          <p className="mt-2 text-slate">Created by {invoice.creator?.full_name ?? "-"}</p>
          {invoice.edited_at && (
            <p className="mt-1 text-xs text-slate">
              Last edited {formatDate(invoice.edited_at)}
            </p>
          )}
          {invoice.cancelled_reason && (
            <p className="mt-2 text-xs text-rose">Void reason: {invoice.cancelled_reason}</p>
          )}
        </div>
      </div>

      {upiUri && company?.upi_id && (
        <div className="panel mb-6 flex flex-wrap items-center gap-5 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={upiQrImageUrl(upiUri)}
            alt="UPI payment QR"
            width={140}
            height={140}
            className="rounded-[10px] border border-border bg-white p-2"
          />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-display text-sm font-semibold text-ink">Pay via UPI</p>
            <p className="mt-1 text-slate">
              Scan QR or open UPI app - amount ₹{amountDue.toFixed(2)}
            </p>
            <p className="mt-2 font-mono text-xs text-ink">{company.upi_id}</p>
            <a
              href={upiUri}
              className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
            >
              Open UPI payment link
            </a>
            <p className="mt-2 text-[11px] text-slate">
              After the customer pays, click <strong>Mark paid</strong> (auto-confirm needs a payment
              gateway).
            </p>
          </div>
        </div>
      )}

      <div className="panel overflow-x-auto">
        <table className="data-table">
          <thead className="bg-surface">
            {isJewellery ? (
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>HUID</th>
                <th>Purity</th>
                <th>Gross Wt</th>
                <th>Net Wt</th>
                <th>Rate/g</th>
                <th>Metal Value</th>
                <th>Making</th>
                <th>Stone</th>
                <th>Taxable</th>
                <th>GST%</th>
                {intra ? (
                  <>
                    <th>CGST</th>
                    <th>SGST</th>
                  </>
                ) : (
                  <th>IGST</th>
                )}
              </tr>
            ) : (
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Taxable</th>
                <th>GST%</th>
                {intra ? (
                  <>
                    <th>CGST</th>
                    <th>SGST</th>
                  </>
                ) : (
                  <th>IGST</th>
                )}
                <th>Total</th>
              </tr>
            )}
          </thead>
          <tbody>
            {(invoice.items ?? []).map((item, i) => {
              const metalValue =
                item.metal_rate_used != null && item.net_weight != null
                  ? Number(item.net_weight) * Number(item.metal_rate_used)
                  : null;
              if (isJewellery) {
                return (
                  <tr key={item.id}>
                    <td>{i + 1}</td>
                    <td>
                      {item.product?.name}
                      {item.price_overridden && (
                        <Badge variant="warning" className="ml-2">
                          Rate override
                        </Badge>
                      )}
                      <p className="mt-0.5 font-mono text-[11px] text-slate">
                        HSN {item.hsn_code}
                        {(item.rate_locked_at_sale ?? item.metal_rate_used) != null
                          ? ` · Locked ${formatINR(item.rate_locked_at_sale ?? item.metal_rate_used!)}/g`
                          : ""}
                      </p>
                    </td>
                    <td className="font-mono text-xs">
                      {item.jewellery_huid || item.product?.huid_number || "-"}
                    </td>
                    <td>{formatPurityLabel(item.jewellery_purity || item.product?.purity)}</td>
                    <td className="num">{item.gross_weight ?? "-"}</td>
                    <td className="num">{item.net_weight ?? "-"}</td>
                    <td className="num">
                      {item.metal_rate_used != null
                        ? formatINR(item.metal_rate_used)
                        : "-"}
                    </td>
                    <td className="num">
                      {metalValue != null ? formatINR(metalValue) : "-"}
                    </td>
                    <td className="num">
                      {item.making_charge_amount != null
                        ? formatINR(item.making_charge_amount)
                        : "-"}
                    </td>
                    <td className="num">
                      {item.stone_value != null ? formatINR(item.stone_value) : "-"}
                    </td>
                    <td className="num">{formatINR(item.taxable_value)}</td>
                    <td className="num">{item.gst_rate}%</td>
                    {intra ? (
                      <>
                        <td className="num">{formatINR(item.cgst_amount)}</td>
                        <td className="num">{formatINR(item.sgst_amount)}</td>
                      </>
                    ) : (
                      <td className="num">{formatINR(item.igst_amount)}</td>
                    )}
                  </tr>
                );
              }
              return (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>
                  {item.room_booking_id
                    ? "Room stay"
                    : item.product?.name}
                  {item.price_overridden && (
                    <Badge variant="warning" className="ml-2">
                      Override
                    </Badge>
                  )}
                  {(item.imei_serial ||
                    item.batch_number ||
                    item.variant_tag ||
                    item.check_in_date ||
                    item.check_out_date ||
                    item.guest_id_proof) && (
                    <p className="mt-0.5 text-[11px] text-slate">
                      {[
                        item.imei_serial ? `IMEI/S/N: ${item.imei_serial}` : null,
                        item.batch_number ? `Batch: ${item.batch_number}` : null,
                        item.variant_tag ? item.variant_tag : null,
                        item.check_in_date ? `Check-in: ${item.check_in_date}` : null,
                        item.check_out_date ? `Check-out: ${item.check_out_date}` : null,
                        item.guest_id_proof ? `ID: ${item.guest_id_proof}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {item.hsn_code && (
                    <p className="mt-0.5 font-mono text-[11px] text-slate">
                      {isHotel ? "SAC" : "HSN"} {item.hsn_code}
                      {(item.rate_locked_at_sale ?? item.metal_rate_used) != null
                        ? ` · Locked ${formatINR(
                            Number(item.rate_locked_at_sale ?? item.metal_rate_used)
                          )}/g`
                        : ""}
                    </p>
                  )}
                </td>
                <td className="font-mono text-xs">{item.hsn_code}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{formatINR(item.unit_price)}</td>
                <td className="num">{formatINR(item.taxable_value)}</td>
                <td className="num">{item.gst_rate}%</td>
                {intra ? (
                  <>
                    <td className="num">{formatINR(item.cgst_amount)}</td>
                    <td className="num">{formatINR(item.sgst_amount)}</td>
                  </>
                ) : (
                  <td className="num">{formatINR(item.igst_amount)}</td>
                )}
                <td className="num font-medium">{formatINR(item.line_total)}</td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 ml-auto w-full max-w-sm space-y-2.5 panel p-5">
        <div className="leader-row text-sm">
          <span className="shrink-0 text-slate">Subtotal</span>
          <span className="leader-line" aria-hidden />
          <span className="shrink-0 font-mono text-ink">{formatINR(invoice.subtotal)}</span>
        </div>
        {intra ? (
          <>
            <div className="leader-row text-sm">
              <span className="inline-flex shrink-0 items-center gap-1 text-slate">
                CGST <HelpTip helpKey="cgst" />
              </span>
              <span className="leader-line" aria-hidden />
              <span className="shrink-0 font-mono text-ink">{formatINR(invoice.total_cgst)}</span>
            </div>
            <div className="leader-row text-sm">
              <span className="inline-flex shrink-0 items-center gap-1 text-slate">
                SGST <HelpTip helpKey="sgst" />
              </span>
              <span className="leader-line" aria-hidden />
              <span className="shrink-0 font-mono text-ink">{formatINR(invoice.total_sgst)}</span>
            </div>
          </>
        ) : (
          <div className="leader-row text-sm">
            <span className="inline-flex shrink-0 items-center gap-1 text-slate">
              IGST <HelpTip helpKey="igst" />
            </span>
            <span className="leader-line" aria-hidden />
            <span className="shrink-0 font-mono text-ink">{formatINR(invoice.total_igst)}</span>
          </div>
        )}
        <div className="leader-row text-sm">
          <span className="shrink-0 text-slate">Round off</span>
          <span className="leader-line" aria-hidden />
          <span className="shrink-0 font-mono text-ink">{formatINR(invoice.round_off)}</span>
        </div>
        <div className="mt-2 rounded-[10px] border border-sage bg-sage-soft px-3 py-3">
          <div className="flex items-end justify-between gap-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[0.06em] text-sage">
              Grand Total
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight text-sage">
              <span className="font-mono">{formatINR(invoice.grand_total)}</span>
            </span>
          </div>
        </div>
        {(amountPaid > 0 || invoice.status === "partially_paid") && (
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between text-slate">
              <span>Amount paid</span>
              <span className="font-mono text-emerald">{formatINR(amountPaid)}</span>
            </div>
            <div className="flex justify-between font-semibold text-ink">
              <span>Balance due</span>
              <span className="font-mono text-coral-deep">{formatINR(amountDue)}</span>
            </div>
          </div>
        )}
        <p className="mt-1 text-right text-xs text-slate">{amountInWords(invoice.grand_total)}</p>
      </div>

      <div className="mt-10 flex justify-end">
        <div className="flex w-[180px] flex-col items-center text-center">
          <p className="mb-2 text-[11px] text-slate">
            For {company?.company_name ?? "Company"}
          </p>
          {company?.signature_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.signature_url}
              alt="Authorized signature"
              className="mb-1 h-14 w-auto max-w-[150px] object-contain"
            />
          ) : (
            <div className="mb-1 h-14 w-full" aria-hidden />
          )}
          <div className="mb-1 w-full border-t border-ink/40" />
          <p className="text-[11px] font-medium text-ink">Authorized Signatory</p>
        </div>
      </div>

      <ConfirmModal
        open={forceEditOpen}
        onClose={() => setForceEditOpen(false)}
        title="Edit a non-issued invoice?"
        message={`This invoice is ${invoice.status}. Editing after payment or cancellation should only be done when absolutely necessary. Stock will be reversed and re-applied. Continue?`}
        confirmLabel="Edit anyway"
        danger
        onConfirm={() => {
          setForceEditOpen(false);
          router.push(`/invoices/${invoice.id}/edit?force=1`);
        }}
      />
      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Void this invoice?"
        message={`Are you sure you want to void ${invoice.invoice_number}? Stock will be put back. This cannot be undone.`}
        confirmLabel="Yes, void it"
        danger
        loading={updateStatus.isPending}
        onConfirm={async () => {
          if (!user || !cancelReason.trim()) return;
          await updateStatus.mutateAsync({
            id: invoice.id,
            status: "cancelled",
            cancelled_reason: cancelReason,
            user_id: user.id,
            restoreStock: true,
          });
          setCancelOpen(false);
          toast("Done - invoice voided.");
        }}
      />
      {cancelOpen && (
        <div className="fixed bottom-6 left-1/2 z-[60] w-full max-w-md -translate-x-1/2 panel p-4">
          <input
            className="h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink focus:border-emerald focus:outline-none"
            placeholder="Cancellation reason (required)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      )}
      <RecordPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        customerId={invoice.customer_id}
        invoiceId={invoice.id}
        defaultAmount={amountDue > 0 ? amountDue : undefined}
        title={`Record payment - ${invoice.invoice_number}`}
      />
    </div>
  );
}
