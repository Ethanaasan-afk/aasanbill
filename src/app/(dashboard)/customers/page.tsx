"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { useBusinessType } from "@/hooks/use-business-type";
import { useCustomerMutations, useCustomers } from "@/hooks/use-customers";
import { customerTypeLabel } from "@/lib/constants";
import type { Customer } from "@/lib/types";
import { Plus, Pencil, BookOpen } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";

export default function CustomersPage() {
  const { isAdmin } = useAuth();
  const { isHotel, isJewellery } = useBusinessType();
  const hideCustomerType = isHotel || isJewellery;
  const { data: customers, isLoading } = useCustomers();
  const { remove } = useCustomerMutations();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (customers ?? []).filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.gstin ?? "").toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Customers"
        description={
          hideCustomerType
            ? "Guest / client master — state drives GST type"
            : "Retail / wholesaler master - state drives GST type"
        }
        accent="violet"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add customer
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search name, phone, GSTIN…"
        className="mb-4 sm:max-w-xs"
      />

      {isLoading ? (
        <LoadingBlock />
      ) : !filtered.length ? (
        <EmptyState
          title="No customers yet"
          description="Add the people or shops you sell to - then you can create invoices for them."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add your first customer
            </Button>
          }
        />
      ) : (
        <div className="panel panel-accent-violet overflow-x-auto panel-lift wash-violet">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                {!hideCustomerType && <th>Type</th>}
                <th>Phone</th>
                <th>State</th>
                <th>GSTIN</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  {!hideCustomerType && (
                    <td>
                      <Badge variant={c.customer_type === "b2b" ? "info" : "default"}>
                        {customerTypeLabel(c.customer_type)}
                      </Badge>
                    </td>
                  )}
                  <td className="font-mono text-xs">{c.phone ?? "-"}</td>
                  <td>{c.state}</td>
                  <td className="font-mono text-xs">{c.gstin ?? "-"}</td>
                  <td>
                    <div className="flex gap-1">
                      <Link href={`/customers/${c.id}`}>
                        <Button variant="ghost" size="sm" type="button">
                          <BookOpen className="h-3.5 w-3.5" /> Ledger
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}>
                          Delete
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

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} customer={editing} />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete this customer?"
        message={`Are you sure you want to delete ${
          customers?.find((c) => c.id === deleteId)?.name ?? "this customer"
        }? This cannot be undone.`}
        confirmLabel="Yes, delete"
        danger
        loading={remove.isPending}
        onConfirm={async () => {
          if (deleteId) {
            await remove.mutateAsync(deleteId);
            toast("Done - customer removed.");
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
