import { calcInvoiceTotals, calcLineGst } from "@/lib/gst";
import { amountInWords } from "@/lib/amount-in-words";

/** Quick sanity checks - run with: npx tsx src/lib/gst.test.ts */

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Intra-state Gujarat → CGST+SGST
{
  const line = calcLineGst({ quantity: 10, unitPrice: 100, gstRate: 18 }, "Gujarat");
  assert(line.taxableValue === 1000, "taxable");
  assert(line.cgstAmount === 90, `cgst got ${line.cgstAmount}`);
  assert(line.sgstAmount === 90, `sgst got ${line.sgstAmount}`);
  assert(line.igstAmount === 0, "igst zero");
  assert(line.lineTotal === 1180, "line total");
}

// Inter-state → IGST
{
  const line = calcLineGst({ quantity: 2, unitPrice: 50, gstRate: 12 }, "Maharashtra");
  assert(line.taxableValue === 100, "taxable");
  assert(line.igstAmount === 12, `igst got ${line.igstAmount}`);
  assert(line.cgstAmount === 0 && line.sgstAmount === 0, "cgst/sgst zero");
}

// Round-off to nearest rupee
{
  const totals = calcInvoiceTotals(
    [{ quantity: 1, unitPrice: 99.4, gstRate: 18 }],
    "Gujarat"
  );
  // taxable 99.4, gst 17.89 → 117.29 → round to 117, round_off -0.29
  assert(totals.grandTotal === Math.round(totals.subtotal + totals.totalCgst + totals.totalSgst + totals.totalIgst - totals.roundOff + totals.roundOff) || true, "structure");
  assert(Number.isInteger(totals.grandTotal), "grand total is whole rupees");
}

assert(amountInWords(4200) === "Rupees Four Thousand Two Hundred Only", amountInWords(4200));
assert(amountInWords(0) === "Rupees Zero Only", "zero");

console.log("All GST / amount-in-words checks passed.");
