"use client";

import { useBusinessType } from "@/hooks/use-business-type";
import { cn } from "@/lib/utils";
import {
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  CalendarRange,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const { isHotel, labels } = useBusinessType();
  const catalogHref = isHotel ? "/bookings" : "/products";
  const catalogLabel = isHotel ? "Bookings" : labels.productPlural;
  const CatalogIcon = isHotel ? CalendarRange : Package;

  const tabs = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
    {
      href: "/invoices",
      label: "Invoices",
      icon: FileText,
      match: (p: string) => p.startsWith("/invoices"),
    },
    {
      href: "/customers",
      label: "Customers",
      icon: Users,
      match: (p: string) => p.startsWith("/customers"),
    },
    {
      href: catalogHref,
      label: catalogLabel,
      icon: CatalogIcon,
      match: (p: string) => p.startsWith(catalogHref),
    },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium",
                  active ? "text-primary" : "text-slate"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className="flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-slate"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
