import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-surface py-16 px-6 text-center shadow-card",
        className
      )}
    >
      <p className="font-display text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  accent,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  /** Category accent for page identity */
  accent?: "teal" | "aqua" | "sun" | "tangerine" | "coral" | "sage" | "violet";
}) {
  const accentBar =
    accent === "teal"
      ? "bg-primary"
      : accent === "aqua"
        ? "bg-aqua"
        : accent === "sun"
          ? "bg-sun-deep"
          : accent === "tangerine"
            ? "bg-tangerine"
            : accent === "coral"
              ? "bg-coral"
              : accent === "sage"
                ? "bg-sage"
                : accent === "violet"
                  ? "bg-violet"
                  : "bg-primary";

  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-3">
          <span className={`h-8 w-1.5 shrink-0 rounded-full ${accentBar}`} aria-hidden />
          <h1 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl md:text-[1.75rem]">
            {title}
          </h1>
        </div>
        {description && <p className="mt-1.5 text-sm text-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
