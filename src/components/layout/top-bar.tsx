"use client";

import { useAuth } from "@/components/auth-provider";
import { NotificationsBell } from "@/components/layout/notifications-panel";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { useBusinessType } from "@/hooks/use-business-type";
import {
  ChevronDown,
  LogOut,
  Plus,
  Search,
  FileText,
  Package,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function TopBar() {
  const { user, signOut } = useAuth();
  const { labels } = useBusinessType();
  const [q, setQ] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const initial = (user?.full_name?.trim()?.[0] ?? "U").toUpperCase();

  return (
    <header className="mb-5 flex flex-wrap items-center gap-2 sm:mb-7 sm:gap-3">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products, invoices, customers…"
          className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-4 text-base text-ink shadow-card placeholder:text-slate-dim transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 md:text-sm"
          aria-label="Global search"
        />
      </div>

      <div className="relative">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setQuickOpen((v) => !v)}
          className="gap-1.5 px-3"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick actions</span>
          <span className="sm:hidden">New</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
        {quickOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              aria-label="Close quick actions"
              onClick={() => setQuickOpen(false)}
            />
            <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-[10px] border border-border bg-surface py-1 shadow-lift">
              <Link
                href="/invoices/new"
                onClick={() => setQuickOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-primary/5"
              >
                <FileText className="h-4 w-4 text-primary" /> New invoice
              </Link>
              <Link
                href="/products"
                onClick={() => setQuickOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-primary/5"
              >
                <Package className="h-4 w-4 text-primary" /> {labels.addProduct}
              </Link>
              <Link
                href="/customers"
                onClick={() => setQuickOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-primary/5"
              >
                <Users className="h-4 w-4 text-primary" /> Add customer
              </Link>
            </div>
          </>
        )}
      </div>

      <ThemeToggle />

      <NotificationsBell />

      <div className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface py-1.5 pl-1.5 pr-3 shadow-card">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-blue-dark)] to-[var(--brand-blue-light)] text-[11px] font-semibold text-white">
          {initial}
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-medium text-ink">{user?.full_name}</p>
          <p className="text-[11px] capitalize text-slate">{user?.role}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="ml-1 rounded-lg p-1.5 text-slate transition-colors hover:bg-rose-soft hover:text-coral-deep"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
