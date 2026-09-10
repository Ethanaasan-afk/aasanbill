"use client";

import { useAuth } from "@/components/auth-provider";
import { APP_NAME, BRAND_LOGO_ICON } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MARKETING_NAV } from "./marketing-links";

export function MarketingNav() {
  const { user, loading } = useAuth();
  const signedIn = !loading && !!user;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[10px] bg-[var(--logo-plate)]">
            <Image
              src={BRAND_LOGO_ICON}
              alt={APP_NAME}
              fill
              className="object-contain p-1"
              sizes="32px"
              priority
            />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-ink">
            {APP_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {MARKETING_NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === l.href ? "text-ink" : "text-slate hover:text-ink"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-11 min-w-[44px] items-center px-3 text-sm font-medium text-slate hover:text-ink"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-11 items-center rounded-[10px] bg-emerald px-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 sm:px-4"
              >
                Sign up free
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-ink md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {MARKETING_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "min-h-[44px] rounded-[10px] px-3 py-2.5 text-sm font-medium",
                  pathname === l.href ? "bg-primary/10 text-primary" : "text-ink hover:bg-cloud"
                )}
              >
                {l.label}
              </Link>
            ))}
            {!signedIn && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-[10px] px-3 py-2.5 text-sm font-medium text-ink hover:bg-cloud sm:hidden"
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
