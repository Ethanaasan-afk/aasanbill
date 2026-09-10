import type { Metadata } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_TITLE } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: APP_TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    type: "website",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-cloud text-ink">{children}</div>;
}
