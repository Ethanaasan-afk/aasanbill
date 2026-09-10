import { HelpTip } from "@/components/ui/help-tip";
import type { HelpKey } from "@/lib/help-copy";
import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  helpKey?: HelpKey;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, id, options, placeholder, required, help, helpKey, ...props },
    ref
  ) => (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="field-label inline-flex items-center gap-1.5">
          <span>
            {label}
            {required && <span className="ml-0.5 text-primary">*</span>}
          </span>
          {(help || helpKey) && <HelpTip text={help} helpKey={helpKey} />}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        required={required}
        className={cn(
          "h-11 min-h-[44px] w-full rounded-[10px] border border-border bg-surface px-3 text-base text-ink md:text-sm",
          "transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
          error && "border-rose focus:border-rose focus:ring-rose/15",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";
