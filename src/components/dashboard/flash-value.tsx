"use client";

import { formatINR } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

/** Flash highlight only when the value changes after mount (not on first paint). */
export function FlashValue({
  value,
  format = (n: number) => formatINR(n),
  className = "",
  tone = "amber",
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  tone?: "amber" | "emerald" | "rose" | "neutral";
}) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prev.current === null) {
      prev.current = value;
      return;
    }
    if (prev.current === value) return;
    prev.current = value;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 700);
    return () => window.clearTimeout(t);
  }, [value]);

  const toneClass =
    tone === "emerald"
      ? "text-[var(--bb-emerald,#10B981)]"
      : tone === "rose"
        ? "text-[var(--bb-rose,#F43F5E)]"
        : tone === "amber"
          ? "text-[var(--bb-amber,#F59E0B)]"
          : "text-[var(--bb-text)]";

  return (
    <span
      className={`font-mono tabular-nums ${toneClass} ${className} ${
        flash ? "bloomberg-flash" : ""
      }`}
    >
      {format(value)}
    </span>
  );
}

export function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null || !Number.isFinite(pct)) {
    return <span className="font-mono text-[10px] text-[var(--bb-muted)]">-</span>;
  }
  const up = pct >= 0;
  return (
    <span
      className={`font-mono text-[10px] tabular-nums ${
        up ? "text-[var(--bb-emerald,#10B981)]" : "text-[var(--bb-rose,#F43F5E)]"
      }`}
    >
      {up ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}
