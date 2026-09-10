import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, required, ...props }, ref) => (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        required={required}
        className={cn(
          "min-h-[80px] w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-slate-dim",
          "transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
          error && "border-rose focus:border-rose focus:ring-rose/15",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";
