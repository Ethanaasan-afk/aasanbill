"use client";

import { PricingPlans } from "@/components/billing/pricing-plans";
import { FaqList } from "@/components/marketing/faq-list";
import { MarketingFinalCta } from "@/components/marketing/marketing-final-cta";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { ProductMockup } from "@/components/marketing/product-mockup";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/business-types";
import {
  AlertTriangle,
  BedDouble,
  Briefcase,
  CircleDot,
  FileSpreadsheet,
  HandCoins,
  MessageCircle,
  Package,
  Pill,
  Receipt,
  Shirt,
  Smartphone,
  Store,
} from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: Receipt,
    title: "GST-Compliant Invoicing",
    body: "CGST, SGST, and IGST calculated automatically from customer state.",
  },
  {
    icon: Package,
    title: "Live Inventory Tracking",
    body: "Stock in/out with movements log and low-stock alerts.",
  },
  {
    icon: AlertTriangle,
    title: "Expiry Alerts",
    body: "Spot products nearing expiry before they leave your shelf.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Invoice Sharing",
    body: "Send a bill to your customer in one tap.",
  },
  {
    icon: HandCoins,
    title: "Udhaar / Credit Tracking",
    body: "Running customer balances and a simple khata-style ledger.",
  },
  {
    icon: FileSpreadsheet,
    title: "GSTR-1 / 3B Ready Reports",
    body: "Export Excel sheets your CA can use for filing.",
  },
];

const TYPE_ICONS: Record<string, typeof Store> = {
  grocery: Store,
  mobile_shop: Smartphone,
  pharmacy: Pill,
  cloth_shop: Shirt,
  service_freelancer: Briefcase,
  jewellery: CircleDot,
  hotel: BedDouble,
  general: CircleDot,
};

const FAQ_ITEMS = [
  {
    q: "Is my data safe?",
    a: "Yes. Each business's data is fully isolated from other tenants, and the app is hosted on a secure cloud stack. You only see your own organization.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from Settings → Billing whenever you like. No long lock-in. See our Refund & Cancellation Policy for how refunds work on annual plans.",
  },
  {
    q: "Do you file my GST returns for me?",
    a: "No. AasanBill generates GSTR-ready export files (GSTR-1 / GSTR-3B style). You or your CA still file them on the GST portal.",
  },
  {
    q: "What if I run a different kind of business?",
    a: "Today we support Grocery/Kirana, Mobile/Electronics, Pharmacy, Clothing, Freelancer/Services, Jewellery, Hotel/Guest House, and Other/General, with small field tweaks per type. More verticals are being added carefully, without bloating the core billing engine.",
  },
  {
    q: "What's included in the free trial?",
    a: "New accounts get a 14-day free trial with the Starter limits. No card required up front. Subscribe when you're ready to continue.",
  },
];

export default function MarketingHomePage() {
  return (
    <MarketingShell>
      <HeroSection />
      <WhoSection />
      <FeaturesSection />
      <PricingSection />
      <FaqSection />
      <MarketingFinalCta />
    </MarketingShell>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 15% -10%, rgba(29,78,216,0.14), transparent), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(16,185,129,0.10), transparent)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
        <div className="animate-marketing-fade">
          <p className="font-display text-sm font-semibold tracking-tight text-primary">
            {APP_NAME}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl sm:leading-[1.08]">
            GST Billing, Made Aasan
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate sm:text-lg">
            GST invoicing, inventory, and expiry tracking for Indian small businesses.{" "}
            {APP_TAGLINE}.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-white shadow-card transition-transform duration-200 hover:opacity-95 hover:scale-[1.02] active:scale-[0.99]"
            >
              Start Free - 14 Day Trial
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex h-12 items-center rounded-[10px] border border-border bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-hover"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-dim">
            No card required to start. Cancel anytime from Settings.
          </p>
        </div>
        <ProductMockup />
      </div>
    </section>
  );
}

function WhoSection() {
  const types = BUSINESS_TYPE_OPTIONS.filter((o) => o.value !== "general");
  return (
    <section className="border-y border-border/70 bg-surface py-12 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Who it&apos;s for
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Built for the shops we support today
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate">
          Same billing engine, with small field tweaks per business type. More verticals later;
          we won&apos;t pretend we cover every trade yet.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
          {types.map((t) => {
            const Icon = TYPE_ICONS[t.value] ?? CircleDot;
            return (
              <div
                key={t.value}
                className="flex min-w-[140px] flex-col items-center gap-2 px-4 py-4 text-center"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="max-w-[9rem] font-display text-xs font-semibold leading-snug text-ink">
                  {t.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Features</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          What you actually get in the app
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate">Live today. No vapourware.</p>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3 font-display text-sm font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 border-y border-border/70 bg-cloud/60 py-14 sm:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PricingPlans variant="marketing" />
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 py-14 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">FAQ</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Straight answers
        </h2>
        <div className="mt-8">
          <FaqList items={FAQ_ITEMS} />
        </div>
      </div>
    </section>
  );
}
