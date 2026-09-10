"use client";

import { useProducts } from "@/hooks/use-products";
import { useInvoices } from "@/hooks/use-invoices";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type NotificationTone = "warning" | "danger" | "info" | "success";

export type AppNotification = {
  id: string;
  tone: NotificationTone;
  title: string;
  body: string;
  href: string;
  createdAt: string;
};

const READ_KEY = "aura_notifications_read_v1";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
}

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(isoDate + "T00:00:00");
  return Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function useNotifications() {
  const { data: products } = useProducts(true);
  const { data: invoices } = useInvoices();
  const qc = useQueryClient();

  const { data: readIds = new Set<string>() } = useQuery({
    queryKey: ["notifications", "read"],
    queryFn: () => loadReadIds(),
    staleTime: Infinity,
  });

  const items = useMemo(() => {
    const list: AppNotification[] = [];
    const now = new Date().toISOString();

    for (const p of products ?? []) {
      const qty = p.current_stock ?? 0;
      const name = `${p.name}${p.variant ? ` (${p.variant})` : ""}`;

      if (qty <= 0) {
        list.push({
          id: `stock-out-${p.id}`,
          tone: "danger",
          title: "Out of stock",
          body: `${name} has 0 units on hand.`,
          href: `/products/${p.id}`,
          createdAt: now,
        });
      } else if (qty <= p.reorder_threshold) {
        list.push({
          id: `stock-low-${p.id}`,
          tone: "warning",
          title: "Low stock",
          body: `${name} is at ${qty} units (reorder at ${p.reorder_threshold}).`,
          href: `/inventory`,
          createdAt: now,
        });
      }

      if (p.exp_date) {
        const days = daysUntil(p.exp_date);
        if (days < 0) {
          list.push({
            id: `exp-past-${p.id}`,
            tone: "danger",
            title: "Product expired",
            body: `${name} expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago.`,
            href: `/products/${p.id}`,
            createdAt: now,
          });
        } else if (days <= 30) {
          list.push({
            id: `exp-soon-${p.id}`,
            tone: days <= 7 ? "danger" : "warning",
            title: "Expiring soon",
            body:
              days === 0
                ? `${name} expires today.`
                : `${name} expires in ${days} day${days === 1 ? "" : "s"}.`,
            href: `/products/${p.id}`,
            createdAt: now,
          });
        }
      }
    }

    const unpaid = (invoices ?? [])
      .filter((i) => i.status === "issued")
      .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date))
      .slice(0, 8);

    for (const inv of unpaid) {
      list.push({
        id: `inv-issued-${inv.id}`,
        tone: "info",
        title: "Invoice awaiting payment",
        body: `${inv.invoice_number} is still issued - mark paid when settled.`,
        href: `/invoices/${inv.id}`,
        createdAt: inv.invoice_date,
      });
    }

    // Urgency: danger → warning → info; then newest first
    const rank = (t: NotificationTone) =>
      t === "danger" ? 0 : t === "warning" ? 1 : t === "info" ? 2 : 3;
    list.sort((a, b) => rank(a.tone) - rank(b.tone) || b.createdAt.localeCompare(a.createdAt));

    return list.slice(0, 40);
  }, [products, invoices]);

  const unread = items.filter((n) => !readIds.has(n.id));
  const unreadCount = unread.length;

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    saveReadIds(next);
    qc.setQueryData(["notifications", "read"], next);
  };

  const markAllRead = () => {
    const next = new Set(readIds);
    for (const n of items) next.add(n.id);
    saveReadIds(next);
    qc.setQueryData(["notifications", "read"], next);
  };

  const isRead = (id: string) => readIds.has(id);

  return { items, unread, unreadCount, markRead, markAllRead, isRead };
}
