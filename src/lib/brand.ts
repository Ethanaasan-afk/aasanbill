/** Display-only brand constants (not DB schema). */
export const APP_NAME = "AasanBill";
export const APP_TAGLINE = "Bill banao, tension bhagao";
export const APP_TITLE = "AasanBill - Bill banao, tension bhagao";
export const APP_DESCRIPTION =
  "Simple GST billing, inventory, and invoices for growing businesses.";

/** Default invoice number prefix for new orgs (editable in Settings). */
export const DEFAULT_INVOICE_PREFIX = "AB";

export const BRAND_LOGO_ICON = "/logo/aasanbill-icon.png";
export const BRAND_LOGO_FULL = "/logo/aasanbill-full.png";

/** Legal entity that operates AasanBill (Privacy Policy / Terms). */
export const LEGAL_ENTITY_NAME = "Focused Folks Solutions LLP";
export const LEGAL_ENTITY_ADDRESS =
  "236, Seventh Heaven, Ahmedabad, Gujarat, 380055";
export const LEGAL_SUPPORT_EMAIL = "info.focusedfolks@gmail.com";
export const LEGAL_PRIVACY_UPDATED = "4 August 2026";
export const LEGAL_TERMS_UPDATED = "4 August 2026";
export const LEGAL_REFUNDS_UPDATED = "4 August 2026";

/**
 * Brand colors - single JS source of truth for PDF / non-CSS surfaces.
 * Keep in sync with `:root` tokens in `src/app/globals.css`
 * (`--brand-blue-dark`, `--brand-blue-light`, `--ink`, `--slate`).
 */
export const BRAND_COLORS = {
  /** Primary accent (matches --brand-blue-dark / --primary in light theme) */
  primary: "#1D4ED8",
  /** Lighter brand blue (matches --brand-blue-light) */
  primaryLight: "#38BDF8",
  /** Body text (matches --ink light theme) */
  ink: "#0F172A",
  /** Muted text (matches --slate) */
  muted: "#64748B",
  /** Soft table header wash - light, printer-friendly */
  tableHeader: "#F1F5F9",
  /** Hairline borders */
  border: "#E2E8F0",
} as const;

/** App UI fonts (Next.js). PDF uses Inter when registered; Helvetica is the print fallback. */
export const BRAND_FONTS = {
  display: "Plus Jakarta Sans",
  sans: "Inter",
  mono: "JetBrains Mono",
  /** Registered family name for @react-pdf/renderer */
  pdfSans: "Inter",
  pdfFallback: "Helvetica",
} as const;

