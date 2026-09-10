import Razorpay from "razorpay";

export function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error(
      "Missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET. Add Razorpay Test Mode keys to .env.local."
    );
  }
  return new Razorpay({ key_id, key_secret });
}
