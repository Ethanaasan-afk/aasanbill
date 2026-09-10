"use client";

import { GstReturnsPanel } from "@/components/reports/gst-returns-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/client";
import { cn, downloadCsv, formatINR } from "@/lib/utils";
import { Download } from "lucide-react";
import { useState } from "react";

type ReportsTab = "csv" | "gst";

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportsTab>("gst");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const exportSales = async () => {
    setLoading("sales");
    setMessage("");
    try {
      let data: Array<{
        invoice_number: string;
        invoice_date: string;
        subtotal: number;
        total_cgst: number;
        total_sgst: number;
        total_igst: number;
        grand_total: number;
        status: string;
        customer?: { name?: string } | null;
        items?: Array<{
          product?: { name?: string; sku?: string };
          quantity: number;
          taxable_value: number;
          cgst_amount: number;
          sgst_amount: number;
          igst_amount: number;
        }>;
      }>;

      if (isDemoMode()) {
        data = demoDb
          .getInvoices()
          .filter(
            (inv) =>
              inv.status !== "cancelled" &&
              inv.invoice_date >= from &&
              inv.invoice_date <= to
          )
          .map((inv) => ({
            ...inv,
            items: inv.items,
          }));
      } else {
        const supabase = createClient();
        const { data: rows, error } = await supabase
          .from("invoices")
          .select(
            "*, customer:customers(name, gstin, state), items:invoice_items(*, product:products(name, sku))"
          )
          .gte("invoice_date", from)
          .lte("invoice_date", to)
          .neq("status", "cancelled")
          .order("invoice_date");
        if (error) throw error;
        data = rows ?? [];
      }

      const rows = data.flatMap((inv) => {
        const items = inv.items ?? [];
        if (!items.length) {
          return [
            {
              invoice_number: inv.invoice_number,
              date: inv.invoice_date,
              customer: inv.customer?.name,
              product: "",
              sku: "",
              qty: 0,
              taxable: inv.subtotal,
              cgst: inv.total_cgst,
              sgst: inv.total_sgst,
              igst: inv.total_igst,
              grand_total: inv.grand_total,
              status: inv.status,
            },
          ];
        }
        return items.map((item) => ({
          invoice_number: inv.invoice_number,
          date: inv.invoice_date,
          customer: inv.customer?.name,
          product: item.product?.name ?? "",
          sku: item.product?.sku ?? "",
          qty: item.quantity,
          taxable: item.taxable_value,
          cgst: item.cgst_amount,
          sgst: item.sgst_amount,
          igst: item.igst_amount,
          grand_total: inv.grand_total,
          status: inv.status,
        }));
      });

      downloadCsv(`sales-${from}-to-${to}.csv`, rows as Record<string, unknown>[]);
      setMessage(`Exported ${rows.length} sales rows.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const exportStock = async () => {
    setLoading("stock");
    setMessage("");
    try {
      let rows: Record<string, unknown>[];
      if (isDemoMode()) {
        rows = demoDb.getProducts().map((p) => ({
          name: p.name,
          variant: p.variant ?? "",
          sku: p.sku,
          category: p.category,
          pack_size: p.pack_size,
          current_stock: p.current_stock ?? 0,
          reorder_threshold: p.reorder_threshold,
          base_price: p.base_price,
          stock_value: (p.current_stock ?? 0) * p.base_price,
          is_active: p.is_active,
        }));
      } else {
        const supabase = createClient();
        const { data: products, error } = await supabase
          .from("products")
          .select("*")
          .order("name");
        if (error) throw error;
        const { fetchProductStockMap } = await import("@/lib/stock");
        const map = await fetchProductStockMap(supabase);
        rows = (products ?? []).map((p) => ({
          name: p.name,
          variant: p.variant ?? "",
          sku: p.sku,
          category: p.category,
          pack_size: p.pack_size,
          current_stock: map.get(p.id) ?? 0,
          reorder_threshold: p.reorder_threshold,
          base_price: p.base_price,
          stock_value: (map.get(p.id) ?? 0) * Number(p.base_price),
          is_active: p.is_active,
        }));
      }

      downloadCsv(`stock-snapshot-${new Date().toISOString().slice(0, 10)}.csv`, rows);
      setMessage(`Exported ${rows.length} products.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const exportGst = async () => {
    setLoading("gst");
    setMessage("");
    try {
      let data: Array<{
        invoice_number: string;
        invoice_date: string;
        subtotal: number;
        total_cgst: number;
        total_sgst: number;
        total_igst: number;
        round_off: number;
        grand_total: number;
        customer?: { name?: string; gstin?: string | null; state?: string } | null;
      }>;

      if (isDemoMode()) {
        data = demoDb
          .getInvoices()
          .filter(
            (inv) =>
              inv.status !== "cancelled" &&
              inv.invoice_date >= from &&
              inv.invoice_date <= to
          );
      } else {
        const supabase = createClient();
        const { data: rows, error } = await supabase
          .from("invoices")
          .select("*, customer:customers(name, gstin, state)")
          .gte("invoice_date", from)
          .lte("invoice_date", to)
          .neq("status", "cancelled")
          .order("invoice_date");
        if (error) throw error;
        data = rows ?? [];
      }

      const rows = data.map((inv) => ({
        invoice_number: inv.invoice_number,
        date: inv.invoice_date,
        customer: inv.customer?.name,
        gstin: inv.customer?.gstin ?? "",
        state: inv.customer?.state,
        taxable: inv.subtotal,
        cgst: inv.total_cgst,
        sgst: inv.total_sgst,
        igst: inv.total_igst,
        round_off: inv.round_off,
        grand_total: inv.grand_total,
      }));

      const totals = rows.reduce(
        (acc, r) => ({
          taxable: acc.taxable + Number(r.taxable),
          cgst: acc.cgst + Number(r.cgst),
          sgst: acc.sgst + Number(r.sgst),
          igst: acc.igst + Number(r.igst),
        }),
        { taxable: 0, cgst: 0, sgst: 0, igst: 0 }
      );

      downloadCsv(`gst-summary-${from}-to-${to}.csv`, rows);
      setMessage(
        `Exported ${rows.length} invoices. Totals - Taxable ${formatINR(totals.taxable)}, CGST ${formatINR(totals.cgst)}, SGST ${formatINR(totals.sgst)}, IGST ${formatINR(totals.igst)}`
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const exportGstr1 = async () => {
    setLoading("gstr1");
    setMessage("");
    try {
      let data: Array<{
        invoice_number: string;
        invoice_date: string;
        subtotal: number;
        total_cgst: number;
        total_sgst: number;
        total_igst: number;
        grand_total: number;
        status: string;
        customer?: {
          name?: string;
          gstin?: string | null;
          state?: string;
          customer_type?: string;
        } | null;
        items?: Array<{
          hsn_code: string;
          quantity: number;
          taxable_value: number;
          gst_rate: number;
          cgst_amount: number;
          sgst_amount: number;
          igst_amount: number;
        }>;
      }>;

      if (isDemoMode()) {
        data = demoDb
          .getInvoices()
          .filter(
            (inv) =>
              inv.status !== "cancelled" &&
              inv.invoice_date >= from &&
              inv.invoice_date <= to
          );
      } else {
        const supabase = createClient();
        const { data: rows, error } = await supabase
          .from("invoices")
          .select(
            "*, customer:customers(name, gstin, state, customer_type), items:invoice_items(*)"
          )
          .gte("invoice_date", from)
          .lte("invoice_date", to)
          .neq("status", "cancelled")
          .order("invoice_date");
        if (error) throw error;
        data = rows ?? [];
      }

      const b2b = data
        .filter((inv) => inv.customer?.gstin)
        .map((inv) => ({
          section: "B2B",
          gstin: inv.customer?.gstin ?? "",
          customer: inv.customer?.name ?? "",
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          invoice_value: inv.grand_total,
          place_of_supply: inv.customer?.state ?? "",
          taxable: inv.subtotal,
          cgst: inv.total_cgst,
          sgst: inv.total_sgst,
          igst: inv.total_igst,
        }));

      const b2c = data
        .filter((inv) => !inv.customer?.gstin)
        .map((inv) => ({
          section: "B2CS",
          customer: inv.customer?.name ?? "",
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          place_of_supply: inv.customer?.state ?? "",
          taxable: inv.subtotal,
          cgst: inv.total_cgst,
          sgst: inv.total_sgst,
          igst: inv.total_igst,
          invoice_value: inv.grand_total,
        }));

      const hsnMap = new Map<
        string,
        {
          hsn: string;
          qty: number;
          taxable: number;
          cgst: number;
          sgst: number;
          igst: number;
          rate: number;
        }
      >();
      for (const inv of data) {
        for (const it of inv.items ?? []) {
          const key = `${it.hsn_code}|${it.gst_rate}`;
          const cur = hsnMap.get(key) ?? {
            hsn: it.hsn_code,
            qty: 0,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            rate: Number(it.gst_rate),
          };
          cur.qty += Number(it.quantity);
          cur.taxable += Number(it.taxable_value);
          cur.cgst += Number(it.cgst_amount);
          cur.sgst += Number(it.sgst_amount);
          cur.igst += Number(it.igst_amount);
          hsnMap.set(key, cur);
        }
      }
      const hsn = Array.from(hsnMap.values()).map((r) => ({
        section: "HSN",
        hsn: r.hsn,
        gst_rate: r.rate,
        quantity: r.qty,
        taxable: r.taxable,
        cgst: r.cgst,
        sgst: r.sgst,
        igst: r.igst,
      }));

      downloadCsv(`gstr1-b2b-${from}-to-${to}.csv`, b2b);
      downloadCsv(`gstr1-b2cs-${from}-to-${to}.csv`, b2c);
      downloadCsv(`gstr1-hsn-${from}-to-${to}.csv`, hsn);
      setMessage(
        `GSTR-1 style export: ${b2b.length} B2B, ${b2c.length} B2C, ${hsn.length} HSN rows (3 CSV files).`
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        description="CSV exports and GST return Excel files for filing"
        accent="tangerine"
      />

      <div
        className="mb-6 flex flex-wrap gap-1 border-b border-border"
        role="tablist"
        aria-label="Report sections"
      >
        <TabButton
          active={tab === "gst"}
          onClick={() => setTab("gst")}
          label="GSTR-1 / GSTR-3B Export"
        />
        <TabButton
          active={tab === "csv"}
          onClick={() => setTab("csv")}
          label="CSV Exports"
        />
      </div>

      {tab === "gst" ? (
        <GstReturnsPanel />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportCard
              title="Sales report"
              description="Invoices & line items for the date range"
              onClick={exportSales}
              loading={loading === "sales"}
              accent="teal"
            />
            <ReportCard
              title="Stock snapshot"
              description="Current stock across all products"
              onClick={exportStock}
              loading={loading === "stock"}
              accent="aqua"
            />
            <ReportCard
              title="GST summary"
              description="CGST / SGST / IGST collected in period"
              onClick={exportGst}
              loading={loading === "gst"}
              accent="sun"
            />
            <ReportCard
              title="GSTR-1 style (CSV)"
              description="Legacy B2B, B2C & HSN CSV downloads"
              onClick={exportGstr1}
              loading={loading === "gstr1"}
              accent="sun"
            />
          </div>

          {message && <p className="mt-4 text-sm text-muted">{message}</p>}
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-slate hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}

function ReportCard({
  title,
  description,
  onClick,
  loading,
  accent,
}: {
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  accent: "teal" | "aqua" | "sun";
}) {
  const accentClass =
    accent === "teal"
      ? "panel-accent-teal wash-teal"
      : accent === "aqua"
        ? "panel-accent-aqua wash-aqua"
        : "panel-accent-sun wash-sun";

  return (
    <div className={`panel p-5 panel-lift ${accentClass}`}>
      <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-slate">{description}</p>
      <Button className="mt-4" variant="secondary" onClick={onClick} loading={loading}>
        <Download className="h-4 w-4" /> Export CSV
      </Button>
    </div>
  );
}
