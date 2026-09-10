"use client";

import { useAuth } from "@/components/auth-provider";
import { PlanUpgradeBanner } from "@/components/billing/plan-upgrade-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useProducts } from "@/hooks/use-products";
import { usePurchaseMutations } from "@/hooks/use-purchases";
import { usePurchases } from "@/hooks/use-purchases";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useWarehouses } from "@/hooks/use-warehouses";
import { formatDate, formatINR } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingBlock } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

type Line = {
  key: string;
  product_id: string;
  quantity: string;
  unit_cost: string;
};

function newLine(): Line {
  return { key: Math.random().toString(36).slice(2), product_id: "", quantity: "1", unit_cost: "0" };
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const { can, isLoading: accessLoading } = useOrgAccess();
  const { data: purchases, isLoading } = usePurchases();
  const { data: suppliers } = useSuppliers(true);
  const { data: products } = useProducts(true);
  const { data: warehouses } = useWarehouses(true);
  const { create } = usePurchaseMutations();
  const { toast } = useToast();

  const [creating, setCreating] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);

  const defaultWh = useMemo(
    () => warehouses?.find((w) => w.is_default) ?? warehouses?.[0],
    [warehouses]
  );

  useEffect(() => {
    if (!warehouseId && defaultWh?.id) setWarehouseId(defaultWh.id);
  }, [defaultWh, warehouseId]);

  if (!accessLoading && !can("purchasesCreditNotes")) {
    return (
      <div>
        <PageHeader
          eyebrow="Purchases"
          title="Purchases"
          description="Stock-in from suppliers with GST"
        />
        <PlanUpgradeBanner
          requiredPlan="Pro"
          title="Purchases are on Pro and Business"
          description="Record supplier bills, update stock, and manage purchase GST. Upgrade to unlock purchases, suppliers, and credit notes."
        />
      </div>
    );
  }

  const startCreate = () => {
    setCreating(true);
    setSupplierId(suppliers?.[0]?.id ?? "");
    setWarehouseId(defaultWh?.id ?? "");
    setLines([newLine()]);
    setNotes("");
  };

  const save = async () => {
    if (!user) return;
    if (!supplierId) {
      toast("Select a supplier", "error");
      return;
    }
    const items = lines
      .map((line) => ({
        ...line,
        parsedQuantity: Number(line.quantity),
        parsedUnitCost: Number(line.unit_cost),
      }))
      .filter((l) => l.product_id && l.parsedQuantity > 0 && Number.isFinite(l.parsedUnitCost));
    if (!items.length) {
      toast("Add at least one product line", "error");
      return;
    }
    try {
      await create.mutateAsync({
        supplier_id: supplierId,
        warehouse_id: warehouseId || defaultWh?.id || null,
        purchase_date: purchaseDate,
        notes: notes || undefined,
        user_id: user.id,
        items: items.map((l) => ({
          product_id: l.product_id,
          quantity: l.parsedQuantity,
          unit_cost: l.parsedUnitCost,
        })),
      });
      toast("Purchase recorded - stock updated");
      setCreating(false);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Purchasing"
        title="Purchases"
        description="Buy from suppliers - stock increases automatically"
        accent="aqua"
        actions={
          !creating ? (
            <Button onClick={startCreate}>
              <Plus className="h-4 w-4" /> New purchase
            </Button>
          ) : null
        }
      />

      {creating && (
        <div className="panel mb-6 space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder="Select…"
              options={(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))}
            />
            <Select
              label="Warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
            />
            <Input
              label="Purchase date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          {!suppliers?.length && (
            <p className="text-xs text-tangerine-deep">
              No suppliers yet.{" "}
              <Link href="/suppliers" className="underline">
                Add a supplier
              </Link>{" "}
              first.
            </p>
          )}

          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={line.key} className="grid gap-2 sm:grid-cols-[1fr_100px_120px_40px]">
                <Select
                  label={idx === 0 ? "Product" : undefined}
                  value={line.product_id}
                  onChange={(e) => {
                    const product = products?.find((p) => p.id === e.target.value);
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key
                          ? {
                              ...l,
                              product_id: e.target.value,
                              unit_cost: String(product?.manufacturing_cost ?? product?.base_price ?? 0),
                            }
                          : l
                      )
                    );
                  }}
                  placeholder="Select product…"
                  options={(products ?? []).map((p) => ({
                    value: p.id,
                    label: `${p.name}${p.variant ? ` (${p.variant})` : ""} - ${p.sku}`,
                  }))}
                />
                <Input
                  label={idx === 0 ? "Qty" : undefined}
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key
                          ? { ...l, quantity: e.target.value }
                          : l
                      )
                    )
                  }
                />
                <Input
                  label={idx === 0 ? "Unit cost" : undefined}
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.unit_cost}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key
                          ? { ...l, unit_cost: e.target.value }
                          : l
                      )
                    )
                  }
                />
                <button
                  type="button"
                  className="mt-auto mb-1 text-slate hover:text-coral-deep"
                  onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}>
            <Plus className="h-3.5 w-3.5" /> Add line
          </Button>

          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex gap-2">
            <Button loading={create.isPending} onClick={save}>
              Save purchase
            </Button>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingBlock />
      ) : !(purchases ?? []).length ? (
        <EmptyState title="No purchases yet" description="Record a purchase to bring stock in." />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Warehouse</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(purchases ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.purchase_number}</td>
                  <td>{formatDate(p.purchase_date)}</td>
                  <td>{p.supplier?.name ?? "-"}</td>
                  <td>{p.warehouse?.name ?? "-"}</td>
                  <td className="num">{formatINR(p.grand_total)}</td>
                  <td>
                    <Badge variant={p.status === "received" ? "success" : "danger"}>
                      {p.status}
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
