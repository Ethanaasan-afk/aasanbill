import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Round to 2 decimal places using banker's-safe fixed-point approach */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Round to nearest whole rupee */
export function roundRupee(n: number): number {
  return Math.round(n);
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function generateSku(name: string, packSize: string, variant?: string | null): string {
  const base = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join("")
    .slice(0, 9);
  const pack = packSize.replace(/\s+/g, "").toUpperCase();
  const varPart = variant
    ? "-" + variant.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase()
    : "";
  const suffix = Date.now().toString(36).slice(-3).toUpperCase();
  return `${base}${varPart}-${pack}-${suffix}`;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Indian financial year label e.g. 2026-27 */
export function getFinancialYear(date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (m >= 4) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}
