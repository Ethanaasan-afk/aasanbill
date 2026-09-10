"use client";

import { AuthLegalFooter } from "@/components/auth/auth-legal-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { isDemoMode } from "@/lib/demo/mode";
import { APP_NAME, BRAND_LOGO_FULL } from "@/lib/brand";
import {
  BUSINESS_TYPE_OPTIONS,
  DEFAULT_BUSINESS_TYPE,
  type BusinessType,
} from "@/lib/business-types";
import { createClient } from "@/lib/supabase/client";
import {
  passwordStrengthChecks,
  signupSchema,
  STRONG_PASSWORD_HINT,
} from "@/lib/validations";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>(DEFAULT_BUSINESS_TYPE);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const demo = isDemoMode();

  useEffect(() => {
    if (demo) router.replace("/dashboard");
  }, [demo, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (demo) {
      router.push("/dashboard");
      return;
    }
    setError("");
    const parsed = signupSchema.safeParse({
      business_name: businessName,
      owner_name: ownerName,
      email,
      password,
      business_type: businessType,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          owner_name: ownerName,
          email: email.trim().toLowerCase(),
          password,
          business_type: businessType,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        organization_id?: string;
        business_type?: string;
        business_type_persisted?: boolean;
      };
      if (!res.ok) {
        setError(json.error ?? "Signup failed");
        return;
      }

      // Always mirror chosen type locally so UI labels work immediately
      if (json.organization_id) {
        const { writeLocalBusinessType } = await import("@/lib/business-type-storage");
        const { normalizeBusinessType } = await import("@/lib/business-types");
        writeLocalBusinessType(
          json.organization_id,
          normalizeBusinessType(json.business_type ?? businessType)
        );
      }

      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signErr) {
        setError(
          /invalid|credentials/i.test(signErr.message)
            ? "Account was created. Go to Sign in and log in with the same email and password."
            : signErr.message
        );
        return;
      }
      window.location.assign("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // FIX: Moved useMemo hook ABOVE the early return so it always runs
  const strength = useMemo(() => passwordStrengthChecks(password), [password]);
  const strengthItems = [
    { ok: strength.minLength, label: "8+ characters" },
    { ok: strength.upper, label: "Uppercase letter" },
    { ok: strength.lower, label: "Lowercase letter" },
    { ok: strength.number, label: "Number" },
    { ok: strength.symbol, label: "Symbol (! @ # $)" },
  ];

  if (demo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cloud text-sm text-slate">
        Entering demo mode…
      </div>
    );
  }

  const selectedDesc =
    BUSINESS_TYPE_OPTIONS.find((o) => o.value === businessType)?.description ?? "";

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-cloud px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(29,78,216,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(56,189,248,0.12), transparent)",
        }}
      />
      <div className="panel relative w-full max-w-md p-5 sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-3 h-12 w-[200px]">
            <Image
              src={BRAND_LOGO_FULL}
              alt={APP_NAME}
              fill
              priority
              className="object-contain object-center"
              sizes="200px"
            />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Start free trial</h1>
          <p className="mt-1 text-xs text-slate">14 days · your own isolated workspace on {APP_NAME}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            id="business_name"
            label="Business name"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
          <div>
            <Select
              id="business_type"
              label="What kind of business is this?"
              required
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              options={BUSINESS_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
            <p className="mt-1.5 text-[11px] text-slate">{selectedDesc}</p>
          </div>
          <Input
            id="owner_name"
            label="Your name"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] text-slate">{STRONG_PASSWORD_HINT}</p>
            {password.length > 0 && (
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                {strengthItems.map((item) => (
                  <li
                    key={item.label}
                    className={item.ok ? "text-emerald" : "text-slate-dim"}
                  >
                    {item.ok ? "✓" : "○"} {item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="text-xs text-rose">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Create account
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-slate-dim">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy-policy"
              className="font-medium text-primary hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <AuthLegalFooter />
      </div>
    </div>
  );
}
