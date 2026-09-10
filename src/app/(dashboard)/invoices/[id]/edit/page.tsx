"use client";

import { useAuth } from "@/components/auth-provider";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { EmptyState, LoadingBlock } from "@/components/ui/page-header";
import { useInvoice } from "@/hooks/use-invoices";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function EditInvoiceInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const force = searchParams.get("force") === "1";
  const { isAdmin } = useAuth();
  const { data: invoice, isLoading } = useInvoice(id);

  useEffect(() => {
    if (!invoice) return;
    if (invoice.status === "issued") return;
    if (force && isAdmin) return;
    router.replace(`/invoices/${id}`);
  }, [invoice, force, isAdmin, id, router]);

  if (isLoading) return <LoadingBlock />;
  if (!invoice) return <EmptyState title="Invoice not found" />;

  if (invoice.status !== "issued" && !(force && isAdmin)) {
    return <LoadingBlock />;
  }

  return (
    <InvoiceForm
      mode="edit"
      invoice={invoice}
      force={force && isAdmin && invoice.status !== "issued"}
    />
  );
}

export default function EditInvoicePage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <EditInvoiceInner />
    </Suspense>
  );
}
