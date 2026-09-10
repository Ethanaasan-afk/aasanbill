import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const dots: Record<BadgeVariant, string> = {
  default: "bg-slate",
  success: "bg-aqua-deep",
  warning: "bg-tangerine",
  danger: "bg-coral",
  info: "bg-brass",
};

export function Badge({
  children,
  variant = "default",
  className,
  color,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  /** Override the status-dot color (e.g. deterministic productColor). */
  color?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium capitalize text-ink",
        className
      )}
    >
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", !color && dots[variant])}
        style={color ? { background: color } : undefined}
      />
      {children}
    </span>
  );
}
