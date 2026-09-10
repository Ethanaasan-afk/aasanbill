import type { CompanySettings, Organization } from "@/lib/types";
import { normalizeBusinessType } from "@/lib/business-types";

/** Map Organization → CompanySettings so PDF / Settings keep working unchanged. */
export function organizationToCompanySettings(org: Organization): CompanySettings {
  return {
    id: org.id,
    organization_id: org.id,
    company_name: org.name,
    brand_name: org.brand_name || org.name,
    gstin: org.gstin ?? "",
    address: org.address ?? "",
    city: org.city ?? "",
    state: org.state,
    pincode: org.pincode ?? "",
    phone: org.phone ?? "",
    email: org.email || "admin@example.com",
    bank_name: org.bank_name ?? "",
    bank_account: org.bank_account ?? "",
    bank_ifsc: org.bank_ifsc ?? "",
    bank_branch: org.bank_branch ?? "",
    invoice_prefix: org.invoice_prefix || "AB",
    upi_id: org.upi_id ?? "",
    signature_url: org.signature_url ?? null,
    updated_at: org.updated_at || org.created_at,
    slug: org.slug,
    plan: org.plan,
    subscription_status: org.subscription_status,
    trial_ends_at: org.trial_ends_at,
    business_type: normalizeBusinessType(org.business_type),
  };
}

/** Map CompanySettings form values → Organization update payload. */
export function companySettingsToOrganizationPatch(
  values: Partial<CompanySettings>
): Partial<Organization> {
  const patch: Partial<Organization> = {};
  if (values.company_name !== undefined) patch.name = values.company_name;
  if (values.brand_name !== undefined) patch.brand_name = values.brand_name;
  if (values.gstin !== undefined) patch.gstin = values.gstin || null;
  if (values.address !== undefined) patch.address = values.address || null;
  if (values.city !== undefined) patch.city = values.city;
  if (values.state !== undefined) patch.state = values.state;
  if (values.pincode !== undefined) patch.pincode = values.pincode;
  if (values.phone !== undefined) patch.phone = values.phone;
  if (values.email !== undefined) patch.email = values.email;
  if (values.bank_name !== undefined) patch.bank_name = values.bank_name;
  if (values.bank_account !== undefined) patch.bank_account = values.bank_account;
  if (values.bank_ifsc !== undefined) patch.bank_ifsc = values.bank_ifsc;
  if (values.bank_branch !== undefined) patch.bank_branch = values.bank_branch;
  if (values.invoice_prefix !== undefined) patch.invoice_prefix = values.invoice_prefix;
  if (values.upi_id !== undefined) patch.upi_id = values.upi_id ?? "";
  if (values.signature_url !== undefined) {
    patch.signature_url = values.signature_url || null;
  }
  if (values.business_type !== undefined) {
    patch.business_type = normalizeBusinessType(values.business_type);
  }

  // Keep bank_details summary in sync for SaaS schema field
  if (
    values.bank_name !== undefined ||
    values.bank_account !== undefined ||
    values.bank_ifsc !== undefined ||
    values.bank_branch !== undefined
  ) {
    const parts = [
      values.bank_name,
      values.bank_account ? `A/c ${values.bank_account}` : "",
      values.bank_ifsc ? `IFSC ${values.bank_ifsc}` : "",
      values.bank_branch,
    ].filter(Boolean);
    patch.bank_details = parts.length ? parts.join(" · ") : null;
  }

  return patch;
}

export function slugifyBusinessName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "business";
}
