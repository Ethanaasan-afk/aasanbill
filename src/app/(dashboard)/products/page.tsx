"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { useProductMutations, useProducts } from "@/hooks/use-products";
import { useOrgAccess } from "@/hooks/use-org-access";
import { useBusinessType } from "@/hooks/use-business-type";
import { useLiveMarketRates } from "@/hooks/use-live-market-rates";
import { findLatestRate, useMetalRates } from "@/hooks/use-metal-rates";
import { categoryOptionsForBusinessType } from "@/lib/business-types";
import {
  calcJewelleryTaxable,
  isJewelleryProduct,
  resolveJewelleryRatePerGram,
} from "@/lib/jewellery";
import { calcProductMargin, MARGIN_BADGE_CLASS } from "@/lib/product-margin";
import { productColor } from "@/lib/product-color";
import type { Product } from "@/lib/types";
import { formatINR, formatDate } from "@/lib/utils";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ProductSwatch, ProductTag } from "@/components/ui/product-swatch";

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const { writesBlocked } = useOrgAccess();
  const { labels, businessType, isHotel, isJewellery } = useBusinessType();
  const { data: products, isLoading } = useProducts();
  const { data: metalRates } = useMetalRates();
  const { data: liveMarket } = useLiveMarketRates(isJewellery);
  const { remove } = useProductMutations();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isHotel) {
    redirect("/room-types");
  }

  const estimatePrice = (p: Product) => {
    if (!isJewellery || !isJewelleryProduct(p)) return p.base_price;
    const shop = findLatestRate(metalRates, p.metal_type, p.purity);
    const { ratePerGram } = resolveJewelleryRatePerGram({
      metal: p.metal_type,
      purity: p.purity,
      liveRates: liveMarket?.rates,
      shopRatePerGram: shop?.rate_per_gram ?? null,
    });
    if (!(ratePerGram > 0)) return null;
    return calcJewelleryTaxable({
      netWeight: Number(p.net_weight) || 0,
      grossWeight: Number(p.gross_weight) || Number(p.net_weight) || 0,
      ratePerGram,
      makingChargeType: p.making_charge_type,
      makingChargeValue: Number(p.making_charge_value) || 0,
      stoneValue: Number(p.stone_value) || 0,
      wastagePercent: Number(p.wastage_percent) || 0,
    }).taxableValue;
  };

  const categoryFilterOptions = useMemo(
    () =>
      categoryOptionsForBusinessType(
        businessType,
        (products ?? []).map((p) => p.category)
      ),
    [businessType, products]
  );

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      if (!showInactive && !p.is_active) return false;
      if (category && p.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.variant ?? "").toLowerCase().includes(q) ||
          (p.imei_serial ?? "").toLowerCase().includes(q) ||
          p.hsn_code.includes(q)
        );
      }
      return true;
    });
  }, [products, search, category, showInactive]);

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title={labels.productPlural}
        description="Catalog, pricing & HSN codes"
        accent="sun"
        actions={
          writesBlocked ? undefined : (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> {labels.addProduct}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, SKU, HSN…"
          className="sm:max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-[10px] border border-border bg-surface px-3 text-sm text-ink focus:border-emerald focus:outline-none"
        >
          <option value="">All categories</option>
          {categoryFilterOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : !filtered.length ? (
        <EmptyState
          title={`No ${labels.productPlural.toLowerCase()} yet`}
          description="Add what you sell - name, price, and tax details - then you can put them on invoices."
          action={
            writesBlocked ? undefined : (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add your first product
              </Button>
            )
          }
        />
      ) : (
        <div className="panel panel-accent-sun overflow-x-auto panel-lift">
          <table className="data-table">
            <thead>
              <tr>
                <th>{labels.product}</th>
                <th>SKU</th>
                <th>Pack</th>
                <th>HSN</th>
                <th className="num">{isJewellery ? "Est. @ today" : "Price"}</th>
                <th className="num">Margin %</th>
                <th className="num">GST</th>
                <th className="num">Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
                  {filtered.map((p) => {
                const qty = p.current_stock ?? 0;
                const out = qty <= 0;
                const low = !out && qty <= p.reorder_threshold;
                const healthyTarget = Math.max(p.reorder_threshold * 2, p.reorder_threshold + 1, 1);
                const fill = Math.min(1, Math.max(0, qty / healthyTarget));
                const est = estimatePrice(p);
                const margin = calcProductMargin(
                  isJewellery ? est ?? 0 : p.base_price,
                  p.manufacturing_cost
                );
                return (
                  <tr
                    key={p.id}
                    className={
                      out ? "row-out-of-stock" : low ? "row-low-stock" : undefined
                    }
                    style={{ boxShadow: `inset 3px 0 0 ${productColor(p.id)}` }}
                  >
                    <td>
                      <div className="flex items-start gap-2">
                        <ProductSwatch productId={p.id} className="mt-1.5" />
                        <div className="min-w-0">
                          <Link
                            href={`/products/${p.id}`}
                            className="font-medium text-ink hover:text-emerald"
                          >
                            {p.name}
                          </Link>
                          {p.variant && (
                            <span className="ml-1 text-xs text-slate">· {p.variant}</span>
                          )}
                          <div className="mt-1">
                            <ProductTag productId={p.id}>{p.category}</ProductTag>
                          </div>
                          {(p.mfg_date || p.exp_date) && (
                            <p className="mt-1 font-mono text-[11px] text-slate">
                              {p.mfg_date ? `Mfg ${formatDate(p.mfg_date)}` : null}
                              {p.mfg_date && p.exp_date ? " · " : null}
                              {p.exp_date ? `Exp ${formatDate(p.exp_date)}` : null}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{p.sku}</td>
                    <td>{p.pack_size}</td>
                    <td className="font-mono text-xs">{p.hsn_code}</td>
                    <td className="num">
                      {est == null ? (
                        <span className="text-slate">—</span>
                      ) : (
                        formatINR(est)
                      )}
                    </td>
                    <td className="num">
                      {margin ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${MARGIN_BADGE_CLASS[margin.tone]}`}
                        >
                          {margin.label}
                        </span>
                      ) : (
                        <span className="text-slate">-</span>
                      )}
                    </td>
                    <td className="num">{p.gst_rate}%</td>
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
                        {out && <span className="text-[11px] text-coral-deep">Out</span>}
                        {low && !out && (
                          <span className="text-[11px] text-tangerine-deep">Low</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge
                        variant={p.is_active ? "success" : "default"}
                        color={productColor(p.id)}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(p.id)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete this product?"
        message={`Are you sure you want to delete ${
          products?.find((p) => p.id === deleteId)?.name ?? "this product"
        }? This cannot be undone.`}
        confirmLabel="Yes, delete"
        danger
        loading={remove.isPending}
        onConfirm={async () => {
          if (deleteId) {
            await remove.mutateAsync(deleteId);
            toast("Done - product removed.");
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
