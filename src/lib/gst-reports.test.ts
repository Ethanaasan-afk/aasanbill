/**
 * Quick sanity checks - run with: npx tsx src/lib/gst-reports.test.ts
 */
import {
  B2CL_THRESHOLD,
  buildGstr1,
  buildGstr3b,
  type GstReportInvoice,
} from "./gst-reports";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function inv(
  partial: Partial<GstReportInvoice> & Pick<GstReportInvoice, "invoice_number">
): GstReportInvoice {
  return {
    invoice_date: "2026-08-05",
    subtotal: 1000,
    total_cgst: 90,
    total_sgst: 90,
    total_igst: 0,
    grand_total: 1180,
    status: "issued",
    customer: { name: "Local", gstin: null, state: "Gujarat" },
    items: [
      {
        hsn_code: "21069099",
        quantity: 10,
        taxable_value: 1000,
        gst_rate: 18,
        cgst_amount: 90,
        sgst_amount: 90,
        igst_amount: 0,
      },
    ],
    ...partial,
  };
}

{
  const sheets = buildGstr1(
    [
      inv({
        invoice_number: "AB-1",
        customer: { name: "Acme", gstin: "24AAAAA0000A1Z5", state: "Gujarat" },
      }),
    ],
    "Gujarat"
  );
  assert(sheets.b2b.length === 1, "b2b");
  assert(sheets.b2cl.length === 0, "no b2cl");
  assert(sheets.b2b[0]["Place of Supply"] === "24-Gujarat", "pos");
}

{
  const sheets = buildGstr1(
    [
      inv({ invoice_number: "AB-1" }),
      inv({
        invoice_number: "AB-2",
        items: [
          {
            hsn_code: "21069099",
            quantity: 5,
            taxable_value: 500,
            gst_rate: 18,
            cgst_amount: 45,
            sgst_amount: 45,
            igst_amount: 0,
          },
        ],
      }),
    ],
    "Gujarat"
  );
  assert(sheets.b2cs.length === 1, "b2cs consolidated");
  assert(sheets.b2cs[0]["Taxable Value"] === 1500, "b2cs taxable");
}

{
  const sheets = buildGstr1(
    [
      inv({
        invoice_number: "AB-1",
        grand_total: B2CL_THRESHOLD + 1,
        customer: { name: "Big", gstin: null, state: "Maharashtra" },
        items: [
          {
            hsn_code: "21069099",
            quantity: 1,
            taxable_value: 300000,
            gst_rate: 18,
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: 54000,
          },
        ],
      }),
    ],
    "Gujarat"
  );
  assert(sheets.b2cl.length === 1, "b2cl");
  assert(sheets.b2cs.length === 0, "not b2cs");
}

{
  const sheets = buildGstr1(
    [inv({ invoice_number: "AB-1" }), inv({ invoice_number: "AB-2", status: "cancelled" })],
    "Gujarat"
  );
  assert(sheets.b2cs.length === 1, "cancelled excluded from b2cs");
  assert(sheets.docSummary[0].Cancelled === 1, "cancelled count");
  assert(sheets.docSummary[0]["Total Number"] === 2, "total docs");
}

{
  const summary = buildGstr3b([
    inv({ invoice_number: "AB-1" }),
    inv({
      invoice_number: "AB-2",
      items: [
        {
          hsn_code: "1001",
          quantity: 1,
          taxable_value: 200,
          gst_rate: 5,
          cgst_amount: 5,
          sgst_amount: 5,
          igst_amount: 0,
        },
      ],
    }),
    inv({ invoice_number: "AB-3", status: "cancelled" }),
  ]);
  assert(summary.rows.map((r) => r.rate).join(",") === "5,18", "rates");
  assert(summary.totals.taxableValue === 1200, "taxable total");
  assert(summary.totals.centralTax === 95, "cgst total");
}

console.log("gst-reports.test.ts: all ok");
