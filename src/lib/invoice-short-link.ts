import type { SupabaseClient } from "@supabase/supabase-js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
export const INVOICE_PDF_BUCKET = "invoice-pdfs";
/** Fresh signed URL TTL when customer opens /i/{code} */
export const SHORT_LINK_SIGNED_TTL_SECONDS = 60 * 60; // 1 hour

export function generateShortCode(length = 6): string {
  let out = "";
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function invoicePdfObjectPath(
  organizationId: string,
  invoiceId: string,
  invoiceNumber: string
): string {
  const safeNumber = String(invoiceNumber).replace(/[^\w.-]+/g, "-");
  return `${organizationId}/${invoiceId}/${safeNumber}.pdf`;
}

/** Filename customers see when downloading the PDF */
export function invoicePdfDownloadFilename(
  _invoiceNumber?: string,
  copyLabel?: string
): string {
  if (copyLabel && copyLabel !== "original") {
    return `AasanBill Invoice - ${copyLabel}.pdf`;
  }
  return "AasanBill Invoice.pdf";
}

/** Prefer NEXT_PUBLIC_APP_URL (deployed domain). Avoid baking localhost into WhatsApp. */
export function getAppBaseUrl(request?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host?.includes("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export function invoicePublicDownloadUrl(shortCode: string, request?: Request): string {
  return `${getAppBaseUrl(request)}/i/${encodeURIComponent(shortCode)}`;
}

/** Allocate a unique short_code if missing (lazy). */
export async function ensureInvoiceShortCode(
  admin: SupabaseClient,
  invoiceId: string
): Promise<string> {
  const { data: existing, error: readErr } = await admin
    .from("invoices")
    .select("short_code")
    .eq("id", invoiceId)
    .single();
  if (readErr) throw readErr;
  if (existing?.short_code) return existing.short_code as string;

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateShortCode();
    const { data, error } = await admin
      .from("invoices")
      .update({ short_code: code })
      .eq("id", invoiceId)
      .is("short_code", null)
      .select("short_code")
      .maybeSingle();

    if (data?.short_code) return data.short_code as string;

    const { data: again } = await admin
      .from("invoices")
      .select("short_code")
      .eq("id", invoiceId)
      .single();
    if (again?.short_code) return again.short_code as string;

    if (error && error.code !== "23505") throw error;
  }

  throw new Error("Could not allocate invoice short code");
}
