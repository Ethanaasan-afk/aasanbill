import { APP_NAME } from "@/lib/brand";
import Link from "next/link";

type MarketingFinalCtaProps = {
  title?: string;
  body?: string;
};

export function MarketingFinalCta({
  title = "Ready to bill the aasan way?",
  body = `Start your 14-day free trial on ${APP_NAME}. No card required — add products and send your first GST invoice this week.`,
}: MarketingFinalCtaProps) {
  return (
    <section className="border-t border-border/70 bg-primary py-14 text-white sm:py-16">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
          {body}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center rounded-[10px] bg-white px-6 text-sm font-semibold text-primary shadow-card transition-transform duration-200 hover:scale-[1.02] hover:opacity-95 active:scale-[0.99]"
          >
            Start free trial
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center rounded-[10px] border border-white/30 px-6 text-sm font-semibold text-white hover:bg-white/10"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}
