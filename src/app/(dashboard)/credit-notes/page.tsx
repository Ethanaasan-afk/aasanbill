"use client";

import { useAuth } from "@/components/auth-provider";
import { PlanUpgradeBanner } from "@/components/billing/plan-upgrade-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useCreditNoteMutations, useCreditNotes } from "@/hooks/use-credit-notes";
import { useInvoice, useInvoices } from "@/hooks/use-invoices";
import { useOrgAccess } from "@/hooks/use-org-access";
import { formatDate, formatINR } from "@/lib/utils";
import { getNumberInputHandlers } from "@/lib/number-input";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function CreditNotesPage() {
  const { user } = useAuth();
  const { can, isLoading: accessLoading } = useOrgAccess();
  const { data: notes, isLoading } = useCreditNotes();
  const { data: invoices } = useInvoices();
  const { create } = useCreditNoteMutations();
  const { toast } = useToast();

  const [creating, setCreating] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [creditDate, setCreditDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [qtys, setQtys] = useState<Record<string, string>>({});

  const eligible = useMemo(
    () => (invoices ?? []).filter((i) => i.status !== "cancelled"),
    [invoices]
  );

  const { data: selected, isLoading: loadingSelected } = useInvoice(invoiceId);

  useEffect(() => {
    if (!selected?.items) return;
    const next: Record<string, string> = {};
    for (const item of selected.items) {
      if (item.product_id) next[item.product_id] = "";
    }
    setQtys(next);
  }, [selected?.id, selected?.items]);

  if (!accessLoading && !can("purchasesCreditNotes")) {
    return (
      <div>
        <PageHeader
          eyebrow="Sales"
          title="Credit notes"
          description="Return stock and adjust invoices"
        />
        <PlanUpgradeBanner
          requiredPlan="Pro"
          title="Credit notes are on Pro and Business"
          description="Issue credit notes against invoices and restore stock. Upgrade to unlock purchases, suppliers, and credit notes."
        />
      </div>
    );
  }

  const start = () => {
    setCreating(true);
    setInvoiceId("");
    setReason("");
    setQtys({});
  };

  const save = async () => {
    if (!user || !selected) return;
    const items = (selected.items ?? [])
      .filter((it) => it.product_id && Number(qtys[it.product_id] ?? 0) > 0)
      .map((it) => ({
        product_id: it.product_id!,
        quantity: Number(qtys[it.product_id!] ?? 0),
        unit_price: it.unit_price,
      }));
    if (!items.length) {
      toast("Enter return quantity for at least one line", "error");
      return;
    }
    try {
      await create.mutateAsync({
        invoice_id: selected.id,
        credit_date: creditDate,
        reason: reason || undefined,
        user_id: user.id,
        items,
      });
      toast("Credit note created - stock restored");
      setCreating(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Returns"
        title="Credit notes"
        description="Customer returns against an invoice - stock comes back in"
        accent="violet"
        actions={
          !creating ? (
            <Button onClick={start}>
              <Plus className="h-4 w-4" /> New credit note
            </Button>
          ) : null
        }
      />

      {creating && (
        <div className="panel mb-6 space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Original invoice"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="Select invoice…"
              options={eligible.map((inv) => ({
                value: inv.id,
                label: `${inv.invoice_number} - ${inv.customer?.name ?? ""} (${formatINR(inv.grand_total)})`,
              }))}
            />
            <Input
              label="Credit date"
              type="date"
              value={creditDate}
              onChange={(e) => setCreditDate(e.target.value)}
            />
          </div>

          {invoiceId && loadingSelected && <LoadingBlock />}

          {selected?.items && (
            <div className="overflow-x-auto rounded-[10px] border border-border">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Invoiced</th>
                    <th className="num">Return qty</th>
                    <th className="num">Unit price</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((it) => (
                    <tr key={it.id}>
                      <td>
                        {it.product?.name ?? "Product"}
                        {it.product?.variant ? ` (${it.product.variant})` : ""}
                      </td>
                      <td className="num">{it.quantity}</td>
                      <td className="num">
                        <input
                          type="number"
                          min={0}
                          max={it.quantity}
                          className="h-9 w-20 rounded-lg border border-border bg-surface px-2 text-right text-sm"
                          value={it.product_id ? qtys[it.product_id] ?? "" : ""}
                          {...getNumberInputHandlers({
                            onChange: (e) =>
                              it.product_id &&
                              setQtys((q) => ({ ...q, [it.product_id!]: e.target.value })),
                          })}
                        />
                      </td>
                      <td className="num">{formatINR(it.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Input
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Damaged / wrong item / customer return…"
          />

          <div className="flex gap-2">
            <Button loading={create.isPending} onClick={save}>
              Create credit note
            </Button>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingBlock />
      ) : !(notes ?? []).length ? (
        <EmptyState title="No credit notes yet" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Date</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th className="num">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(notes ?? []).map((n) => (
                <tr key={n.id}>
                  <td className="font-medium">{n.credit_note_number}</td>
                  <td>{formatDate(n.credit_date)}</td>
                  <td className="font-mono text-xs">
                    {n.invoice?.invoice_number ?? "-"}
                  </td>
                  <td>{n.customer?.name ?? "-"}</td>
                  <td className="num">{formatINR(n.grand_total)}</td>
                  <td>
                    <Badge variant={n.status === "issued" ? "info" : "danger"}>
                      {n.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
