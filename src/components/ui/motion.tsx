"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function CountUp({
  value,
  duration = 900,
  className,
  format,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    startRef.current = null;
    let raf = 0;
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, prefersReduced]);

  const rounded = Number.isInteger(value) ? Math.round(display) : display;
  return (
    <span className={className}>
      {format ? format(rounded) : rounded.toLocaleString("en-IN")}
    </span>
  );
}

const badgeTones = {
  teal: "bg-primary/15 text-primary",
  aqua: "bg-aqua/15 text-aqua-deep",
  sun: "bg-sun/25 text-sun-deep",
  tangerine: "bg-tangerine/15 text-tangerine-deep",
  coral: "bg-coral/15 text-coral-deep",
  violet: "bg-violet/15 text-violet",
  emerald: "bg-sage/15 text-sage",
  brass: "bg-primary/10 text-primary",
} as const;

export function IconBadge({
  tone,
  children,
  className,
  size = "md",
}: {
  tone: keyof typeof badgeTones;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px]",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-11 w-11",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
