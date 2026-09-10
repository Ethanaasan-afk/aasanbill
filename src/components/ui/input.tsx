import { HelpTip } from "@/components/ui/help-tip";
import type { HelpKey } from "@/lib/help-copy";
import { getNumberInputHandlers } from "@/lib/number-input";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Everyday explanation shown next to the label */
  help?: string;
  helpKey?: HelpKey;
  /**
   * For type="number": when the field is cleared and blurred, restore "0".
   * Set false for optional numeric fields (e.g. manufacturing cost).
   */
  emptyAsZero?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      id,
      required,
      help,
      helpKey,
      type,
      emptyAsZero = false,
      onFocus,
      onBlur,
      onChange,
      onMouseUp,
      ...props
    },
    ref
  ) => {
    const numberHandlers =
      type === "number"
        ? getNumberInputHandlers({
            onFocus,
            onBlur,
            onChange,
            onMouseUp,
            emptyAsZero,
          })
        : null;

    return (
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
        <input
          ref={ref}
          id={id}
          type={type}
          required={required}
          className={cn(
            "h-11 min-h-[44px] w-full rounded-[10px] border border-border bg-surface px-3 text-base text-ink placeholder:text-slate-dim md:text-sm",
            "transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
            error && "border-rose focus:border-rose focus:ring-rose/15",
            className
          )}
          {...props}
          {...(numberHandlers ?? { onFocus, onBlur, onChange, onMouseUp })}
        />
        {error && <p className="text-xs text-rose">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
