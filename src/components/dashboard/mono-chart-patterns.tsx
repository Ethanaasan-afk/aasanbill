"use client";

/** Pattern fills using AasanBill tokens (white/light surface + brand blue). */
export function MonoChartPatterns() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <pattern id="mono-dots" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="var(--primary-soft)" />
          <circle cx="1.2" cy="1.2" r="0.8" fill="var(--primary)" />
        </pattern>
        <pattern id="mono-diag" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="var(--amber-soft)" />
          <rect width="3" height="8" fill="var(--amber)" />
        </pattern>
        <pattern id="mono-vert" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="var(--rose-soft)" />
          <rect width="2" height="6" fill="var(--rose)" />
        </pattern>
        <pattern id="mono-dots-fill" patternUnits="userSpaceOnUse" width="8" height="8">
          <rect width="8" height="8" fill="var(--aqua-wash)" />
          <circle cx="2" cy="2" r="0.9" fill="var(--aqua)" />
        </pattern>
        <linearGradient id="mono-wave" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const MONO_TOOLTIP = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 12,
  boxShadow: "var(--card-shadow)",
};
