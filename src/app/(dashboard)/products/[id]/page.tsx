"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { usePriceHistory, useProduct } from "@/hooks/use-products";
import { useStockMovements } from "@/hooks/use-inventory";
import { formatDate, formatINR } from "@/lib/utils";
import { productColor } from "@/lib/product-color";
import { ProductSwatch, ProductTag } from "@/components/ui/product-swatch";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: product, isLoading } = useProduct(id);
  const { data: history } = usePriceHistory(id);
  const { data: movements } = useStockMovements(id);

  if (isLoading) return <LoadingBlock />;
  if (!product) return <EmptyState title="Product not found" />;

  const low = (product.current_stock ?? 0) <= product.reorder_threshold;
  const accent = productColor(product.id);

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`${product.category}${product.variant ? ` · ${product.variant}` : ""} · ${product.pack_size}`}
        actions={
          <Link href="/products">
            <Button variant="outline">Back to list</Button>
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <ProductSwatch productId={product.id} size="md" />
        <ProductTag productId={product.id}>{product.category}</ProductTag>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="SKU" value={product.sku} mono />
        <Stat label="Base price" value={formatINR(product.base_price)} />
        <Stat label="GST" value={`${product.gst_rate}%`} />
        <Stat
          label="Current stock"
          value={String(product.current_stock ?? 0)}
          badge={low ? "Low stock" : undefined}
          accent={accent}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="panel p-4"
          style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
        >
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">HSN</dt>
              <dd className="font-mono">{product.hsn_code}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Reorder at</dt>
              <dd>{product.reorder_threshold}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Status</dt>
              <dd>
                <Badge
                  variant={product.is_active ? "success" : "default"}
                  color={accent}
                >
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Mfg cost</dt>
              <dd className="font-mono">
                {product.manufacturing_cost != null
                  ? formatINR(product.manufacturing_cost)
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Manufacturing</dt>
              <dd className="font-mono text-sm">
                {product.mfg_date ? formatDate(product.mfg_date) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Expiry</dt>
              <dd className="font-mono text-sm">
                {product.exp_date ? formatDate(product.exp_date) : "-"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Price history</h2>
          {!history?.length ? (
            <p className="text-xs text-muted">No price changes recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex justify-between border-b border-border/50 pb-2">
                  <span>
                    {h.old_price != null ? formatINR(Number(h.old_price)) : "-"} →{" "}
                    {formatINR(Number(h.new_price))}
                  </span>
                  <span className="text-xs text-muted">{formatDate(h.changed_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Recent stock movements</h2>
          {!movements?.length ? (
            <p className="text-xs text-muted">No movements yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Reference</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 20).map((m) => (
                    <tr key={m.id}>
                      <td className="text-xs">{formatDate(m.created_at)}</td>
                      <td className="uppercase text-xs">{m.movement_type}</td>
                      <td className={m.quantity < 0 ? "text-danger" : "text-success"}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="text-xs">{m.reference ?? "-"}</td>
                      <td className="text-xs text-muted">{m.reason ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  badge,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: string;
  accent?: string;
}) {
  return (
    <div className="panel p-4" style={accent ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
      {badge && (
        <Badge variant="danger" className="mt-2" color={accent}>
          {badge}
        </Badge>
      )}
    </div>
  );
}
