"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useBusinessType } from "@/hooks/use-business-type";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useWarehouseMutations, useWarehouses } from "@/hooks/use-warehouses";
import type { Warehouse } from "@/lib/types";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

const empty = { name: "", code: "", address: "", is_default: false, is_active: true };

export default function WarehousesPage() {
  const { isAdmin } = useAuth();
  const { isHotel, isLoading: btLoading } = useBusinessType();
  const { can } = useOrgAccess();
  const { data: warehouses, isLoading } = useWarehouses();
  const { upsert } = useWarehouseMutations();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!btLoading && isHotel) redirect("/bookings");
  }, [btLoading, isHotel]);

  if (btLoading || isHotel) return <LoadingBlock />;

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin only"
        description="Warehouses / branches can only be managed by an admin."
      />
    );
  }

  const canAddAnother = can("multiWarehouse") || !(warehouses ?? []).length;

  const openCreate = () => {
    if (!canAddAnother) {
      toast(
        "Multiple warehouses are available on the Business plan - upgrade at Settings → Billing.",
        "error"
      );
      return;
    }
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setForm({
      name: w.name,
      code: w.code,
      address: w.address ?? "",
      is_default: w.is_default,
      is_active: w.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast("Name and code are required", "error");
      return;
    }
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address || null,
        is_default: form.is_default,
        is_active: form.is_active,
      });
      toast(editing ? "Warehouse updated" : "Warehouse added");
      setOpen(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Branches"
        title="Warehouses"
        description="Multi-branch stock - invoices & purchases pick a location"
        actions={
          canAddAnother ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add warehouse
            </Button>
          ) : (
            <Link href="/settings/billing">
              <Button variant="outline">Upgrade for multi-warehouse</Button>
            </Link>
          )
        }
      />

      {!can("multiWarehouse") && (warehouses?.length ?? 0) >= 1 ? (
        <p className="mb-4 rounded-[10px] border border-border bg-cloud px-3 py-2 text-xs text-slate">
          Your plan includes one warehouse. Upgrade to Business to add branches.
        </p>
      ) : null}

      {isLoading ? (
        <LoadingBlock />
      ) : !(warehouses ?? []).length ? (
        <EmptyState title="No warehouses" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Address</th>
                <th>Flags</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(warehouses ?? []).map((w) => (
                <tr key={w.id}>
                  <td className="font-medium">{w.name}</td>
                  <td className="font-mono text-xs">{w.code}</td>
                  <td className="text-sm text-slate">{w.address || "-"}</td>
                  <td className="flex flex-wrap gap-1">
                    {w.is_default && <Badge variant="info">Default</Badge>}
                    <Badge variant={w.is_active ? "success" : "default"}>
                      {w.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit warehouse" : "Add warehouse"}
      >
        <div className="space-y-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            />
            Default warehouse
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={upsert.isPending} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
