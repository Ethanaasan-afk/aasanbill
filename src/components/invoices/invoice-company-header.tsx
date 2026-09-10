"use client";

import {
  formatCompanyAddress,
  formatCompanyContact,
  presentText,
} from "@/lib/invoice-letterhead";
import type { CompanySettings } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Shared company letterhead for the on-screen invoice view.
 * Omits empty optional fields and their separator punctuation.
 */
export function InvoiceCompanyHeader({
  company,
  className,
}: {
  company: Pick<
    CompanySettings,
    | "brand_name"
    | "company_name"
    | "address"
    | "city"
    | "state"
    | "pincode"
    | "gstin"
    | "phone"
    | "email"
  >;
  className?: string;
}) {
  const title = presentText(company.brand_name) || presentText(company.company_name) || "Company";
  const legalName = presentText(company.company_name);
  const showLegal =
    Boolean(legalName) && legalName !== presentText(company.brand_name);
  const addressLine = formatCompanyAddress(company);
  const contactLine = formatCompanyContact(company);

  return (
    <div className={cn("min-w-0", className)}>
      <p className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
        {title}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate">
        Tax Invoice
      </p>
      {showLegal ? <p className="mt-1 text-sm text-ink">{legalName}</p> : null}
      {addressLine ? <p className="mt-1 text-xs text-slate">{addressLine}</p> : null}
      {contactLine ? <p className="mt-0.5 text-xs text-slate">{contactLine}</p> : null}
    </div>
  );
}
