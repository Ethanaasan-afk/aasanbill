/** Everyday explanations for tax/inventory jargon (labels stay legal). */
export const HELP = {
  gst_rate: "The tax percentage the government requires for this product",
  hsn_code: "A government code used to classify this product for tax purposes",
  cgst: "Central GST - half of the tax when buyer and seller are in the same state",
  sgst: "State GST - the other half of the tax for same-state sales",
  igst: "Integrated GST - full tax when the buyer is in a different state",
  reorder_threshold: "When stock drops below this number, we'll warn you to restock",
  gstin: "Your customer's tax ID from the government (needed for business invoices)",
  barcode: "Optional product barcode so you can scan items when billing",
} as const;

export type HelpKey = keyof typeof HELP;
