"use client";

import { cn } from "@/lib/utils";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto rounded-card border px-4 py-3 text-sm shadow-lift animate-in",
              t.tone === "success" &&
                "border-aqua/40 bg-surface text-ink [box-shadow:0_8px_24px_rgba(0,168,150,0.18)]",
              t.tone === "error" && "border-coral/40 bg-surface text-coral-deep",
              t.tone === "info" && "border-border bg-surface text-ink"
            )}
            role="status"
          >
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  t.tone === "success" && "bg-aqua",
                  t.tone === "error" && "bg-coral",
                  t.tone === "info" && "bg-vivid-teal"
                )}
              />
              <p>{t.message}</p>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
