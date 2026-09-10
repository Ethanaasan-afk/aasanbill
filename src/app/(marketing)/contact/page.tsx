"use client";

import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  APP_NAME,
  LEGAL_ENTITY_ADDRESS,
  LEGAL_ENTITY_NAME,
  LEGAL_SUPPORT_EMAIL,
} from "@/lib/brand";
import { Mail, MapPin } from "lucide-react";
import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sentHint, setSentHint] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`${APP_NAME} enquiry from ${name || "website"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    window.location.href = `mailto:${LEGAL_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSentHint("Your email app should open. If it does not, write to us at the address below.");
  };

  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-border/70">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(29,78,216,0.12), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <p className="font-display text-sm font-semibold tracking-tight text-primary">
            {APP_NAME}
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Contact
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate">
            Sales, support, or partnership questions. We are based in Ahmedabad and reply by email.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="space-y-8">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <Mail className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold text-ink">Email</h2>
              <a
                href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
                className="mt-1 block text-sm font-medium text-primary hover:underline"
              >
                {LEGAL_SUPPORT_EMAIL}
              </a>
            </div>
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold text-ink">Office</h2>
              <p className="mt-1 text-sm text-slate">{LEGAL_ENTITY_NAME}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate">{LEGAL_ENTITY_ADDRESS}</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-ink">Send a message</h2>
            <Input
              id="contact_name"
              label="Your name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              id="contact_email"
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="w-full space-y-1.5">
              <label htmlFor="contact_message" className="field-label">
                Message<span className="ml-0.5 text-primary">*</span>
              </label>
              <textarea
                id="contact_message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-ink transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </div>
            {sentHint && <p className="text-xs text-slate">{sentHint}</p>}
            <Button type="submit" className="w-full sm:w-auto">
              Open email to send
            </Button>
          </form>
        </div>
      </section>
    </MarketingShell>
  );
}
