"use client";

import {
  useNotifications,
  type AppNotification,
  type NotificationTone,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Clock,
  FileWarning,
  PackageX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function toneStyles(tone: NotificationTone) {
  switch (tone) {
    case "danger":
      return {
        iconWrap: "bg-rose-soft text-coral-deep",
        Icon: PackageX,
      };
    case "warning":
      return {
        iconWrap: "bg-amber-soft text-tangerine-deep",
        Icon: AlertTriangle,
      };
    case "info":
      return {
        iconWrap: "bg-primary/10 text-primary",
        Icon: FileWarning,
      };
    default:
      return {
        iconWrap: "bg-sage-soft text-sage",
        Icon: Clock,
      };
  }
}

function NotificationRow({
  item,
  read,
  onOpen,
}: {
  item: AppNotification;
  read: boolean;
  onOpen: () => void;
}) {
  const { iconWrap, Icon } = toneStyles(item.tone);
  return (
    <Link
      href={item.href}
      onClick={onOpen}
      className={cn(
        "flex gap-3 px-4 py-3 transition-colors hover:bg-primary/5",
        !read && "bg-primary/[0.03]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
          iconWrap
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm text-ink", !read ? "font-semibold" : "font-medium")}>
            {item.title}
          </p>
          {!read && (
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate">{item.body}</p>
      </div>
    </Link>
  );
}

export function NotificationsBell() {
  const { items, unreadCount, markRead, markAllRead, isRead } = useNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-slate shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:text-ink hover:shadow-lift",
          open && "border-primary/40 text-primary ring-4 ring-primary/10"
        )}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 z-40 mt-2 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-[12px] border border-border bg-surface shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="font-display text-sm font-semibold text-ink">Notifications</p>
                <p className="text-[11px] text-slate">
                  {unreadCount === 0
                    ? "You're all caught up"
                    : `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}`}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/5"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
              {!items.length ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-slate-dim" />
                  <p className="text-sm font-medium text-ink">No alerts right now</p>
                  <p className="mt-1 text-xs text-slate">
                    Low stock, expiry, and unpaid invoices show up here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((item) => (
                    <li key={item.id}>
                      <NotificationRow
                        item={item}
                        read={isRead(item.id)}
                        onOpen={() => {
                          markRead(item.id);
                          setOpen(false);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
