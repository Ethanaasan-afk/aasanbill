import { cn } from "@/lib/utils";
import { productColor, productTagStyle } from "@/lib/product-color";

/** Small colored dot keyed to a product ID. */
export function ProductSwatch({
  productId,
  className,
  size = "sm",
}: {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full",
        size === "md" ? "h-3 w-3" : "h-2.5 w-2.5",
        className
      )}
      style={{ background: productColor(productId) }}
      aria-hidden
    />
  );
}

/** Pill tag with deterministic product color. */
export function ProductTag({
  productId,
  children,
  className,
}: {
  productId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const style = productTagStyle(productId);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={style}
    >
      <ProductSwatch productId={productId} />
      {children}
    </span>
  );
}
