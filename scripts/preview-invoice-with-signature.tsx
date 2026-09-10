import React from "react";
import fs from "fs";
import path from "path";
import { pdf } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "../src/components/invoices/invoice-pdf";
import { ensureInvoicePdfFonts } from "../src/lib/invoice-pdf-fonts";
import type { CompanySettings, Invoice } from "../src/lib/types";

function fileToDataUrl(p: string) {
  const buf = fs.readFileSync(p);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function main() {
  ensureInvoicePdfFonts();
  const root = process.cwd();
  const company: CompanySettings = {
    id: "x",
    company_name: "Sharma Kirana Store Pvt. Ltd.",
    brand_name: "Sharma Kirana",
    gstin: "27AABCU9603R1ZM",
    address: "12 Market Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    phone: "9876543210",
    email: "billing@sharmakirana.in",
    bank_name: "HDFC",
    bank_account: "1",
    bank_ifsc: "HDFC0001",
    bank_branch: "FC",
    invoice_prefix: "AB",
    upi_id: "a@upi",
    updated_at: new Date().toISOString(),
    signature_url: "local",
  };

  const invoice = {
    id: "inv",
    invoice_number: "AB-SIG-001",
    customer_id: "c",
    invoice_date: "2026-08-04",
    subtotal: 1000,
    total_cgst: 90,
    total_sgst: 90,
    total_igst: 0,
    round_off: 0,
    grand_total: 1180,
    status: "issued",
    cancelled_reason: null,
    notes: null,
    created_by: null,
    created_at: new Date().toISOString(),
    customer: {
      id: "c",
      name: "Ramesh Traders",
      phone: "9123456780",
      email: null,
      gstin: null,
      billing_address: "Camp, Pune",
      state: "Maharashtra",
      customer_type: "b2c",
      created_at: new Date().toISOString(),
    },
    items: [
      {
        id: "i1",
        invoice_id: "inv",
        product_id: "p",
        hsn_code: "3402",
        quantity: 1,
        unit_price: 1000,
        price_overridden: false,
        taxable_value: 1000,
        gst_rate: 18,
        cgst_amount: 90,
        sgst_amount: 90,
        igst_amount: 0,
        line_total: 1180,
        product: {
          id: "p",
          name: "Demo Item",
          variant: null,
          pack_size: "1 L",
          hsn_code: "3402",
          gst_rate: 18,
          base_price: 1000,
          category: "Misc",
          sku: "D1",
          barcode: null,
          reorder_threshold: 0,
          is_active: true,
          image_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ],
  } as Invoice;

  const sigPath = path.join(root, "tmp", "sample-signature.png");
  const blob = await pdf(
    <InvoicePdfDocument
      invoice={invoice}
      company={company}
      logoSrc={fileToDataUrl(path.join(root, "public/logo/aasanbill-icon.png"))}
      wordmarkSrc={fileToDataUrl(path.join(root, "public/logo/aasanbill-full.png"))}
      signatureSrc={fileToDataUrl(sigPath)}
      businessType="general"
    />
  ).toBlob();

  const out = path.join(root, "tmp", "invoice-with-signature.pdf");
  fs.writeFileSync(out, Buffer.from(await blob.arrayBuffer()));
  console.log("wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
