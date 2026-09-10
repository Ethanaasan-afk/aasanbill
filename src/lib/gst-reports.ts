import { isIntraState } from "@/lib/gst";
import { formatPlaceOfSupply } from "@/lib/state-codes";
import { round2 } from "@/lib/utils";

/** B2CL threshold: unregistered inter-state invoices above this go to B2CL. */
export const B2CL_THRESHOLD = 250_000;

export const DEFAULT_UQC = "NOS";

export interface GstReportItem {
  hsn_code: string;
  quantity: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  product?: { name?: string } | null;
}

export interface GstReportInvoice {
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
  } | null;
  items?: GstReportItem[];
}

export interface RateBucket {
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
}

function num(n: unknown): number {
  return Number(n) || 0;
}

function hasGstin(inv: GstReportInvoice): boolean {
  return Boolean(inv.customer?.gstin?.trim());
}

/** Group line items by GST rate within one invoice. */
export function rateBucketsFromItems(items: GstReportItem[] | undefined): RateBucket[] {
  const map = new Map<number, RateBucket>();
  for (const it of items ?? []) {
    const rate = num(it.gst_rate);
    const cur = map.get(rate) ?? {
      rate,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
    };
    cur.taxable = round2(cur.taxable + num(it.taxable_value));
    cur.cgst = round2(cur.cgst + num(it.cgst_amount));
    cur.sgst = round2(cur.sgst + num(it.sgst_amount));
    cur.igst = round2(cur.igst + num(it.igst_amount));
    map.set(rate, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
}

/** Prefer stored line tax splits; fall back to invoice totals as a single rate row. */
function bucketsForInvoice(inv: GstReportInvoice): RateBucket[] {
  const fromItems = rateBucketsFromItems(inv.items);
  if (fromItems.length) return fromItems;
  const taxable = num(inv.subtotal);
  const cgst = num(inv.total_cgst);
  const sgst = num(inv.total_sgst);
  const igst = num(inv.total_igst);
  const tax = cgst + sgst + igst;
  const rate = taxable > 0 ? round2((tax / taxable) * 100) : 0;
  return [{ rate, taxable, cgst, sgst, igst }];
}

function formatInvoiceDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${dd}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

export type B2bRow = Record<string, string | number>;
export type B2clRow = Record<string, string | number>;
export type B2csRow = Record<string, string | number>;
export type HsnRow = Record<string, string | number>;
export type DocSummaryRow = Record<string, string | number>;

export interface Gstr1Sheets {
  b2b: B2bRow[];
  b2cl: B2clRow[];
  b2cs: B2csRow[];
  hsn: HsnRow[];
  docSummary: DocSummaryRow[];
}

export interface Gstr3bRateRow {
  rate: number;
  taxableValue: number;
  integratedTax: number;
  centralTax: number;
  stateTax: number;
  cess: number;
}

export interface Gstr3bSummary {
  rows: Gstr3bRateRow[];
  totals: Omit<Gstr3bRateRow, "rate">;
}

function isActive(inv: GstReportInvoice): boolean {
  return inv.status !== "cancelled";
}

/**
 * Classify and build GSTR-1 sheets from period invoices.
 * Pass all invoices in range (including cancelled) for DocSummary;
 * cancelled rows are excluded from B2B/B2CL/B2CS/HSN totals.
 */
export function buildGstr1(
  invoices: GstReportInvoice[],
  businessState: string
): Gstr1Sheets {
  const active = invoices.filter(isActive);
  const b2b: B2bRow[] = [];
  const b2cl: B2clRow[] = [];
  const b2csMap = new Map<
    string,
    { place: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }
  >();

  for (const inv of active) {
    const placeName = inv.customer?.state?.trim() || businessState;
    const place = formatPlaceOfSupply(placeName);
    const registered = hasGstin(inv);
    const interState = !isIntraState(placeName, businessState);
    const buckets = bucketsForInvoice(inv);

    if (registered) {
      for (const b of buckets) {
        b2b.push({
          "GSTIN/UIN of Recipient": inv.customer?.gstin?.trim() ?? "",
          "Receiver Name": inv.customer?.name ?? "",
          "Invoice Number": inv.invoice_number,
          "Invoice Date": formatInvoiceDate(inv.invoice_date),
          "Invoice Value": round2(num(inv.grand_total)),
          "Place of Supply": place,
          "Reverse Charge": "N",
          "Invoice Type": "Regular",
          Rate: b.rate,
          "Taxable Value": b.taxable,
          "Integrated Tax Amount": b.igst,
          "Central Tax Amount": b.cgst,
          "State/UT Tax Amount": b.sgst,
          "Cess Amount": 0,
        });
      }
      continue;
    }

    const isB2cl = interState && num(inv.grand_total) > B2CL_THRESHOLD;
    if (isB2cl) {
      for (const b of buckets) {
        b2cl.push({
          "Invoice Number": inv.invoice_number,
          "Invoice Date": formatInvoiceDate(inv.invoice_date),
          "Invoice Value": round2(num(inv.grand_total)),
          "Place of Supply": place,
          Rate: b.rate,
          "Taxable Value": b.taxable,
          "Integrated Tax Amount": b.igst,
          "Cess Amount": 0,
        });
      }
      continue;
    }

    for (const b of buckets) {
      const key = `${place}|${b.rate}`;
      const cur = b2csMap.get(key) ?? {
        place,
        rate: b.rate,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
      cur.taxable = round2(cur.taxable + b.taxable);
      cur.cgst = round2(cur.cgst + b.cgst);
      cur.sgst = round2(cur.sgst + b.sgst);
      cur.igst = round2(cur.igst + b.igst);
      b2csMap.set(key, cur);
    }
  }

  const b2cs: B2csRow[] = Array.from(b2csMap.values())
    .sort((a, b) => a.place.localeCompare(b.place) || a.rate - b.rate)
    .map((r) => ({
      "Place of Supply": r.place,
      Rate: r.rate,
      "Taxable Value": r.taxable,
      "Integrated Tax Amount": r.igst,
      "Central Tax Amount": r.cgst,
      "State/UT Tax Amount": r.sgst,
      "Cess Amount": 0,
    }));

  const hsnMap = new Map<
    string,
    {
      hsn: string;
      description: string;
      qty: number;
      totalValue: number;
      taxable: number;
      cgst: number;
      sgst: number;
      igst: number;
    }
  >();
  for (const inv of active) {
    for (const it of inv.items ?? []) {
      const hsn = (it.hsn_code || "").trim() || "00000000";
      const cur = hsnMap.get(hsn) ?? {
        hsn,
        description: it.product?.name?.trim() || "",
        qty: 0,
        totalValue: 0,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
      const taxable = num(it.taxable_value);
      const cgst = num(it.cgst_amount);
      const sgst = num(it.sgst_amount);
      const igst = num(it.igst_amount);
      cur.qty = round2(cur.qty + num(it.quantity));
      cur.taxable = round2(cur.taxable + taxable);
      cur.cgst = round2(cur.cgst + cgst);
      cur.sgst = round2(cur.sgst + sgst);
      cur.igst = round2(cur.igst + igst);
      cur.totalValue = round2(cur.taxable + cur.cgst + cur.sgst + cur.igst);
      if (!cur.description && it.product?.name) {
        cur.description = it.product.name.trim();
      }
      hsnMap.set(hsn, cur);
    }
  }

  const hsn: HsnRow[] = Array.from(hsnMap.values())
    .sort((a, b) => a.hsn.localeCompare(b.hsn))
    .map((r) => ({
      "HSN Code": r.hsn,
      Description: r.description,
      UQC: DEFAULT_UQC,
      "Total Quantity": r.qty,
      "Total Value": r.totalValue,
      "Taxable Value": r.taxable,
      "Integrated Tax Amount": r.igst,
      "Central Tax Amount": r.cgst,
      "State/UT Tax Amount": r.sgst,
    }));

  const sortedNums = [...invoices]
    .map((i) => i.invoice_number)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const cancelled = invoices.filter((i) => i.status === "cancelled").length;

  const docSummary: DocSummaryRow[] = [
    {
      "Nature of Document": "Invoices for Outward Supply",
      "Sr No From": sortedNums[0] ?? "",
      "Sr No To": sortedNums[sortedNums.length - 1] ?? "",
      "Total Number": invoices.length,
      Cancelled: cancelled,
    },
  ];

  return { b2b, b2cl, b2cs, hsn, docSummary };
}

/**
 * GSTR-3B Table 3.1(a) - outward taxable supplies by rate.
 * Excludes cancelled invoices. Uses stored line tax amounts.
 */
export function buildGstr3b(invoices: GstReportInvoice[]): Gstr3bSummary {
  const map = new Map<number, Gstr3bRateRow>();

  for (const inv of invoices.filter(isActive)) {
    for (const b of bucketsForInvoice(inv)) {
      const cur = map.get(b.rate) ?? {
        rate: b.rate,
        taxableValue: 0,
        integratedTax: 0,
        centralTax: 0,
        stateTax: 0,
        cess: 0,
      };
      cur.taxableValue = round2(cur.taxableValue + b.taxable);
      cur.integratedTax = round2(cur.integratedTax + b.igst);
      cur.centralTax = round2(cur.centralTax + b.cgst);
      cur.stateTax = round2(cur.stateTax + b.sgst);
      map.set(b.rate, cur);
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => a.rate - b.rate);
  const totals = rows.reduce(
    (acc, r) => ({
      taxableValue: round2(acc.taxableValue + r.taxableValue),
      integratedTax: round2(acc.integratedTax + r.integratedTax),
      centralTax: round2(acc.centralTax + r.centralTax),
      stateTax: round2(acc.stateTax + r.stateTax),
      cess: 0,
    }),
    { taxableValue: 0, integratedTax: 0, centralTax: 0, stateTax: 0, cess: 0 }
  );

  return { rows, totals };
}

export function gstr3bToSheetRows(summary: Gstr3bSummary): Record<string, string | number>[] {
  const body: Record<string, string | number>[] = summary.rows.map((r) => ({
    "Tax Rate (%)": r.rate,
    "Total Taxable Value": r.taxableValue,
    "Integrated Tax": r.integratedTax,
    "Central Tax": r.centralTax,
    "State/UT Tax": r.stateTax,
    Cess: r.cess,
  }));
  body.push({
    "Tax Rate (%)": "Total",
    "Total Taxable Value": summary.totals.taxableValue,
    "Integrated Tax": summary.totals.integratedTax,
    "Central Tax": summary.totals.centralTax,
    "State/UT Tax": summary.totals.stateTax,
    Cess: summary.totals.cess,
  });
  return body;
}

/** First and last calendar day of the month containing `date` (local). */
export function gstFilingMonthBounds(date = new Date()): { from: string; to: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  const iso = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };
  return { from: iso(from), to: iso(to) };
}
