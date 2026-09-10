import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import {
  APP_NAME,
  APP_TITLE,
  LEGAL_ENTITY_ADDRESS,
  LEGAL_ENTITY_NAME,
  LEGAL_PRIVACY_UPDATED,
  LEGAL_SUPPORT_EMAIL,
} from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Privacy Policy - ${APP_NAME}`,
  description: `How ${APP_NAME} collects, uses, and protects personal data under India's DPDP Act.`,
  openGraph: {
    title: `Privacy Policy - ${APP_TITLE}`,
    description: `Privacy Policy for ${APP_NAME}, operated by ${LEGAL_ENTITY_NAME}.`,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated={LEGAL_PRIVACY_UPDATED}>
      <p>
        {APP_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a billing,
        invoicing, and inventory management platform operated by{" "}
        <strong>{LEGAL_ENTITY_NAME}</strong>, registered at{" "}
        <strong>{LEGAL_ENTITY_ADDRESS}</strong>. This Privacy Policy explains how
        we collect, use, store, and protect information when you use {APP_NAME}{" "}
        (the &quot;Service&quot;).
      </p>
      <p>
        This policy is drafted with reference to India&apos;s{" "}
        <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>{" "}
        and its associated Rules.
      </p>

      <LegalSection id="who" title="1. Who This Policy Applies To">
        <ul>
          <li>
            <strong>Account Holders / Business Owners (&quot;you&quot;, &quot;Data
            Principal&quot;)</strong>{" "}
            - the person or business that signs up for {APP_NAME}.
          </li>
          <li>
            <strong>End Customers of Account Holders</strong> - when you use{" "}
            {APP_NAME} to create invoices, you may enter your own customers&apos;
            names, phone numbers, addresses, and GSTINs into the platform. You
            (the Account Holder) are responsible for that data as the{" "}
            <strong>Data Fiduciary</strong> for your own customers; {APP_NAME}{" "}
            acts as the technology platform (a &quot;Data Processor&quot; in
            relation to that data) storing it on your behalf.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="collect" title="2. Information We Collect">
        <p>
          <strong>From you directly (Account Holders):</strong>
        </p>
        <ul>
          <li>Name, email address, phone number</li>
          <li>Business name, business address, GSTIN</li>
          <li>
            Password (stored in encrypted/hashed form, never in plain text)
          </li>
          <li>
            Payment and billing information (processed by our payment partner,
            Razorpay - we do not store your card/UPI details ourselves)
          </li>
        </ul>
        <p>
          <strong>Entered by you into the platform (about your own customers):</strong>
        </p>
        <ul>
          <li>
            Customer names, phone numbers, addresses, GSTIN (where applicable)
          </li>
          <li>Product, pricing, and invoice data you create</li>
        </ul>
        <p>
          <strong>Collected automatically:</strong>
        </p>
        <ul>
          <li>
            Basic usage data (login timestamps, pages visited, device/browser
            type) for security and service improvement
          </li>
          <li>IP address, for fraud prevention and security logging</li>
        </ul>
      </LegalSection>

      <LegalSection id="use" title="3. How We Use Your Information">
        <p>We use collected information to:</p>
        <ul>
          <li>
            Provide and operate the Service (generate invoices, calculate GST,
            track inventory)
          </li>
          <li>Authenticate your account and maintain security</li>
          <li>Process subscription payments</li>
          <li>
            Communicate with you about your account, invoices, or service updates
          </li>
          <li>
            Comply with legal obligations under Indian law (including tax and
            consumer protection law)
          </li>
          <li>Improve and troubleshoot the Service</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your data or your customers&apos; data
          to third parties, and we do not use your business data to train any
          external AI/ML models.
        </p>
      </LegalSection>

      <LegalSection id="share" title="4. How We Share Information">
        <p>We share information only with:</p>
        <ul>
          <li>
            <strong>Payment processors</strong> (Razorpay) - to process your
            subscription payments
          </li>
          <li>
            <strong>Cloud infrastructure providers</strong> (Supabase, Vercel, or
            successor providers) - to host and store your data securely
          </li>
          <li>
            <strong>Communication services</strong> (e.g. WhatsApp, when you
            choose to share an invoice via WhatsApp) - only the specific invoice
            link you choose to share, sent at your instruction
          </li>
          <li>
            <strong>Law enforcement or regulators</strong>, only when legally
            required (e.g. a valid court order or statutory request)
          </li>
        </ul>
        <p>We do not share your data with advertisers or data brokers.</p>
      </LegalSection>

      <LegalSection id="security" title="5. Data Storage and Security">
        <ul>
          <li>
            Your data is stored on cloud infrastructure with encryption in
            transit (HTTPS/TLS) and at rest.
          </li>
          <li>
            Access to your organization&apos;s data is restricted using
            database-level Row-Level Security, meaning other {APP_NAME} customers
            cannot access your business data, and vice versa.
          </li>
          <li>
            We limit internal access to your data to what is necessary for
            providing support or maintaining the Service.
          </li>
          <li>
            No system is 100% secure; we take reasonable technical and
            organizational measures to protect your data but cannot guarantee
            absolute security.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="rights" title="6. Your Rights (Data Principal Rights under the DPDP Act)">
        <p>As a Data Principal, you have the right to:</p>
        <ul>
          <li>
            <strong>Access</strong> - request a copy of the personal data we hold
            about you
          </li>
          <li>
            <strong>Correction</strong> - request correction of inaccurate or
            incomplete data
          </li>
          <li>
            <strong>Erasure</strong> - request deletion of your personal data,
            subject to legal retention requirements (e.g. tax record-keeping
            obligations)
          </li>
          <li>
            <strong>Withdraw consent</strong> - withdraw consent for optional
            processing at any time (this may limit your ability to use parts of
            the Service)
          </li>
          <li>
            <strong>Grievance redressal</strong> - raise a complaint with our
            Grievance Officer (see Section 10) and, if unresolved, escalate to
            the Data Protection Board of India
          </li>
        </ul>
        <p>
          To exercise these rights, contact us at{" "}
          <a
            href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {LEGAL_SUPPORT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="retention" title="7. Data Retention">
        <p>
          We retain your account data for as long as your account is active.
          After account closure, we may retain invoice and transaction records
          for the period required under Indian tax and accounting law (typically
          several years), after which data is deleted or anonymized, except where
          longer retention is required by law.
        </p>
      </LegalSection>

      <LegalSection id="children" title="8. Children's Privacy">
        <p>
          {APP_NAME} is intended for business use by individuals who are at least
          18 years old. We do not knowingly collect data from children, and the
          Service is not directed at children.
        </p>
      </LegalSection>

      <LegalSection id="consent-manager" title="9. Consent Manager">
        <p>
          In line with DPDP Rules, we will integrate with a registered Consent
          Manager to allow you to manage, review, and withdraw consents given for
          data processing, once this becomes applicable to our scale of
          operations and by the regulatory deadline.
        </p>
      </LegalSection>

      <LegalSection id="grievance" title="10. Grievance Officer">
        <p>
          For any privacy-related questions, complaints, or requests, contact our
          Grievance Officer:
        </p>
        <ul>
          <li>
            <strong>Name:</strong> {LEGAL_ENTITY_NAME}
          </li>
          <li>
            <strong>Email:</strong>{" "}
            <a
              href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
              className="font-medium text-primary hover:underline"
            >
              {LEGAL_SUPPORT_EMAIL}
            </a>
          </li>
          <li>
            <strong>Address:</strong> {LEGAL_ENTITY_ADDRESS}
          </li>
          <li>
            <strong>Response time:</strong> We aim to acknowledge grievances
            within 7 days and resolve them within 30 days.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you
          of material changes via email or an in-app notice. Continued use of the
          Service after changes take effect constitutes acceptance of the updated
          policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact Us">
        <p>
          <strong>{LEGAL_ENTITY_NAME}</strong>
        </p>
        <ul>
          <li>
            Email:{" "}
            <a
              href={`mailto:${LEGAL_SUPPORT_EMAIL}`}
              className="font-medium text-primary hover:underline"
            >
              {LEGAL_SUPPORT_EMAIL}
            </a>
          </li>
          <li>Address: {LEGAL_ENTITY_ADDRESS}</li>
        </ul>
      </LegalSection>
    </LegalPageShell>
  );
}
