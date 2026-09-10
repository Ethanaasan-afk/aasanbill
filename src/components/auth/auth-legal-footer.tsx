import Link from "next/link";

export function AuthLegalFooter() {
  return (
    <p className="mt-3 text-center text-[11px] text-slate-dim">
      <Link href="/privacy-policy" className="hover:text-primary hover:underline">
        Privacy Policy
      </Link>
      <span className="mx-1.5 text-border">·</span>
      <Link href="/terms" className="hover:text-primary hover:underline">
        Terms of Service
      </Link>
      <span className="mx-1.5 text-border">·</span>
      <Link href="/refund-policy" className="hover:text-primary hover:underline">
        Refund Policy
      </Link>
    </p>
  );
}
