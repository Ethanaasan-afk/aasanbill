import { APP_NAME, BRAND_LOGO_ICON } from "@/lib/brand";
import { cn, formatINR } from "@/lib/utils";
import Image from "next/image";

/** Browser-frame mock of the live invoice UI (no stock photos). */
export function ProductMockup({ className }: { className?: string }) {
  return (
    <div className={cn("relative animate-marketing-rise", className)}>
      <div className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-lift">
        <div className="flex items-center gap-2 border-b border-border bg-cloud px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-coral/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald/80" />
          <span className="ml-2 flex-1 truncate rounded-md bg-surface px-2 py-1 font-mono text-[10px] text-slate-dim">
            app.aasanbill.in/invoices
          </span>
        </div>
        <div className="grid gap-0 sm:grid-cols-[140px_1fr]">
          <aside className="hidden border-r border-border bg-[var(--sidebar)] p-3 sm:block">
            <div className="mb-4 flex items-center gap-2">
              <span className="relative h-6 w-6 overflow-hidden rounded-md bg-[var(--logo-plate)]">
                <Image
                  src={BRAND_LOGO_ICON}
                  alt=""
                  fill
                  className="object-contain p-0.5"
                  sizes="24px"
                />
              </span>
              <span className="font-display text-[11px] font-semibold text-ink">{APP_NAME}</span>
            </div>
            {["Dashboard", "Products", "Invoices", "Outstanding"].map((item, i) => (
              <div
                key={item}
                className={cn(
                  "mb-1 rounded-lg px-2 py-1.5 text-[11px]",
                  i === 2 ? "bg-primary/10 font-medium text-primary" : "text-slate"
                )}
              >
                {item}
              </div>
            ))}
          </aside>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                  Invoice
                </p>
                <p className="font-display text-lg font-semibold text-ink">AB/2026-27/0042</p>
                <p className="text-xs text-slate">Shah Traders · Gujarat</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-2 py-1 text-[10px] font-medium text-amber">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                Partially paid
              </span>
            </div>
            <div className="overflow-hidden rounded-[10px] border border-border">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border bg-cloud px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-slate">
                <span>Item</span>
                <span>Qty</span>
                <span>Amount</span>
              </div>
              {[
                { name: "Handwash - Rose 500ml", qty: "12", amt: "₹1,204" },
                { name: "Floor Cleaner 1L", qty: "6", amt: "₹850" },
              ].map((row) => (
                <div
                  key={row.name}
                  className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border/60 px-3 py-2 text-xs last:border-0"
                >
                  <span className="truncate text-ink">{row.name}</span>
                  <span className="font-mono text-slate">{row.qty}</span>
                  <span className="font-mono text-ink">{row.amt}</span>
                </div>
              ))}
            </div>
            <div className="flex items-end justify-between gap-3 rounded-[10px] border border-sage bg-sage-soft px-3 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">
                  Grand total
                </p>
                <p className="text-[10px] text-slate">CGST + SGST · Intra-state</p>
              </div>
              <p className="font-display text-xl font-semibold text-sage">
                <span className="font-mono">{formatINR(2054)}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-lg bg-emerald/15 px-2.5 py-1 text-[10px] font-medium text-emerald">
                WhatsApp ready
              </span>
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                Udhaar balance ₹800
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
