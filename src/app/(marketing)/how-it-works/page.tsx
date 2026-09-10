import { HowToUseBrochure } from "@/components/marketing/how-to-use-brochure";
import { MarketingFinalCta } from "@/components/marketing/marketing-final-cta";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { APP_NAME } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to use",
  description: `Full brochure-style guide to using ${APP_NAME}: signup, catalog, GST invoices, inventory, udhaar, reports, jewellery, and hotel.`,
};

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <HowToUseBrochure />
      <MarketingFinalCta
        title="Ready to try it in your shop?"
        body={`Open ${APP_NAME}, follow the brochure, and send one GST invoice this week.`}
      />
    </MarketingShell>
  );
}
