/**
 * Join optional letterhead fields without dangling commas / dashes / labels.
 */

export function presentText(value: unknown): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t ? t : null;
}

/** Skip empty strings and known placeholder defaults. */
export function presentEmail(value: unknown): string | null {
  const t = presentText(value);
  if (!t) return null;
  if (t.toLowerCase() === "admin@example.com") return null;
  return t;
}

/**
 * Address block: join non-empty address / city / state with ", ",
 * then append " - {pincode}" only when a pincode exists.
 */
export function formatCompanyAddress(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}): string {
  const locality = [presentText(parts.address), presentText(parts.city), presentText(parts.state)]
    .filter((p): p is string => Boolean(p))
    .join(", ");
  const pin = presentText(parts.pincode);
  if (locality && pin) return `${locality} - ${pin}`;
  return locality || pin || "";
}

/**
 * Contact line: only include GSTIN / Ph / email when values exist.
 * Returns "" when nothing to show (caller should omit the row).
 */
export function formatCompanyContact(parts: {
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
}): string {
  const chunks: string[] = [];
  const gstin = presentText(parts.gstin);
  if (gstin) chunks.push(`GSTIN: ${gstin}`);
  const phone = presentText(parts.phone);
  if (phone) chunks.push(`Ph: ${phone}`);
  const email = presentEmail(parts.email);
  if (email) chunks.push(email);
  return chunks.join(" · ");
}

/** Bank footer line - omit empty segments. */
export function formatCompanyBankLine(parts: {
  bank_name?: string | null;
  bank_account?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
}): string {
  const chunks: string[] = [];
  const name = presentText(parts.bank_name);
  if (name) chunks.push(name);
  const account = presentText(parts.bank_account);
  if (account) chunks.push(`A/c ${account}`);
  const ifsc = presentText(parts.bank_ifsc);
  if (ifsc) chunks.push(`IFSC ${ifsc}`);
  const branch = presentText(parts.bank_branch);
  if (branch) chunks.push(branch);
  return chunks.length ? `Bank: ${chunks.join(" · ")}` : "";
}
