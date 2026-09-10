import {
  APP_NAME,
  BRAND_LOGO_ICON,
  LEGAL_ENTITY_NAME,
  LEGAL_SUPPORT_EMAIL,
} from "@/lib/brand";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-cloud">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(29,78,216,0.14), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(56,189,248,0.10), transparent)",
        }}
      />
      <header className="relative border-b border-border/70 bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/login" className="flex items-center gap-2.5">
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
            <span className="font-display text-sm font-semibold tracking-tight text-ink">
              {APP_NAME}
            </span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Legal
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate">Last updated: {updated}</p>

        <article className="panel mt-8 space-y-8 p-5 text-sm leading-relaxed text-ink sm:p-8">
          {children}
        </article>

        <footer className="mt-10 space-y-2 text-center text-xs text-slate">
          <p>
            © {new Date().getFullYear()} {LEGAL_ENTITY_NAME}. {APP_NAME} is a
            product of {LEGAL_ENTITY_NAME}.
          </p>
          <p>
            <a
              href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
              className="font-medium text-primary hover:underline"
            >
              {LEGAL_SUPPORT_EMAIL}
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-3">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-slate [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
