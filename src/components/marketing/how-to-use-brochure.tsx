import { APP_NAME } from "@/lib/brand";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/business-types";
import {
  BedDouble,
  BookOpen,
  Building2,
  CircleDot,
  FileSpreadsheet,
  Gem,
  HandCoins,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  Users,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

const TOC = [
  { href: "#start", label: "1. Get started" },
  { href: "#shop", label: "2. Set up your shop" },
  { href: "#catalog", label: "3. Catalog & stock" },
  { href: "#customers", label: "4. Customers" },
  { href: "#invoice", label: "5. Create an invoice" },
  { href: "#udhaar", label: "6. Udhaar & payments" },
  { href: "#reports", label: "7. Reports for your CA" },
  { href: "#verticals", label: "8. Shop-specific tools" },
  { href: "#team", label: "9. Team & settings" },
] as const;

function Chapter({
  id,
  number,
  title,
  kicker,
  children,
}: {
  id: string;
  number: string;
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-b border-border/70 py-12 last:border-b-0 sm:py-16"
    >
      <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        Chapter {number}
        {kicker ? ` · ${kicker}` : ""}
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function StepCard({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 sm:p-5">
      <p className="font-display text-lg font-bold text-primary/40">{n}</p>
      <h3 className="mt-1 font-display text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate">{body}</p>
    </div>
  );
}

function GuideFigure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-card">
      <div className="relative aspect-[16/9] w-full bg-cloud">
        {/* Static files — next/image 404s as a blank Next 404 page when PNGs are missing */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </div>
      <figcaption className="border-t border-border px-4 py-2.5 text-[12px] leading-relaxed text-slate">
        {caption}
      </figcaption>
    </figure>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate">{body}</p>
      </div>
    </div>
  );
}

export function HowToUseBrochure() {
  const types = BUSINESS_TYPE_OPTIONS.filter((o) => o.value !== "general");

  return (
    <article className="brochure">
      <header className="relative overflow-hidden border-b border-border/70">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 80% 0%, rgba(29,78,216,0.12), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="font-display text-sm font-semibold tracking-tight text-primary">
            {APP_NAME} · User brochure
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl sm:leading-[1.08]">
            How to use this application
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate sm:text-lg">
            A full walkthrough of GST billing, inventory, customers, udhaar, and shop-specific
            tools — from signup to your first invoice and GSTR-ready export.
          </p>
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.12em] text-slate-dim">
            No card required · 14-day trial · Made for Indian shops
          </p>
          <figure className="relative mt-10 overflow-hidden rounded-[16px] border border-border bg-surface shadow-lift">
            <div className="relative aspect-[16/9] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/howto/invoice.png"
                alt="Live AasanBill New Invoice screen: choose customer, then add items"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
            <figcaption className="border-t border-border px-4 py-3 text-sm text-slate">
              The live New Invoice screen — four steps from customer to GST bill.
            </figcaption>
          </figure>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-[200px_1fr] lg:gap-14">
        <nav
          className="hidden lg:block lg:sticky lg:top-24 lg:self-start lg:py-14"
          aria-label="Brochure contents"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-dim">
            Contents
          </p>
          <ul className="mt-3 space-y-1.5">
            {TOC.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate hover:bg-surface hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 pb-8">
          <nav
            className="border-b border-border/70 py-6 lg:hidden"
            aria-label="Brochure contents"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-dim">
              Contents
            </p>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {TOC.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="block rounded-lg px-2 py-2 text-[13px] font-medium text-slate hover:bg-surface hover:text-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <Chapter id="start" number="01" title="Get started" kicker="Signup">
            <p>
              Open {APP_NAME} in a browser. You do not install software. Create one account per
              business (your organization). Every shop’s data stays isolated — you only see your
              own invoices, stock, and customers.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StepCard
                n="01"
                title="Sign up"
                body="Go to Sign up, enter your name, email, and a password. No payment card is asked up front."
              />
              <StepCard
                n="02"
                title="Create the shop"
                body="Give the organization a name, GSTIN if you have one, invoice prefix (e.g. AB), and your business type."
              />
              <StepCard
                n="03"
                title="Land on Dashboard"
                body="You get a 14-day Starter trial. Use Dashboard for today’s sales snapshot, then open the sidebar to work."
              />
            </div>
            <p>
              Already have an invite? Use the link in the email, set your password on Complete
              setup, then log in. Existing users go to Log in.
            </p>
            <GuideFigure
              src="/marketing/howto/signup.png"
              alt="Live AasanBill sign-up form"
              caption="Figure 1 — Sign up (live app): business name, type, your name, email, password. No card required."
            />
            <GuideFigure
              src="/marketing/howto/dashboard.png"
              alt="Live AasanBill dashboard"
              caption="Figure 2 — Dashboard after login: sales, stock, customers, and a New invoice button."
            />
          </Chapter>

          <Chapter id="shop" number="02" title="Set up your shop" kicker="Settings">
            <p>
              Before the first bill, fill Settings so invoices print correctly: legal name, address,
              GSTIN, state, bank details (optional), and invoice prefix. State is important — it
              decides CGST+SGST (same state) vs IGST (other state) on every invoice.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-ink">Business type</span> — grocery, mobile shop,
                pharmacy, clothing, freelancer, jewellery, hotel, or general. This changes labels
                and extra fields; the billing engine stays the same.
              </li>
              <li>
                <span className="font-medium text-ink">Warehouses</span> — default location for
                stock. Business plan can add more branches.
              </li>
              <li>
                <span className="font-medium text-ink">Users</span> — admin invites staff. Staff can
                bill; some screens (warehouses, billing) stay admin-only.
              </li>
            </ul>
            <GuideFigure
              src="/marketing/howto/settings.png"
              alt="Live AasanBill Settings screen"
              caption="Figure 3 — Settings (live app): legal name, GSTIN, state, invoice prefix — this is what prints on every bill."
            />
          </Chapter>

          <Chapter id="catalog" number="03" title="Catalog & stock" kicker="Products · Inventory">
            <FeatureRow
              icon={Package}
              title="Add products once"
              body="Name, SKU, barcode (optional), HSN, GST %, selling price, and reorder level. Scan barcodes later when billing. Inactive items stay in history but drop out of new invoices."
            />
            <FeatureRow
              icon={Warehouse}
              title="Inventory movements"
              body="Stock in from purchase or production; stock out when you invoice (except services). Open Inventory for on-hand qty, low-stock, and the movement log. You can correct a movement if you have permission."
            />
            <p>
              Pharmacy-style shops can store batch and expiry. Expiry dates surface as alerts so
              you do not sell short-dated stock by accident. Purchases (Pro+) receive supplier
              bills and increase stock without typing a dummy sale.
            </p>
            <GuideFigure
              src="/marketing/howto/products.png"
              alt="Live AasanBill Products catalog"
              caption="Figure 4 — Products (live app): SKU, pack, HSN, price, GST %, stock bars, Add product."
            />
            <GuideFigure
              src="/marketing/howto/inventory.png"
              alt="Live AasanBill Inventory screen"
              caption="Figure 5 — Inventory (live app): on-hand stock, low-stock alerts, and the movement log."
            />
          </Chapter>

          <Chapter id="customers" number="04" title="Customers" kicker="Master">
            <FeatureRow
              icon={Users}
              title="Save the people you bill"
              body="Name, phone, email, billing address, and state. State drives GST split. GSTIN is optional for B2C; required when you mark a wholesaler (B2B) in trade verticals."
            />
            <p>
              Hotel and jewellery shops do not use Retail / Wholesaler on the form — guests and
              clients are stored the same way, with GSTIN optional. Open a customer to see the
              ledger (invoices, payments, running balance) and send an udhaar reminder on WhatsApp.
            </p>
            <GuideFigure
              src="/marketing/howto/customers.png"
              alt="Live AasanBill Customers list"
              caption="Figure 6 — Customers (live app): name, type, phone, state, GSTIN. Open a row for the ledger."
            />
          </Chapter>

          <Chapter id="invoice" number="05" title="Create an invoice" kicker="The main job">
            <p>
              Invoices → New invoice. Work in steps: pick the customer, add lines, check totals,
              generate. {APP_NAME} allocates the next invoice number in one transaction so two
              staff cannot clash on the same number.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StepCard
                n="A"
                title="Who is this for?"
                body="Search by name, phone, or GSTIN. Quick-add a new customer if they are not in the list yet."
              />
              <StepCard
                n="B"
                title="What are they buying?"
                body="Search or scan SKU/barcode. Set qty and rate. Override price if needed — the line is marked. Jewellery uses weight × locked metal rate instead of a fixed catalog price."
              />
              <StepCard
                n="C"
                title="GST is automatic"
                body="Same state as your shop → CGST + SGST. Different state → IGST. Taxable value × GST % is calculated per line; round-off is applied on the bill."
              />
              <StepCard
                n="D"
                title="Share the bill"
                body="Open the invoice: print, download PDF, or WhatsApp. A short public link can be generated so the customer opens the PDF without logging in."
              />
            </div>
            <FeatureRow
              icon={Receipt}
              title="Edit and cancel carefully"
              body="You can edit an issued invoice (stock is reversed and re-applied). Cancelled bills should not be reused as live numbers. Credit notes (Pro+) adjust a previous sale without deleting history."
            />
            <FeatureRow
              icon={MessageCircle}
              title="WhatsApp"
              body="Share opens a WhatsApp message with invoice number, amount, and link. Outstanding reminders use the customer’s phone from the master."
            />
            <GuideFigure
              src="/marketing/howto/invoice.png"
              alt="Live AasanBill New Invoice wizard"
              caption="Figure 7 — New invoice (live app): step 1 pick the customer, then add lines, check GST, generate."
            />
          </Chapter>

          <Chapter id="udhaar" number="06" title="Udhaar & payments" kicker="Khata">
            <FeatureRow
              icon={HandCoins}
              title="Part payments are normal"
              body="Record cash, UPI, bank, or other against an invoice or the customer ledger. The invoice status moves from unpaid → partial → paid. Outstanding lists who still owes you."
            />
            <p>
              Use the customer page as a running khata: every invoice increases the balance; every
              payment decreases it. Do not delete old invoices to “fix” a balance — record a
              payment or credit note instead so the audit trail stays clean.
            </p>
            <GuideFigure
              src="/marketing/howto/outstanding.png"
              alt="Live AasanBill Outstanding (udhaar) screen"
              caption="Figure 8 — Outstanding (live app): who still owes you. Record cash, UPI, or bank from here or the customer ledger."
            />
          </Chapter>

          <Chapter id="reports" number="07" title="Reports for your CA" kicker="GSTR">
            <FeatureRow
              icon={FileSpreadsheet}
              title="Export, don’t file for you"
              body={`${APP_NAME} does not file GST returns. Reports give GSTR-1 / GSTR-3B style Excel your CA can use on the GST portal. Filter by date, then download.`}
            />
            <p>
              Keep invoice dates, HSN/SAC, GSTIN, and state correct at billing time — that is what
              the export uses. Fixing a month after filing is harder than fixing the bill on the
              day.
            </p>
            <GuideFigure
              src="/marketing/howto/reports.png"
              alt="Live AasanBill Reports screen"
              caption="Figure 9 — Reports (live app): date range and GSTR-style export for your CA. AasanBill does not file returns for you."
            />
          </Chapter>

          <Chapter id="verticals" number="08" title="Shop-specific tools" kicker="Optional extras">
            <p>
              Pick your type at signup (or in settings). Only that shop’s extra screens appear.
              Everyone still gets invoices, customers, and reports.
            </p>
            <div className="overflow-hidden rounded-[12px] border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-cloud text-[11px] uppercase tracking-wide text-slate">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Type</th>
                    <th className="px-4 py-2.5 font-semibold">What changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {types.map((t) => (
                    <tr key={t.value}>
                      <td className="px-4 py-3 font-medium text-ink">{t.label}</td>
                      <td className="px-4 py-3 text-slate">{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-[12px] border border-border bg-surface p-5">
                <div className="flex items-center gap-2 text-ink">
                  <Gem className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="font-display text-sm font-semibold">Jewellery</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate">
                  Keep SKU, barcode, HSN (goods — start from 7113), warehouses, and inventory.
                  Price is weight (g) × today’s live or shop metal rate + making (fixed ₹ or % of
                  metal) + optional wastage %. When you bill, the ₹/g is locked on the line
                  forever — old invoices never jump when gold moves. Set Today’s Rates if live
                  market is down. The screenshot is the live Products catalog; jewellery adds
                  purity, weight, and estimated price on the same Add product form.
                </p>
                <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-[10px] border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/marketing/howto/products.png"
                    alt="Live Products catalog used by jewellery shops as the ornament list"
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                </div>
              </div>
              <div className="rounded-[12px] border border-border bg-surface p-5">
                <div className="flex items-center gap-2 text-ink">
                  <BedDouble className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="font-display text-sm font-semibold">Hotel / Guest house</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate">
                  Sidebar hides Products, Inventory, and Warehouses. Use Room Types (name,
                  description, SAC — often group 9963, rate per night, occupancy) and physical
                  rooms. Bookings is a date grid: booked vs free. Invoice by selecting a booking
                  (nights × rate), not product quantity. Stock is not deducted. The screenshot is
                  the live Invoices list — hotel shops still finish the bill here after a booking.
                </p>
                <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-[10px] border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/marketing/howto/invoices-list.png"
                    alt="Live Invoices list — hotel shops still bill from Invoices after a booking"
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
            <FeatureRow
              icon={CircleDot}
              title="Other trades in short"
              body="Mobile: optional IMEI on the line. Pharmacy: batch / expiry. Clothing: size-colour tag. Freelancer: mark items as services so stock is skipped. Grocery: pack size and HSN as usual."
            />
          </Chapter>

          <Chapter id="team" number="09" title="Team, plans & daily habits" kicker="Run it well">
            <FeatureRow
              icon={Building2}
              title="Plans"
              body="Trial follows Starter limits (invoices and products per month). Starter, Pro, and Business unlock purchases/credit notes (Pro+) and extra warehouses (Business). Change or cancel under Settings → Billing."
            />
            <FeatureRow
              icon={Settings}
              title="A simple daily loop"
              body="Morning: check Dashboard and low stock. Day: bill, receive stock, record udhaar. Evening: Outstanding follow-ups. Month-end: Reports export for the CA. Do not reuse cancelled numbers; do not edit history to hide a mistake — add a credit note."
            />
            <FeatureRow
              icon={BookOpen}
              title="Need a human?"
              body="Use Contact on this site or email from the footer. We do not file GST for you; we keep the books ready."
            />
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-white shadow-card hover:opacity-95"
              >
                Start free trial
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-[10px] border border-border bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-hover"
              >
                Log in
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-[10px] px-5 text-sm font-semibold text-primary hover:underline"
              >
                Contact
              </Link>
            </div>
          </Chapter>
        </div>
      </div>
    </article>
  );
}
