import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "btn-gradient font-semibold",
  secondary:
    "bg-surface border border-border text-ink shadow-sm hover:bg-surface-hover hover:-translate-y-0.5 hover:shadow-card",
  ghost: "bg-transparent text-slate hover:text-ink hover:bg-primary/5",
  danger: "bg-surface border border-coral text-coral-deep hover:bg-rose-soft",
  outline:
    "bg-surface border border-primary/30 text-primary hover:bg-primary/5 hover:border-primary",
};

const sizes: Record<Size, string> = {
  sm: "min-h-[44px] h-11 px-3.5 text-sm rounded-button",
  md: "min-h-[44px] h-11 px-4 text-sm rounded-button",
  lg: "min-h-[48px] h-12 px-6 text-base rounded-button",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
