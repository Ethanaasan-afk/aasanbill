"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  useBusinessDataEntries,
  useBusinessDataMutations,
  type BusinessDataSection,
} from "@/hooks/use-business-data";
import {
  BUSINESS_DATA_CATEGORIES,
  BUSINESS_DATA_CATEGORY_LABELS,
  PAYMENT_MODES,
  PAYMENT_MODE_LABELS,
  type BusinessDataCategory,
  type PaymentMode,
} from "@/lib/constants";
import type { BusinessDataEntry } from "@/lib/types";
import { downloadCsv, formatDate, formatINR } from "@/lib/utils";
import { Download, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

type Tab = "costs" | "expenses";

function monthBounds() {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  return { from, to };
}

const CATEGORY_DOT: Record<BusinessDataCategory, string> = {
  product_purchase: "#00A896",
  rent: "#7C6AF0",
  salary: "#1A9E96",
  utilities: "#FF9F5A",
  transport: "#4ECDC4",
  packaging: "#B8860B",
  marketing: "#FF6B6B",
  maintenance: "#64748B",
  misc: "#94A3B8",
};

export default function BusinessDataPage() {
  const [tab, setTab] = useState<Tab>("costs");

  return (
    <div>
      <PageHeader
        eyebrow="Internal"
        title="Business Data"
        description="Owner-only cost & expense ledger - never used for invoices or GST"
        accent="tangerine"
      />

      <div className="mb-6 flex gap-1 rounded-card border border-border bg-surface p-1 sm:max-w-md">
        <button
          type="button"
          onClick={() => setTab("costs")}
          className={`flex-1 rounded-button px-3 py-2 text-sm font-medium transition-colors ${
            tab === "costs"
              ? "bg-ink text-white"
              : "text-slate hover:bg-surface-hover hover:text-ink"
          }`}
        >
          Product Costs
        </button>
        <button
          type="button"
          onClick={() => setTab("expenses")}
          className={`flex-1 rounded-button px-3 py-2 text-sm font-medium transition-colors ${
            tab === "expenses"
              ? "bg-ink text-white"
              : "text-slate hover:bg-surface-hover hover:text-ink"
          }`}
        >
          Other Expenses
        </button>
      </div>

      <BusinessDataTab
        section={tab === "costs" ? "product_costs" : "other_expenses"}
        defaultCategory={tab === "costs" ? "product_purchase" : "misc"}
        emptyTitle="No cost data yet - add your first entry"
        emptyHint={
          tab === "costs"
            ? "Product Purchase entries only. Not linked to the Products catalog."
            : "Rent, salary, utilities, and other overhead - not linked to invoices."
        }
        showDateFilter={tab === "expenses"}
        showExport={tab === "expenses"}
        showSummary={tab === "expenses"}
      />
    </div>
  );
}

function BusinessDataTab({
  section,
  defaultCategory,
  emptyTitle,
  emptyHint,
  showDateFilter,
  showExport,
  showSummary,
}: {
  section: BusinessDataSection;
  defaultCategory: BusinessDataCategory;
  emptyTitle: string;
  emptyHint: string;
  showDateFilter: boolean;
  showExport: boolean;
  showSummary: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const bounds = useMemo(() => monthBounds(), []);
  const [from, setFrom] = useState(bounds.from);
  const [to, setTo] = useState(bounds.to);

  const { data: entries, isLoading } = useBusinessDataEntries(
    section,
    showDateFilter ? from : undefined,
    showDateFilter ? to : undefined
  );
  const { add, update, remove } = useBusinessDataMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessDataEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [companyPersonName, setCompanyPersonName] = useState("");
  const [category, setCategory] = useState<BusinessDataCategory>(defaultCategory);
  const [itemName, setItemName] = useState("");
  const [expenseName, setExpenseName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>("upi");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const total = useMemo(
    () => (entries ?? []).reduce((s, e) => s + e.amount, 0),
    [entries]
  );

  const byCategory = useMemo(() => {
    const map = new Map<BusinessDataCategory, number>();
    for (const e of entries ?? []) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .map(([cat, amt]) => ({
        cat,
        amt,
        share: total > 0 ? (amt / total) * 100 : 0,
      }))
      .sort((a, b) => b.amt - a.amt);
  }, [entries, total]);

  const categoryOptions = useMemo(
    () =>
      BUSINESS_DATA_CATEGORIES.map((c) => ({
        value: c,
        label: BUSINESS_DATA_CATEGORY_LABELS[c],
      })),
    []
  );

  const resetForm = () => {
    setEditing(null);
    setCompanyPersonName("");
    setCategory(defaultCategory);
    setItemName("");
    setExpenseName("");
    setPaymentMethod("upi");
    setAmount("");
    setNote("");
    setEntryDate(new Date().toISOString().slice(0, 10));
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (row: BusinessDataEntry) => {
    setEditing(row);
    setCompanyPersonName(row.company_person_name);
    setCategory(row.category);
    setItemName(row.item_name);
    setExpenseName(row.expense_name);
    setPaymentMethod(row.payment_method);
    setAmount(String(row.amount));
    setNote(row.note ?? "");
    setEntryDate(row.entry_date);
    setFormOpen(true);
  };

  const submit = async () => {
    if (!user?.id) return;
    if (
      !companyPersonName.trim() ||
      !itemName.trim() ||
      !expenseName.trim() ||
      !amount ||
      Number(amount) <= 0
    ) {
      toast("Fill name, item, expense title, and a valid amount", "error");
      return;
    }

    const payload = {
      company_person_name: companyPersonName,
      category,
      item_name: itemName,
      expense_name: expenseName,
      payment_method: paymentMethod,
      amount: Number(amount),
      note,
      entry_date: entryDate,
      created_by: user.id,
    };

    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload });
      toast("Entry updated");
    } else {
      await add.mutateAsync(payload);
      toast("Entry saved");
    }
    setFormOpen(false);
    resetForm();
  };

  const exportCsv = () => {
    downloadCsv(
      `business-data-${section}-${from}-to-${to}.csv`,
      (entries ?? []).map((e) => ({
        date: e.entry_date,
        company_person: e.company_person_name,
        category: e.category,
        item_name: e.item_name,
        expense_name: e.expense_name,
        payment_method: e.payment_method,
        amount: e.amount,
        note: e.note ?? "",
      }))
    );
    toast("CSV exported");
  };

  if (isLoading) return <LoadingBlock />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {showDateFilter && (
          <>
            <Input
              label="From"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="sm:w-40"
            />
            <Input
              label="To"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="sm:w-40"
            />
          </>
        )}
        <p className={`text-sm text-slate ${showDateFilter ? "" : "mr-auto"}`}>
          {emptyHint}
        </p>
        <div className={`flex flex-wrap gap-2 ${showDateFilter ? "ml-auto" : ""}`}>
          {showExport && (
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={!entries?.length}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add data
          </Button>
        </div>
      </div>

      {showSummary && (
        <div className="mb-5 panel panel-accent-tangerine p-4 wash-sun">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate">
              Total in range
            </p>
            <p className="font-display text-2xl font-semibold text-ink">
              {formatINR(total)}
            </p>
          </div>
          {byCategory.length > 0 && (
            <>
              <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-border">
                {byCategory.map(({ cat, share }) => (
                  <div
                    key={cat}
                    style={{ width: `${share}%`, background: CATEGORY_DOT[cat] }}
                    title={`${BUSINESS_DATA_CATEGORY_LABELS[cat]} ${share.toFixed(0)}%`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {byCategory.map(({ cat, amt, share }) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: CATEGORY_DOT[cat] }}
                    />
                    <span className="font-medium text-ink">
                      {BUSINESS_DATA_CATEGORY_LABELS[cat]}
                    </span>
                    <span className="font-mono text-slate">
                      {formatINR(amt)} · {share.toFixed(0)}%
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!entries?.length ? (
        <EmptyState
          title={emptyTitle}
          description={emptyHint}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add data
            </Button>
          }
        />
      ) : (
        <div className="panel panel-accent-tangerine overflow-x-auto panel-lift">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company / Person</th>
                <th>Category</th>
                <th>Item name</th>
                <th>Expense name</th>
                <th>Payment</th>
                <th className="num">Amount</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="font-medium text-ink">{e.company_person_name}</td>
                  <td>
                    <Badge color={CATEGORY_DOT[e.category]}>
                      {BUSINESS_DATA_CATEGORY_LABELS[e.category]}
                    </Badge>
                  </td>
                  <td className="text-sm">{e.item_name}</td>
                  <td className="text-sm">{e.expense_name}</td>
                  <td className="text-xs text-slate">
                    {PAYMENT_MODE_LABELS[e.payment_method]}
                  </td>
                  <td className="num font-mono font-medium">
                    {formatINR(e.amount)}
                  </td>
                  <td className="font-mono text-xs text-slate whitespace-nowrap">
                    {formatDate(e.entry_date)}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(e)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(e.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
        title={editing ? "Edit data" : "Add data"}
        size="md"
      >
        <div className="space-y-3">
          <Input
            label="Company / Person Name"
            value={companyPersonName}
            onChange={(e) => setCompanyPersonName(e.target.value)}
            placeholder="Vendor, supplier, employee…"
          />
          <Select
            label="Category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as BusinessDataCategory)
            }
            options={categoryOptions}
          />
          <Input
            label="Product / Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Free text - not linked to Products"
          />
          <Input
            label="Expense Name"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            placeholder="Short title for this entry"
          />
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMode)}
            options={PAYMENT_MODES.map((m) => ({
              value: m,
              label: PAYMENT_MODE_LABELS[m],
            }))}
          />
          <Input
            label="Total Amount (₹)"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Textarea
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
          />
          <Input
            label="Date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              loading={add.isPending || update.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete entry?"
        message="Removes this row from internal bookkeeping only. Invoices are unaffected."
        confirmLabel="Delete"
        danger
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleteId) return;
          await remove.mutateAsync(deleteId);
          toast("Entry deleted");
          setDeleteId(null);
        }}
      />
    </>
  );
}
