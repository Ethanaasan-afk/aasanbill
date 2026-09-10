import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Focused Folks Solutions LLP about AasanBill sales and support. Based in Ahmedabad, Gujarat.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
