"use client";

import { isDemoMode } from "@/lib/demo/mode";

export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="sticky top-0 z-40 border-b border-amber/25 bg-amber-soft px-4 py-2 text-center text-xs font-medium text-amber">
      Demo Mode - data is not saved
    </div>
  );
}
