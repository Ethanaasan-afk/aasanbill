import {
  ensureInvoiceShortCode,
  INVOICE_PDF_BUCKET,
  invoicePdfDownloadFilename,
  invoicePdfObjectPath,
  SHORT_LINK_SIGNED_TTL_SECONDS,
} from "@/lib/invoice-short-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/demo/mode";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public short link: /i/{short_code}
 * Looks up the invoice and 302-redirects to a fresh signed PDF URL.
 * No login required - customers open this from WhatsApp.
 */
export async function GET(
  _request: Request,
  { params }: { params: { short_code: string } }
) {
  try {
    if (isDemoMode()) {
      return new NextResponse("PDF short links need live Supabase (demo mode is on).", {
        status: 503,
      });
    }

    const code = (params.short_code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) {
      return new NextResponse("Invalid link", { status: 400 });
    }

    const admin = createAdminClient();
    const { data: invoice, error } = await admin
      .from("invoices")
      .select("id, invoice_number, organization_id, short_code, status")
      .eq("short_code", code)
      .maybeSingle();

    if (error || !invoice?.organization_id) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    // Ensure code is normalized if we ever stored mixed case
    if (!invoice.short_code) {
      await ensureInvoiceShortCode(admin, invoice.id);
    }

    const objectPath = invoicePdfObjectPath(
      invoice.organization_id,
      invoice.id,
      invoice.invoice_number
    );

    const { data: signed, error: signErr } = await admin.storage
      .from(INVOICE_PDF_BUCKET)
      .createSignedUrl(objectPath, SHORT_LINK_SIGNED_TTL_SECONDS, {
        download: invoicePdfDownloadFilename(invoice.invoice_number),
      });

    if (signErr || !signed?.signedUrl) {
      console.error("[i/short_code]", signErr);
      return new NextResponse(
        "PDF is not ready yet. Ask the seller to tap Share on WhatsApp again.",
        { status: 404 }
      );
    }

    return NextResponse.redirect(signed.signedUrl, 302);
  } catch (e) {
    console.error("[i/short_code]", e);
    return new NextResponse("Something went wrong", { status: 500 });
  }
}
