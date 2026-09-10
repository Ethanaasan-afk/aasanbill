"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type FaqItemData = { q: string; a: string };

export function FaqList({ items }: { items: FaqItemData[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <FaqItem key={item.q} question={item.q} answer={item.a} />
      ))}
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[12px] border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="font-display text-sm font-semibold text-ink">{question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open && (
        <p className="border-t border-border/70 px-4 py-3 text-sm leading-relaxed text-slate">
          {answer}
        </p>
      )}
    </div>
  );
}
