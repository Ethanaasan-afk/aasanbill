/** Org authorized-signature uploads (invoice letterhead). */
export const SIGNATURE_BUCKET = "signatures";
export const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024; // 2MB
export const SIGNATURE_ACCEPT = "image/png,image/jpeg,image/jpg";

export function signatureObjectPath(organizationId: string, mimeOrExt: string): string {
  const lower = mimeOrExt.toLowerCase();
  const ext =
    lower.includes("jpeg") || lower.includes("jpg") || lower === "jpg" || lower === "jpeg"
      ? "jpg"
      : "png";
  return `${organizationId}/signature.${ext}`;
}

export function isAllowedSignatureFile(file: File): string | null {
  const okType =
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/jpg" ||
    /\.(png|jpe?g)$/i.test(file.name);
  if (!okType) return "Please upload a PNG or JPEG image.";
  if (file.size > SIGNATURE_MAX_BYTES) {
    return "Signature file must be 2MB or smaller.";
  }
  return null;
}
