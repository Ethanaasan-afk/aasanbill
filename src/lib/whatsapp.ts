/** WhatsApp deep-link helpers for bill share & payment reminders */

export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

/** Opens chat with a specific number. Returns null if phone is missing. */
export function whatsappUrl(phone: string | null | undefined, text: string): string | null {
  const n = normalizeWhatsAppPhone(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/**
 * Prefer customer phone when present; otherwise general share chooser
 * (`https://wa.me/?text=...`).
 */
export function whatsappShareUrl(phone: string | null | undefined, text: string): string {
  const n = normalizeWhatsAppPhone(phone);
  if (n) return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function formatWhatsAppAmount(amount: number): string {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function invoiceShareMessage(input: {
  companyName: string;
  invoiceNumber: string;
  amount: number;
  customerName: string;
  upiId?: string | null;
  pdfUrl?: string | null;
}): string {
  const amount = formatWhatsAppAmount(input.amount);
  const lines = [
    `Hi ${input.customerName} 👋`,
    ``,
    `Your invoice from *${input.companyName}* is ready.`,
    ``,
    `🧾 Invoice No: *${input.invoiceNumber}*`,
    `💰 Amount Due: *₹${amount}*`,
  ];
  if (input.pdfUrl) {
    lines.push(``, `📄 Download: ${input.pdfUrl}`);
  }
  lines.push(``, `Thank you for your business! 🙏`);
  return lines.join("\n");
}

export function paymentReminderMessage(input: {
  companyName: string;
  invoiceNumber: string;
  amount: number;
  customerName: string;
  invoiceDate: string;
  upiId?: string | null;
}): string {
  const lines = [
    `Hello ${input.customerName},`,
    ``,
    `Friendly reminder from *${input.companyName}*:`,
    `Invoice *${input.invoiceNumber}* dated ${input.invoiceDate} for ₹${input.amount.toFixed(2)} is still unpaid.`,
  ];
  if (input.upiId) {
    lines.push(``, `You can pay via UPI: ${input.upiId}`);
  }
  lines.push(``, `Please ignore if already paid. Thank you.`);
  return lines.join("\n");
}

export function outstandingReminderMessage(input: {
  companyName: string;
  customerName: string;
  amount: number;
}): string {
  const amount = formatWhatsAppAmount(input.amount);
  return [
    `Hi ${input.customerName},`,
    ``,
    `Your outstanding balance with *${input.companyName}* is ₹${amount}.`,
    `Please clear it at your convenience.`,
    ``,
    `Thank you!`,
  ].join("\n");
}
