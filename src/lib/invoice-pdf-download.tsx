"use client";

import React from "react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "@/components/invoices/invoice-pdf";
import { BRAND_LOGO_FULL, BRAND_LOGO_ICON } from "@/lib/brand";
import { normalizeBusinessType } from "@/lib/business-types";
import { ensureInvoicePdfFonts } from "@/lib/invoice-pdf-fonts";
import { invoicePdfDownloadFilename } from "@/lib/invoice-short-link";
import type { CompanySettings, Invoice } from "@/lib/types";

async function toDataUrl(path: string): Promise<string | null> {
  try {
    const url =
      typeof window !== "undefined" && path.startsWith("/")
        ? `${window.location.origin}${path}`
        : path;
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildPdfBlob(
  invoice: Invoice,
  company: CompanySettings,
  copyIndex: 0 | 1 | 2 = 0
) {
  if (!invoice.customer) {
    throw new Error("Invoice is missing customer details - reopen the invoice and try again.");
  }
  if (!invoice.items?.length) {
    throw new Error("Invoice has no line items.");
  }

  ensureInvoicePdfFonts();

  const [logoSrc, wordmarkSrc, signatureSrc] = await Promise.all([
    toDataUrl(BRAND_LOGO_ICON),
    toDataUrl(BRAND_LOGO_FULL),
    company.signature_url ? toDataUrl(company.signature_url) : Promise.resolve(null),
  ]);

  return pdf(
    <InvoicePdfDocument
      invoice={invoice}
      company={company}
      copyIndex={copyIndex}
      logoSrc={logoSrc}
      wordmarkSrc={wordmarkSrc}
      signatureSrc={signatureSrc}
      businessType={normalizeBusinessType(company.business_type)}
    />
  ).toBlob();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Delay revoke so the download can start
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  company: CompanySettings,
  copyIndex: 0 | 1 | 2 = 0
) {
  const blob = await buildPdfBlob(invoice, company, copyIndex);
  const labels = ["original", "duplicate", "triplicate"] as const;
  triggerDownload(
    blob,
    invoicePdfDownloadFilename(invoice.invoice_number, labels[copyIndex])
  );
}

export async function printInvoicePdf(invoice: Invoice, company: CompanySettings) {
  const blob = await buildPdfBlob(invoice, company, 0);
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    // Popup blocked - fall back to download
    triggerDownload(blob, invoicePdfDownloadFilename(invoice.invoice_number));
    URL.revokeObjectURL(url);
    throw new Error("Popup blocked - PDF downloaded instead. Allow popups to print.");
  }
  // Blob PDF viewers often don't fire `load`; delay print.
  window.setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      /* ignore */
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, 800);
}
