import { BUSINESS_STATE } from "./constants";
import { round2, roundRupee } from "./utils";

export interface LineInput {
  quantity: number;
  unitPrice: number;
  gstRate: number;
}

export interface LineGstResult {
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
  isIntraState: boolean;
}

export interface InvoiceTotals {
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  lines: LineGstResult[];
}

export function isIntraState(customerState: string, businessState = BUSINESS_STATE): boolean {
  return customerState.trim().toLowerCase() === businessState.trim().toLowerCase();
}

/**
 * Calculate GST for a single line item.
 * Intra-state (Gujarat): CGST = rate/2, SGST = rate/2
 * Inter-state: IGST = full rate
 */
export function calcLineGst(
  line: LineInput,
  customerState: string,
  businessState = BUSINESS_STATE
): LineGstResult {
  const taxableValue = round2(line.quantity * line.unitPrice);
  const gstAmount = round2(taxableValue * (line.gstRate / 100));
  const intra = isIntraState(customerState, businessState);

  if (intra) {
    const half = round2(gstAmount / 2);
    // Ensure CGST+SGST equals gstAmount (absorb 1-paise remainder into SGST)
    const cgstAmount = half;
    const sgstAmount = round2(gstAmount - half);
    return {
      taxableValue,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      lineTotal: round2(taxableValue + cgstAmount + sgstAmount),
      isIntraState: true,
    };
  }

  return {
    taxableValue,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: gstAmount,
    lineTotal: round2(taxableValue + gstAmount),
    isIntraState: false,
  };
}

/**
 * Calculate full invoice totals with round-off to nearest rupee.
 */
export function calcInvoiceTotals(
  lines: LineInput[],
  customerState: string,
  businessState = BUSINESS_STATE
): InvoiceTotals {
  const lineResults = lines.map((l) => calcLineGst(l, customerState, businessState));

  const subtotal = round2(lineResults.reduce((s, l) => s + l.taxableValue, 0));
  const totalCgst = round2(lineResults.reduce((s, l) => s + l.cgstAmount, 0));
  const totalSgst = round2(lineResults.reduce((s, l) => s + l.sgstAmount, 0));
  const totalIgst = round2(lineResults.reduce((s, l) => s + l.igstAmount, 0));

  const beforeRound = round2(subtotal + totalCgst + totalSgst + totalIgst);
  const grandTotal = roundRupee(beforeRound);
  const roundOff = round2(grandTotal - beforeRound);

  return {
    subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    roundOff,
    grandTotal,
    lines: lineResults,
  };
}
