"use client";

import { HELP, type HelpKey } from "@/lib/help-copy";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import { useId, useState } from "react";

/** Small "?" tip next to a technical label - works on hover and tap. */
export function HelpTip({
  text,
  helpKey,
  className,
}: {
  text?: string;
  helpKey?: HelpKey;
  className?: string;
}) {
  const tip = text ?? (helpKey ? HELP[helpKey] : "");
  const id = useId();
  const [open, setOpen] = useState(false);
  if (!tip) return null;

  return (
    <span className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="What does this mean?"
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-[10px] border border-border bg-ink px-3 py-2 text-left text-xs font-normal normal-case tracking-normal text-white shadow-lift"
        >
          {tip}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
        </span>
      )}
    </span>
  );
}

/** Label row with optional help tip - use next to field labels. */
export function LabelWithHelp({
  children,
  helpKey,
  help,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  helpKey?: HelpKey;
  help?: string;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("field-label inline-flex items-center gap-1.5", className)}>
      <span>{children}</span>
      <HelpTip helpKey={helpKey} text={help} />
    </label>
  );
}
