import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo/mode";
import {
  ensureInvoiceShortCode,
  INVOICE_PDF_BUCKET,
  invoicePdfObjectPath,
  invoicePublicDownloadUrl,
} from "@/lib/invoice-short-link";
import { invoiceShareMessage, whatsappShareUrl } from "@/lib/whatsapp";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (isDemoMode()) {
      return NextResponse.json(
        { error: "WhatsApp PDF share needs live Supabase Storage (disable demo mode)." },
        { status: 400 }
      );
    }

    const invoiceId = params.id;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization linked" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("pdf");
    if (!file || typeof file === "string" || typeof (file as Blob).arrayBuffer !== "function") {
      return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
    }
    const pdfBlob = file as Blob;

    const admin = createAdminClient();
    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select(
        "id, invoice_number, grand_total, status, organization_id, short_code, customer:customers(id, name, phone)"
      )
      .eq("id", invoiceId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: invErr?.message ?? "Invoice not found" }, { status: 404 });
    }

    const { data: org } = await admin
      .from("organizations")
      .select("company_name, brand_name, upi_id")
      .eq("id", profile.organization_id)
      .single();

    const customer = invoice.customer as
      | { id: string; name: string; phone: string | null }
      | { id: string; name: string; phone: string | null }[]
      | null;
    const cust = Array.isArray(customer) ? customer[0] : customer;
    const phone = cust?.phone ?? null;
    const customerName = cust?.name ?? "Customer";

    const objectPath = invoicePdfObjectPath(
      profile.organization_id,
      invoice.id,
      invoice.invoice_number
    );
    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());

    const { error: upErr } = await admin.storage.from(INVOICE_PDF_BUCKET).upload(objectPath, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (upErr) {
      console.error("[share-whatsapp] upload", upErr);
      return NextResponse.json(
        {
          error:
            upErr.message.includes("Bucket not found") || upErr.message.includes("not found")
              ? "Storage bucket `invoice-pdfs` missing - run migration 021_invoice_pdfs_storage.sql"
              : upErr.message,
        },
        { status: 500 }
      );
    }

    const shortCode = await ensureInvoiceShortCode(admin, invoice.id);
    const downloadUrl = invoicePublicDownloadUrl(shortCode, request);

    const amountDue = invoice.status === "paid" ? 0 : Number(invoice.grand_total);
    const companyName = org?.brand_name || org?.company_name || "AasanBill";
    const message = invoiceShareMessage({
      companyName,
      invoiceNumber: invoice.invoice_number,
      amount: amountDue,
      customerName,
      upiId: org?.upi_id,
      pdfUrl: downloadUrl,
    });

    const hasPhone = Boolean(phone && phone.replace(/\D/g, "").length > 0);
    const url = whatsappShareUrl(phone, message);

    return NextResponse.json({
      whatsappUrl: url,
      pdfUrl: downloadUrl,
      shortCode,
      hasPhone,
    });
  } catch (e) {
    console.error("[share-whatsapp]", e);
    return NextResponse.json(
      { error: (e as Error).message || "Share failed" },
      { status: 500 }
    );
  }
}
