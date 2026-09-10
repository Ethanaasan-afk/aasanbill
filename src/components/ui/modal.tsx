"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, children, className, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-t-[16px] border border-border bg-surface shadow-lift sm:rounded-[10px]",
          "max-h-[92dvh] sm:max-h-[85vh]",
          sizes[size],
          className
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="flex items-center justify-between border-b border-border px-5 py-3 sm:py-4">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" /> Close
          </Button>
        </div>
        <div className="max-h-[calc(92dvh-4.5rem)] overflow-y-auto overscroll-contain p-5 sm:max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>
  );
}
