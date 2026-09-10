"use client";

import { AuthLegalFooter } from "@/components/auth/auth-legal-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isDemoMode } from "@/lib/demo/mode";
import { APP_NAME, APP_TAGLINE, BRAND_LOGO_FULL } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Method = "password" | "otp";

function friendlyAuthError(message: string) {
  if (/invalid login credentials|invalid.*email or password/i.test(message)) {
    return "Wrong email or password. If you just signed up, use the same password, or start a free trial.";
  }
  if (/email not confirmed/i.test(message)) {
    return "This email is not confirmed yet. Use Email OTP, or try again in a minute.";
  }
  if (/signups not allowed|user not found|unable to validate email/i.test(message)) {
    return "No account for this email. Start a free trial first.";
  }
  if (/expired|invalid.*(otp|token|code)|token has expired/i.test(message)) {
    return "That code is invalid or expired. Request a new one.";
  }
  if (/rate limit|too many/i.test(message)) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const demo = isDemoMode();

  useEffect(() => {
    if (demo) router.replace("/dashboard");
  }, [demo, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("error") === "otp") {
      setError("Email sign-in link failed. Request a new OTP and try again.");
    }
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const sendOtp = async () => {
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const cleanEmail = email.trim().toLowerCase();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    setOtpSent(true);
    setResendIn(60);
    setInfo("We sent a 6-digit code to your email. It expires in a few minutes.");
  };

  const verifyOtp = async () => {
    setError("");
    const code = otp.replace(/\s/g, "");
    if (code.length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "email",
    });
    setLoading(false);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    window.location.assign("/dashboard");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (demo) {
      router.push("/dashboard");
      return;
    }
    if (method === "otp") {
      if (otpSent) await verifyOtp();
      else await sendOtp();
      return;
    }
    setError("");
    setInfo("");
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    window.location.assign("/dashboard");
  };

  if (demo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cloud text-sm text-slate">
        Entering demo mode…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-cloud px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(79,70,229,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(16,185,129,0.12), transparent)",
        }}
      />
      <div className="panel relative w-full max-w-sm p-5 sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4 h-14 w-[220px]">
            <Image
              src={BRAND_LOGO_FULL}
              alt={APP_NAME}
              fill
              priority
              className="object-contain object-center"
              sizes="220px"
            />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{APP_NAME}</h1>
          <p className="mt-1 text-xs text-slate">{APP_TAGLINE}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-[10px] border border-border bg-cloud p-1">
          <button
            type="button"
            className={`h-9 rounded-[8px] text-xs font-semibold transition-colors ${
              method === "password" ? "bg-surface text-ink shadow-sm" : "text-slate hover:text-ink"
            }`}
            onClick={() => {
              setMethod("password");
              setError("");
              setInfo("");
            }}
          >
            Password
          </button>
          <button
            type="button"
            className={`h-9 rounded-[8px] text-xs font-semibold transition-colors ${
              method === "otp" ? "bg-surface text-ink shadow-sm" : "text-slate hover:text-ink"
            }`}
            onClick={() => {
              setMethod("otp");
              setError("");
            }}
          >
            Email OTP
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setOtpSent(false);
              setOtp("");
            }}
          />
          {method === "password" ? (
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          ) : (
            otpSent && (
              <Input
                id="otp"
                label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            )
          )}
          {info && <p className="text-xs text-emerald">{info}</p>}
          {error && <p className="text-xs text-rose">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            {method === "password"
              ? "Sign in"
              : otpSent
                ? "Verify code"
                : "Send OTP"}
          </Button>
        </form>

        {method === "otp" && otpSent && (
          <p className="mt-3 text-center text-xs text-slate">
            {resendIn > 0 ? (
              <>Resend code in {resendIn}s</>
            ) : (
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => void sendOtp()}
              >
                Resend code
              </button>
            )}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate">
          New business?{" "}
          <a href="/signup" className="font-medium text-primary hover:underline">
            Start a free trial
          </a>
        </p>
        <AuthLegalFooter />
      </div>
    </div>
  );
}
