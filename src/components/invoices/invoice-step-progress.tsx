"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, title: "Who is this for?" },
  { n: 2, title: "What are they buying?" },
  { n: 3, title: "Check everything" },
  { n: 4, title: "Send it" },
] as const;

export function InvoiceStepProgress({
  step,
  onStepClick,
}: {
  step: number;
  onStepClick?: (step: number) => void;
}) {
  const pct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="mb-6 panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">
          Step {step} of {STEPS.length}:{" "}
          <span className="text-slate">{STEPS[step - 1]?.title}</span>
        </p>
        <p className="text-xs text-slate hidden sm:block">Take it one step at a time</p>
      </div>
      <div className="relative mb-4 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="flex justify-between gap-1">
        {STEPS.map((s) => {
          const done = s.n < step;
          const current = s.n === step;
          return (
            <li key={s.n} className="flex flex-1 flex-col items-center gap-1.5">
              <button
                type="button"
                disabled={!onStepClick || s.n > step}
                onClick={() => onStepClick?.(s.n)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  current && "bg-primary text-white shadow-sm",
                  done && "bg-sage text-white",
                  !current && !done && "bg-cloud text-slate border border-border",
                  onStepClick && s.n <= step && "cursor-pointer hover:opacity-90"
                )}
                aria-current={current ? "step" : undefined}
              >
                {done ? "✓" : s.n}
              </button>
              <span
                className={cn(
                  "hidden text-center text-[11px] leading-tight sm:block",
                  current ? "font-medium text-ink" : "text-slate"
                )}
              >
                {s.title}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
