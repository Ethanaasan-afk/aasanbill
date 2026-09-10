"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { useAuth } from "@/components/auth-provider";
import { useInvoiceMutations, useInvoices } from "@/hooks/use-invoices";
import { useOrgAccess } from "@/hooks/use-org-access";
import { formatDate, formatINR } from "@/lib/utils";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

const statusVariant = {
  issued: "info" as const,
  paid: "success" as const,
  partially_paid: "warning" as const,
  cancelled: "danger" as const,
};

export default function InvoicesPage() {
  const { isAdmin, user } = useAuth();
  const { writesBlocked } = useOrgAccess();
  const { data: invoices, isLoading } = useInvoices();
  const { updateStatus } = useInvoiceMutations();
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [forceEditId, setForceEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (invoices ?? []).filter((inv) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.customer?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [invoices, search]);

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="GST billing - CGST/SGST or IGST"
        accent="teal"
        actions={
          writesBlocked ? undefined : (
            <Link href="/invoices/new">
              <Button>
                <Plus className="h-4 w-4" /> New Invoice
              </Button>
            </Link>
          )
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search invoice # or customer…"
        className="mb-4 sm:max-w-xs"
      />

      {isLoading ? (
        <LoadingBlock />
      ) : !filtered.length ? (
        <EmptyState
          title="No invoices yet - create your first one"
          action={
            writesBlocked ? undefined : (
              <Link href="/invoices/new">
                <Button>Create first invoice</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="panel panel-accent-teal overflow-x-auto panel-lift">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-mono text-xs font-medium text-emerald hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="font-mono text-xs whitespace-nowrap text-slate">
                    {formatDate(inv.invoice_date)}
                  </td>
                  <td>{inv.customer?.name ?? "-"}</td>
                  <td className="num font-medium">{formatINR(inv.grand_total)}</td>
                  <td>
                    <Badge variant={statusVariant[inv.status]}>{inv.status}</Badge>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Link href={`/invoices/${inv.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      {(inv.status === "issued" || inv.status === "partially_paid") && (
                        <Link href={`/invoices/${inv.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        </Link>
                      )}
                      {isAdmin &&
                        inv.status !== "issued" &&
                        inv.status !== "partially_paid" &&
                        inv.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setForceEditId(inv.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                      {(inv.status === "issued" || inv.status === "partially_paid") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await updateStatus.mutateAsync({
                              id: inv.id,
                              status: "paid",
                              user_id: user!.id,
                            });
                            toast("Invoice marked paid");
                          }}
                        >
                          Mark paid
                        </Button>
                      )}
                      {isAdmin && inv.status !== "cancelled" && (
                        <Button variant="ghost" size="sm" onClick={() => setCancelId(inv.id)}>
                          Void
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!cancelId}
        onClose={() => {
          setCancelId(null);
          setCancelReason("");
        }}
        title="Void invoice?"
        message="Stock will be restored. Enter a reason, then confirm."
        confirmLabel="Void invoice"
        danger
        loading={updateStatus.isPending}
        onConfirm={async () => {
          if (!cancelId || !user || !cancelReason.trim()) return;
          await updateStatus.mutateAsync({
            id: cancelId,
            status: "cancelled",
            cancelled_reason: cancelReason,
            user_id: user.id,
            restoreStock: true,
          });
          toast("Invoice voided");
          setCancelId(null);
          setCancelReason("");
        }}
      />

      <ConfirmModal
        open={!!forceEditId}
        onClose={() => setForceEditId(null)}
        title="Edit a paid invoice?"
        message="This invoice is already paid. Editing can cause accounting inconsistencies. Continue only if you must?"
        confirmLabel="Edit anyway"
        danger
        onConfirm={() => {
          if (!forceEditId) return;
          const id = forceEditId;
          setForceEditId(null);
          router.push(`/invoices/${id}/edit?force=1`);
        }}
      />

      {cancelId && (
        <div className="fixed inset-x-0 bottom-8 z-[60] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md panel p-4">
            <label className="text-xs text-slate">Cancellation reason (required)</label>
            <input
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink focus:border-emerald focus:outline-none"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Duplicate entry / wrong customer"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
}
