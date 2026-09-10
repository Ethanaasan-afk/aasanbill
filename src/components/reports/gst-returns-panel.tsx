"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/hooks/use-company";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { downloadXlsx } from "@/lib/excel";
import {
  buildGstr1,
  buildGstr3b,
  gstFilingMonthBounds,
  gstr3bToSheetRows,
  type GstReportInvoice,
  type Gstr3bSummary,
} from "@/lib/gst-reports";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/utils";
import { Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DISCLAIMER =
  "This export is formatted for GST filing but you should verify totals with your CA before filing - AasanBill does not file returns on your behalf.";

const B2B_HEADERS = [
  "GSTIN/UIN of Recipient",
  "Receiver Name",
  "Invoice Number",
  "Invoice Date",
  "Invoice Value",
  "Place of Supply",
  "Reverse Charge",
  "Invoice Type",
  "Rate",
  "Taxable Value",
  "Integrated Tax Amount",
  "Central Tax Amount",
  "State/UT Tax Amount",
  "Cess Amount",
];

const B2CL_HEADERS = [
  "Invoice Number",
  "Invoice Date",
  "Invoice Value",
  "Place of Supply",
  "Rate",
  "Taxable Value",
  "Integrated Tax Amount",
  "Cess Amount",
];

const B2CS_HEADERS = [
  "Place of Supply",
  "Rate",
  "Taxable Value",
  "Integrated Tax Amount",
  "Central Tax Amount",
  "State/UT Tax Amount",
  "Cess Amount",
];

const HSN_HEADERS = [
  "HSN Code",
  "Description",
  "UQC",
  "Total Quantity",
  "Total Value",
  "Taxable Value",
  "Integrated Tax Amount",
  "Central Tax Amount",
  "State/UT Tax Amount",
];

const DOC_HEADERS = [
  "Nature of Document",
  "Sr No From",
  "Sr No To",
  "Total Number",
  "Cancelled",
];

export function GstReturnsPanel() {
  const bounds = gstFilingMonthBounds();
  const [from, setFrom] = useState(bounds.from);
  const [to, setTo] = useState(bounds.to);
  const [loading, setLoading] = useState<"preview" | "gstr1" | "gstr3b" | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<Gstr3bSummary | null>(null);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const { data: org } = useOrganization();
  const businessState = org?.state?.trim() || "Gujarat";

  const fetchInvoices = useCallback(async (): Promise<GstReportInvoice[]> => {
    if (isDemoMode()) {
      return demoDb
        .getInvoices()
        .filter((inv) => inv.invoice_date >= from && inv.invoice_date <= to)
        .map((inv) => ({
          ...inv,
          items: (inv.items ?? []).map((it) => ({
            hsn_code: it.hsn_code,
            quantity: it.quantity,
            taxable_value: it.taxable_value,
            gst_rate: it.gst_rate,
            cgst_amount: it.cgst_amount,
            sgst_amount: it.sgst_amount,
            igst_amount: it.igst_amount,
            product: it.product ? { name: it.product.name } : null,
          })),
          customer: inv.customer
            ? {
                name: inv.customer.name,
                gstin: inv.customer.gstin,
                state: inv.customer.state,
              }
            : null,
        }));
    }

    const supabase = createClient();
    const { data: rows, error } = await supabase
      .from("invoices")
      .select(
        "*, customer:customers(name, gstin, state), items:invoice_items(*, product:products(name))"
      )
      .gte("invoice_date", from)
      .lte("invoice_date", to)
      .order("invoice_date");
    if (error) throw error;
    return (rows ?? []) as GstReportInvoice[];
  }, [from, to]);

  const loadPreview = useCallback(async () => {
    setLoading("preview");
    setMessage("");
    try {
      const invoices = await fetchInvoices();
      setInvoiceCount(invoices.length);
      setSummary(buildGstr3b(invoices));
    } catch (e) {
      setMessage((e as Error).message);
      setSummary(null);
    } finally {
      setLoading(null);
    }
  }, [fetchInvoices]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const exportGstr1 = async () => {
    setLoading("gstr1");
    setMessage("");
    try {
      const invoices = await fetchInvoices();
      const sheets = buildGstr1(invoices, businessState);
      setSummary(buildGstr3b(invoices));
      setInvoiceCount(invoices.length);
      downloadXlsx(`GSTR-1_${from}_to_${to}.xlsx`, [
        { name: "B2B", rows: sheets.b2b, headers: B2B_HEADERS },
        { name: "B2CL", rows: sheets.b2cl, headers: B2CL_HEADERS },
        { name: "B2CS", rows: sheets.b2cs, headers: B2CS_HEADERS },
        { name: "HSN", rows: sheets.hsn, headers: HSN_HEADERS },
        { name: "DocSummary", rows: sheets.docSummary, headers: DOC_HEADERS },
      ]);
      setMessage(
        `GSTR-1 Excel downloaded - B2B ${sheets.b2b.length}, B2CL ${sheets.b2cl.length}, B2CS ${sheets.b2cs.length}, HSN ${sheets.hsn.length}.`
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const exportGstr3b = async () => {
    setLoading("gstr3b");
    setMessage("");
    try {
      const invoices = await fetchInvoices();
      const built = buildGstr3b(invoices);
      setSummary(built);
      setInvoiceCount(invoices.length);
      downloadXlsx(`GSTR-3B_${from}_to_${to}.xlsx`, [
        {
          name: "Table 3.1(a)",
          rows: gstr3bToSheetRows(built),
          headers: [
            "Tax Rate (%)",
            "Total Taxable Value",
            "Integrated Tax",
            "Central Tax",
            "State/UT Tax",
            "Cess",
          ],
        },
      ]);
      setMessage("GSTR-3B Excel downloaded.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="From"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-auto"
        />
        <Input
          label="To"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-auto"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => void loadPreview()}
          loading={loading === "preview"}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh summary
        </Button>
      </div>

      <p className="max-w-2xl text-xs leading-relaxed text-slate">{DISCLAIMER}</p>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => void exportGstr1()}
          loading={loading === "gstr1"}
        >
          <Download className="h-4 w-4" />
          Export GSTR-1 (Excel)
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void exportGstr3b()}
          loading={loading === "gstr3b"}
        >
          <Download className="h-4 w-4" />
          Export GSTR-3B (Excel)
        </Button>
      </div>

      <div className="panel panel-accent-sun wash-sun overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-ink">
            GSTR-3B · Table 3.1(a) preview
          </h2>
          <p className="mt-1 text-xs text-slate">
            Outward taxable supplies for {from} → {to}
            {org?.state ? ` · Business state: ${org.state}` : ""}
            {invoiceCount > 0 ? ` · ${invoiceCount} invoice(s) in range` : ""}
          </p>
        </div>

        {!summary || summary.rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate">
            {loading === "preview"
              ? "Loading…"
              : "No taxable outward supplies in this period (cancelled invoices are excluded)."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-cloud/80 text-xs uppercase tracking-wide text-slate">
                  <th className="px-5 py-3 font-medium">Tax rate</th>
                  <th className="px-5 py-3 font-medium text-right">Taxable value</th>
                  <th className="px-5 py-3 font-medium text-right">IGST</th>
                  <th className="px-5 py-3 font-medium text-right">CGST</th>
                  <th className="px-5 py-3 font-medium text-right">SGST/UTGST</th>
                  <th className="px-5 py-3 font-medium text-right">Cess</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r) => (
                  <tr key={r.rate} className="border-b border-border/60 text-ink">
                    <td className="px-5 py-2.5 font-medium">{r.rate}%</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatINR(r.taxableValue)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatINR(r.integratedTax)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatINR(r.centralTax)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatINR(r.stateTax)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {formatINR(r.cess)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-cloud/60 font-semibold text-ink">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatINR(summary.totals.taxableValue)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatINR(summary.totals.integratedTax)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatINR(summary.totals.centralTax)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatINR(summary.totals.stateTax)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatINR(summary.totals.cess)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
