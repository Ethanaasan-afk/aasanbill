"use client";

import { Font } from "@react-pdf/renderer";
import { BRAND_FONTS } from "@/lib/brand";

let registered = false;
let registerFailed = false;

/**
 * Register Inter for invoice PDFs (matches app body font).
 * Safe to call multiple times. Falls back to Helvetica if CDN fonts fail.
 */
export function ensureInvoicePdfFonts(): void {
  if (registered || registerFailed) return;
  try {
    Font.register({
      family: BRAND_FONTS.pdfSans,
      fonts: [
        {
          src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-400-normal.ttf",
          fontWeight: 400,
        },
        {
          src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-600-normal.ttf",
          fontWeight: 600,
        },
        {
          src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-700-normal.ttf",
          fontWeight: 700,
        },
      ],
    });
    registered = true;
  } catch {
    registerFailed = true;
  }
}

export function invoicePdfFontFamily(): string {
  return registered ? BRAND_FONTS.pdfSans : BRAND_FONTS.pdfFallback;
}
