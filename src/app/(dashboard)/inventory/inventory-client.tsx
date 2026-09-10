"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { useStockMovements, useStockMutations } from "@/hooks/use-inventory";
import { useProductMutations, useProducts } from "@/hooks/use-products";
import type { Product, StockMovement } from "@/lib/types";
import { productColor } from "@/lib/product-color";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Package, Pencil, Warehouse } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { IconBadge } from "@/components/ui/motion";
import { useToast } from "@/components/ui/toast";
import { ProductSwatch } from "@/components/ui/product-swatch";

type Tab = "stock" | "log";

function canEditMovement(
  m: StockMovement,
  userId: string | undefined,
  isAdmin: boolean
): boolean {
  if (!userId) return false;
  if (isAdmin) return true;
  return m.created_by === userId;
}

export default function InventoryPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: movements, isLoading: loadingMovements } = useStockMovements();
  const { stockIn, stockOut, adjust, updateMovement } = useStockMutations();
  const { upsert: upsertProduct } = useProductMutations();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("stock");
  const [modal, setModal] = useState<"in" | "out" | "adjust" | null>(null);
  const [detail, setDetail] = useState<StockMovement | null>(null);
  const [editing, setEditing] = useState(false);
  const [stockEdit, setStockEdit] = useState<Product | null>(null);
  const [editReorder, setEditReorder] = useState("0");
  const [editStockQty, setEditStockQty] = useState("0");
  const [editReason, setEditReason] = useState("Stock count / reorder update");
  const [stockEditSaving, setStockEditSaving] = useState(false);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [newQty, setNewQty] = useState("0");
  const [source, setSource] = useState<"production" | "purchase">("production");
  const [batch, setBatch] = useState("");
  const [mfg, setMfg] = useState("");
  const [exp, setExp] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "movements" || t === "log") setTab("log");
    else if (t === "stock") setTab("stock");
  }, [searchParams]);

  const switchTab = (next: Tab) => {
    setTab(next);
    const q = next === "log" ? "?tab=movements" : "";
    router.replace(`/inventory${q}`, { scroll: false });
  };

  const filteredProducts = useMemo(() => {
    return (products ?? []).filter((p) => {
      if (!p.is_active) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, search]);

  const stockMix = useMemo(() => {
    const active = (products ?? []).filter((p) => p.is_active);
    const inStock = active.filter(
      (p) => (p.current_stock ?? 0) > p.reorder_threshold
    ).length;
    const low = active.filter(
      (p) => (p.current_stock ?? 0) > 0 && (p.current_stock ?? 0) <= p.reorder_threshold
    ).length;
    const out = active.filter((p) => (p.current_stock ?? 0) <= 0).length;
    return [
      { name: "In stock", value: inStock, color: "#4ECDC4" },
      { name: "Low stock", value: low, color: "#FF9F5A" },
      { name: "Out of stock", value: out, color: "#FF6B6B" },
    ].filter((d) => d.value > 0);
  }, [products]);

  const productOptions = (products ?? [])
    .filter((p) => p.is_active)
    .map((p) => ({
      value: p.id,
      label: `${p.name}${p.variant ? ` (${p.variant})` : ""} - ${p.pack_size} [stock: ${p.current_stock ?? 0}]`,
    }));

  const resetForm = () => {
    setProductId("");
    setQty("1");
    setNewQty("0");
    setBatch("");
    setMfg("");
    setExp("");
    setReason("");
    setNotes("");
    setReference("");
    setError("");
  };

  const openModal = (type: "in" | "out" | "adjust") => {
    resetForm();
    setModal(type);
  };

  const openStockEdit = (p: Product) => {
    setStockEdit(p);
    setEditReorder(String(p.reorder_threshold));
    setEditStockQty(String(p.current_stock ?? 0));
    setEditReason("Stock count / reorder update");
    setError("");
  };

  const saveStockEdit = async () => {
    if (!stockEdit || !user) return;
    setStockEditSaving(true);
    setError("");
    try {
      if (Number(editReorder) !== stockEdit.reorder_threshold) {
        await upsertProduct.mutateAsync({
          id: stockEdit.id,
          name: stockEdit.name,
          category: stockEdit.category,
          variant: stockEdit.variant,
          sku: stockEdit.sku,
          pack_size: stockEdit.pack_size,
          hsn_code: stockEdit.hsn_code,
          base_price: stockEdit.base_price,
          gst_rate: stockEdit.gst_rate,
          reorder_threshold: Math.max(0, Math.floor(Number(editReorder) || 0)),
          is_active: stockEdit.is_active,
        });
      }
      const current = stockEdit.current_stock ?? 0;
      const nextQty = Math.max(0, Math.floor(Number(editStockQty) || 0));
      if (nextQty !== current) {
        await adjust.mutateAsync({
          product_id: stockEdit.id,
          new_quantity: nextQty,
          reason: editReason.trim() || "Stock adjustment from inventory",
          user_id: user.id,
          current_stock: current,
        });
      }
      toast("Stock record updated");
      setStockEdit(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStockEditSaving(false);
    }
  };

  const openDetail = (m: StockMovement) => {
    setDetail(m);
    setEditing(false);
    setError("");
    setQty(String(Math.abs(m.quantity)));
    setReason(m.reason ?? "");
    setReference(m.reference ?? "");
    setBatch(m.batch_number ?? "");
    setMfg(m.mfg_date ?? "");
    setExp(m.exp_date ?? "");
  };

  const closeDetail = () => {
    setDetail(null);
    setEditing(false);
    setError("");
  };

  const submit = async () => {
    if (!user) return;
    setError("");
    try {
      const parsedQty = Number(qty);
      const parsedNewQty = Number(newQty);
      if (modal === "in") {
        if (!productId || !Number.isFinite(parsedQty) || parsedQty <= 0) throw new Error("Select product and quantity");
        await stockIn.mutateAsync({
          product_id: productId,
          quantity: parsedQty,
          source,
          batch_number: batch || null,
          mfg_date: mfg || null,
          exp_date: exp || null,
          notes: notes || null,
          user_id: user.id,
        });
      } else if (modal === "out") {
        if (!productId || !Number.isFinite(parsedQty) || parsedQty <= 0 || !reason) {
          throw new Error("Product, quantity and reason required");
        }
        const p = products?.find((x) => x.id === productId);
        if ((p?.current_stock ?? 0) < parsedQty) throw new Error("Insufficient stock");
        await stockOut.mutateAsync({
          product_id: productId,
          quantity: parsedQty,
          reason,
          notes: notes || null,
          user_id: user.id,
        });
      } else if (modal === "adjust") {
        if (!isAdmin) throw new Error("Admin only");
        if (!productId || !reason) throw new Error("Product and reason required");
        const p = products?.find((x) => x.id === productId);
        await adjust.mutateAsync({
          product_id: productId,
          new_quantity: Number.isFinite(parsedNewQty) ? Math.max(0, parsedNewQty) : 0,
          reason,
          user_id: user.id,
          current_stock: p?.current_stock ?? 0,
        });
      }
      setModal(null);
      toast(
        modal === "in"
          ? "Stock in recorded"
          : modal === "out"
            ? "Stock out recorded"
            : "Stock adjusted"
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveEdit = async () => {
    if (!user || !detail) return;
    setError("");
    try {
      const parsedQty = Number(qty);
      if (!Number.isFinite(parsedQty) || (detail.movement_type !== "adjustment" && parsedQty <= 0)) {
        throw new Error("Quantity must be greater than 0");
      }
      const signed =
        detail.movement_type === "adjustment"
          ? detail.quantity < 0
            ? -Math.abs(parsedQty)
            : Math.abs(parsedQty)
          : parsedQty;

      await updateMovement.mutateAsync({
        id: detail.id,
        movement_type: detail.movement_type,
        quantity: signed,
        reason: reason || null,
        reference: reference || null,
        batch_number: batch || null,
        mfg_date: mfg || null,
        exp_date: exp || null,
        edited_by: user.id,
      });
      toast("Movement updated");
      closeDetail();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stock"
        title="Inventory"
        description="Stock levels & movement audit trail"
        accent="aqua"
        actions={
          <>
            <Button variant="outline" onClick={() => openModal("in")}>
              Stock in
            </Button>
            <Button variant="outline" onClick={() => openModal("out")}>
              Stock out
            </Button>
            {isAdmin && (
              <Button variant="secondary" onClick={() => openModal("adjust")}>
                Adjust
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === "stock" ? "primary" : "ghost"}
          size="sm"
          onClick={() => switchTab("stock")}
        >
          Current stock
        </Button>
        <Button
          variant={tab === "log" ? "primary" : "ghost"}
          size="sm"
          onClick={() => switchTab("log")}
        >
          Movement log
        </Button>
      </div>

      {tab === "stock" && (
        <>
          <div className="mb-6 grid gap-5 lg:grid-cols-3">
            <div className="panel panel-accent-aqua wash-aqua panel-lift p-5">
              <div className="mb-3 flex items-center gap-2">
                <IconBadge tone="aqua">
                  <Warehouse className="h-4 w-4" />
                </IconBadge>
                <h2 className="font-display text-sm font-semibold text-ink">Stock status</h2>
              </div>
              <div className="mx-auto h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        stockMix.length
                          ? stockMix
                          : [{ name: "None", value: 1, color: "#EAE4D8" }]
                      }
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {(stockMix.length ? stockMix : [{ color: "#EAE4D8" }]).map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5 text-xs">
                {stockMix.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-mono text-ink">{d.value}</span>
                  </li>
                ))}
                {!stockMix.length && <li className="text-slate">No active products yet.</li>}
              </ul>
            </div>
            <div className="panel panel-accent-sun wash-sun panel-lift flex flex-col justify-center p-5">
              <IconBadge tone="sun" className="mb-3">
                <Package className="h-4 w-4" />
              </IconBadge>
              <p className="text-[11px] uppercase tracking-wide text-slate">Products listed</p>
              <p className="font-display text-3xl font-semibold text-ink">
                {filteredProducts.length}
              </p>
            </div>
            <div className="panel panel-accent-tangerine wash-tangerine panel-lift flex flex-col justify-center p-5">
              <IconBadge tone="tangerine" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
              </IconBadge>
              <p className="text-[11px] uppercase tracking-wide text-slate">Needs attention</p>
              <p className="font-display text-3xl font-semibold text-ink">
                {stockMix
                  .filter((d) => d.name !== "In stock")
                  .reduce((s, d) => s + d.value, 0)}
              </p>
            </div>
          </div>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter products…"
            className="mb-4 sm:max-w-xs"
          />
          {loadingProducts ? (
            <LoadingBlock />
          ) : !filteredProducts.length ? (
            <EmptyState title="No products" />
          ) : (
            <div className="panel panel-accent-aqua overflow-x-auto panel-lift">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="num">Stock</th>
                    <th className="num">Reorder at</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const qty = p.current_stock ?? 0;
                    const out = qty <= 0;
                    const low = !out && qty <= p.reorder_threshold;
                    const healthyTarget = Math.max(
                      p.reorder_threshold * 2,
                      p.reorder_threshold + 1,
                      1
                    );
                    const fill = Math.min(1, Math.max(0, qty / healthyTarget));
                    return (
                      <tr
                        key={p.id}
                        className={
                          out ? "row-out-of-stock" : low ? "row-low-stock" : undefined
                        }
                        style={{ boxShadow: `inset 3px 0 0 ${productColor(p.id)}` }}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <ProductSwatch productId={p.id} />
                            <div>
                              {p.name}
                              {p.variant && (
                                <span className="text-slate text-xs"> · {p.variant}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-xs">{p.sku}</td>
                        <td
                          className={`num num-stock ${
                            out ? "text-coral-deep" : low ? "text-tangerine-deep" : "num-stock-ok"
                          }`}
                        >
                          <div className="flex items-center justify-end gap-2">
                            <div
                              className={`stock-bar ${
                                out ? "stock-bar-out" : low ? "stock-bar-low" : ""
                              }`}
                              aria-hidden
                            >
                              <span
                                style={{
                                  width: `${out ? 0 : Math.max(fill * 100, 4)}%`,
                                  background: out
                                    ? undefined
                                    : `linear-gradient(90deg, ${productColor(p.id, 65, 42)}, ${productColor(p.id)})`,
                                }}
                              />
                            </div>
                            <span>{qty}</span>
                          </div>
                        </td>
                        <td className="num">{p.reorder_threshold}</td>
                        <td>
                          {out ? (
                            <Badge variant="danger" color={productColor(p.id)}>
                              Out of stock
                            </Badge>
                          ) : low ? (
                            <Badge variant="warning" color={productColor(p.id)}>
                              Low stock
                            </Badge>
                          ) : (
                            <Badge variant="success" color={productColor(p.id)}>
                              In stock
                            </Badge>
                          )}
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openStockEdit(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "log" &&
        (loadingMovements ? (
          <LoadingBlock />
        ) : !movements?.length ? (
          <EmptyState title="No stock movements yet" />
        ) : (
          <div className="panel panel-accent-tangerine overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th className="num">Qty</th>
                  <th>Reference</th>
                  <th>Reason</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(m)}
                  >
                    <td className="font-mono text-xs whitespace-nowrap text-slate">
                      {formatDate(m.created_at)}
                      {m.edited_at && (
                        <span className="ml-1 text-[10px] text-amber">edited</span>
                      )}
                    </td>
                    <td className="text-sm">
                      <span className="inline-flex items-center gap-2">
                        <ProductSwatch productId={m.product_id} />
                        {m.product?.name ?? m.product_id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="uppercase text-xs text-slate">{m.movement_type}</td>
                    <td className={`num ${m.quantity < 0 ? "text-coral-deep" : "text-aqua-deep"}`}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="text-xs">{m.reference ?? "-"}</td>
                    <td className="text-xs text-muted max-w-[200px] truncate">
                      {m.reason ?? "-"}
                    </td>
                    <td className="text-xs">{m.user?.full_name ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      <Modal
        open={!!detail}
        onClose={closeDetail}
        title={editing ? "Edit stock movement" : "Movement details"}
        size="md"
      >
        {detail && (
          <div className="space-y-4">
            {!editing ? (
              <>
                <DetailRow
                  label="Product"
                  value={detail.product?.name ?? detail.product_id}
                />
                <DetailRow label="Type" value={detail.movement_type.toUpperCase()} />
                <DetailRow
                  label="Quantity"
                  value={
                    detail.quantity > 0 ? `+${detail.quantity}` : String(detail.quantity)
                  }
                />
                <DetailRow label="Reference" value={detail.reference ?? "-"} />
                <DetailRow label="Reason" value={detail.reason ?? "-"} />
                <DetailRow label="Batch number" value={detail.batch_number ?? "-"} />
                <DetailRow label="Mfg date" value={detail.mfg_date ?? "-"} />
                <DetailRow label="Exp date" value={detail.exp_date ?? "-"} />
                <DetailRow label="Created by" value={detail.user?.full_name ?? "-"} />
                <DetailRow label="Created at" value={formatDate(detail.created_at)} />
                {detail.edited_at && (
                  <>
                    <DetailRow
                      label="Last edited by"
                      value={detail.editor?.full_name ?? "-"}
                    />
                    <DetailRow
                      label="Last edited at"
                      value={formatDate(detail.edited_at)}
                    />
                  </>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={closeDetail}>
                    Close
                  </Button>
                  {canEditMovement(detail, user?.id, isAdmin) && (
                    <Button variant="secondary" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate">
                  {detail.product?.name} ·{" "}
                  <span className="uppercase">{detail.movement_type}</span>
                </p>
                <Input
                  label={
                    detail.movement_type === "adjustment"
                      ? "Quantity (absolute; sign kept from original)"
                      : "Quantity"
                  }
                  type="number"
                  min={detail.movement_type === "adjustment" ? 0 : 1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
                <Input
                  label="Reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <Textarea
                  label="Reason / notes"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Input
                  label="Batch number"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Mfg date"
                    type="date"
                    value={mfg}
                    onChange={(e) => setMfg(e.target.value)}
                  />
                  <Input
                    label="Exp date"
                    type="date"
                    value={exp}
                    onChange={(e) => setExp(e.target.value)}
                  />
                </div>
                {error && <p className="text-xs text-rose">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveEdit} loading={updateMovement.isPending}>
                    Save changes
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal === "in" ? "Stock in" : modal === "out" ? "Stock out" : "Stock adjustment"
        }
      >
        <div className="space-y-4">
          <Select
            label="Product"
            options={productOptions}
            placeholder="Select product"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              const p = products?.find((x) => x.id === e.target.value);
              if (p) setNewQty(String(p.current_stock ?? 0));
            }}
          />

          {modal === "in" && (
            <>
              <Input
                label="Quantity"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <Select
                label="Source"
                options={[
                  { value: "production", label: "Production batch" },
                  { value: "purchase", label: "Purchase" },
                ]}
                value={source}
                onChange={(e) => setSource(e.target.value as "production" | "purchase")}
              />
              <Input
                label="Batch number"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mfg date"
                  type="date"
                  value={mfg}
                  onChange={(e) => setMfg(e.target.value)}
                />
                <Input
                  label="Exp date"
                  type="date"
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                />
              </div>
              <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </>
          )}

          {modal === "out" && (
            <>
              <Input
                label="Quantity"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <Select
                label="Reason"
                options={[
                  { value: "Damage", label: "Damage" },
                  { value: "Sample", label: "Sample" },
                  { value: "Return", label: "Return / write-off" },
                  { value: "Other", label: "Other" },
                ]}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </>
          )}

          {modal === "adjust" && (
            <>
              <Input
                label="Counted quantity"
                type="number"
                min={0}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />
              <Textarea
                label="Reason (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </>
          )}

          {error && <p className="text-xs text-rose">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              loading={stockIn.isPending || stockOut.isPending || adjust.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!stockEdit}
        onClose={() => setStockEdit(null)}
        title={stockEdit ? `Edit · ${stockEdit.name}` : "Edit stock"}
      >
        {stockEdit && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-slate">{stockEdit.sku}</p>
            <Input
              label="Current stock (units)"
              type="number"
              min={0}
              value={editStockQty}
              onChange={(e) => setEditStockQty(e.target.value)}
            />
            <Input
              label="Reorder level"
              type="number"
              min={0}
              value={editReorder}
              onChange={(e) => setEditReorder(e.target.value)}
            />
            <Input
              label="Adjustment reason"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
            {error && <p className="text-xs text-coral-deep">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setStockEdit(null)}>
                Cancel
              </Button>
              <Button onClick={saveStockEdit} loading={stockEditSaving}>
                Save changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="shrink-0 text-slate">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}
