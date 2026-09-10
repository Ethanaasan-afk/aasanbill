import {
  APP_NAME,
  BRAND_LOGO_ICON,
  LEGAL_ENTITY_ADDRESS,
  LEGAL_ENTITY_NAME,
  LEGAL_SUPPORT_EMAIL,
} from "@/lib/brand";
import Image from "next/image";
import Link from "next/link";
import { MARKETING_NAV } from "./marketing-links";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-cloud py-12">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative h-7 w-7 overflow-hidden rounded-[8px] bg-[var(--logo-plate)]">
              <Image
                src={BRAND_LOGO_ICON}
                alt={APP_NAME}
                fill
                className="object-contain p-0.5"
                sizes="28px"
              />
            </span>
            <span className="font-display text-sm font-semibold text-ink">{APP_NAME}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate">
            GST billing and inventory for Indian small businesses. Made in Ahmedabad.
          </p>
          <p className="mt-4 text-[11px] text-slate-dim">{LEGAL_ENTITY_NAME}</p>
          <p className="mt-1 text-[11px] text-slate-dim">{LEGAL_ENTITY_ADDRESS}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Product</p>
          <ul className="mt-3 space-y-2">
            {MARKETING_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-ink hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/signup" className="text-sm text-ink hover:text-primary">
                Start free trial
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">Legal</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/privacy-policy" className="text-sm text-ink hover:text-primary">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-sm text-ink hover:text-primary">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="text-sm text-ink hover:text-primary">
                Refund Policy
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {LEGAL_SUPPORT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl px-4 text-center text-[11px] text-slate-dim sm:px-6">
        © {new Date().getFullYear()} {LEGAL_ENTITY_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
