/** UPI payment deep-link + QR image URL */

export function buildUpiPayUrl(input: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}): string {
  const params = new URLSearchParams({
    pa: input.upiId.trim(),
    pn: input.payeeName.trim() || "Merchant",
    am: input.amount.toFixed(2),
    cu: "INR",
  });
  if (input.note) params.set("tn", input.note.slice(0, 80));
  return `upi://pay?${params.toString()}`;
}

/** Public QR image for the UPI URI (works in browser without extra npm deps). */
export function upiQrImageUrl(upiUri: string, size = 180): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUri)}`;
}
