"use client";

import { useAuth } from "@/components/auth-provider";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { InvoiceStepProgress } from "@/components/invoices/invoice-step-progress";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ProductSwatch } from "@/components/ui/product-swatch";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useBusinessType } from "@/hooks/use-business-type";
import { useCompanySettings } from "@/hooks/use-company";
import { useCustomers } from "@/hooks/use-customers";
import { useRoomBookings } from "@/hooks/use-hotel";
import { useInvoiceMutations } from "@/hooks/use-invoices";
import { findLatestRate, useMetalRates } from "@/hooks/use-metal-rates";
import { useProducts } from "@/hooks/use-products";
import { useWarehouses } from "@/hooks/use-warehouses";
import { BUSINESS_STATE, customerTypeLabel } from "@/lib/constants";
import { calcInvoiceTotals, isIntraState } from "@/lib/gst";
import { bookingNights, isActiveBookingStatus } from "@/lib/hotel";
import {
  calcJewelleryTaxable,
  formatJewelleryCatalogLabel,
  formatPurityLabel,
  isJewelleryProduct,
  jewelleryLineFromProduct,
  resolveJewelleryRatePerGram,
  type RateSource,
} from "@/lib/jewellery";
import { productColor } from "@/lib/product-color";
import type { Customer, Invoice, Product, RoomBooking } from "@/lib/types";
import { formatDate, formatINR } from "@/lib/utils";
import { getNumberInputHandlers } from "@/lib/number-input";
import { Plus, ScanBarcode, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveMarketRates } from "@/hooks/use-live-market-rates";

interface DraftLine {
  key: string;
  product: Product | null;
  quantity: number | string;
  unit_price: number | string;
  price_overridden: boolean;
  search: string;
  imei_serial: string;
  batch_number: string;
  variant_tag: string;
  /** Jewellery: rate ₹/g used for metal value (overridable) — locked at sale */
  metal_rate_used: number | null;
  rate_locked_at_sale: number | null;
  rate_source: RateSource | null;
  gross_weight: number | null;
  net_weight: number | null;
  making_charge_amount: number | null;
  stone_value: number | null;
  jewellery_purity: string | null;
  jewellery_huid: string | null;
  wastage_amount: number | null;
  /** Hotel folio */
  check_in_date: string;
  check_out_date: string;
  guest_id_proof: string;
  room_booking_id: string | null;
  booking_label: string;
  gst_rate: number;
  hsn_code: string;
}

function newLine(): DraftLine {
  return {
    key: Math.random().toString(36).slice(2),
    product: null,
    quantity: 1,
    unit_price: 0,
    price_overridden: false,
    search: "",
    imei_serial: "",
    batch_number: "",
    variant_tag: "",
    metal_rate_used: null,
    rate_locked_at_sale: null,
    rate_source: null,
    gross_weight: null,
    net_weight: null,
    making_charge_amount: null,
    stone_value: null,
    jewellery_purity: null,
    jewellery_huid: null,
    wastage_amount: null,
    check_in_date: "",
    check_out_date: "",
    guest_id_proof: "",
    room_booking_id: null,
    booking_label: "",
    gst_rate: 0,
    hsn_code: "",
  };
}

function bookingLineLabel(b: RoomBooking): string {
  const roomNo = b.room?.room_number ?? "Room";
  const typeName = b.room?.room_type?.name ?? "Stay";
  return `${roomNo} · ${typeName}`;
}

function linesFromInvoice(invoice: Invoice, products: Product[] | undefined): DraftLine[] {
  const items = invoice.items ?? [];
  if (!items.length) return [newLine()];
  return items.map((it) => {
    const product =
      it.product ??
      (it.product_id ? products?.find((p) => p.id === it.product_id) : null) ??
      null;
    const name = it.room_booking_id
      ? `Stay ${it.check_in_date ?? ""} → ${it.check_out_date ?? ""}`
      : product
        ? `${product.name}${product.variant ? ` (${product.variant})` : ""}`
        : "Item";
    return {
      key: Math.random().toString(36).slice(2),
      product,
      quantity: it.quantity,
      unit_price: it.unit_price,
      price_overridden: it.price_overridden,
      search: name,
      imei_serial: it.imei_serial ?? "",
      batch_number: it.batch_number ?? "",
      variant_tag: it.variant_tag ?? "",
      metal_rate_used: it.metal_rate_used ?? it.rate_locked_at_sale ?? null,
      rate_locked_at_sale: it.rate_locked_at_sale ?? it.metal_rate_used ?? null,
      rate_source: (it.rate_source as RateSource | null) ?? null,
      gross_weight: it.gross_weight ?? null,
      net_weight: it.net_weight ?? null,
      making_charge_amount: it.making_charge_amount ?? null,
      stone_value: it.stone_value ?? null,
      jewellery_purity: it.jewellery_purity ?? product?.purity ?? null,
      jewellery_huid: it.jewellery_huid ?? product?.huid_number ?? null,
      wastage_amount: null,
      check_in_date: it.check_in_date ?? "",
      check_out_date: it.check_out_date ?? "",
      guest_id_proof: it.guest_id_proof ?? "",
      room_booking_id: it.room_booking_id ?? null,
      booking_label: name,
      gst_rate: Number(it.gst_rate) || 0,
      hsn_code: it.hsn_code ?? "",
    };
  });
}

function isValidDraftLine(line: DraftLine, hotelStay: boolean): boolean {
  if (Number(line.quantity) <= 0) return false;
  if (hotelStay) return !!line.room_booking_id;
  return !!line.product;
}

function LeaderRow({
  label,
  value,
  helpKey,
}: {
  label: string;
  value: string;
  helpKey?: "cgst" | "sgst" | "igst";
}) {
  return (
    <div className="leader-row">
      <span className="inline-flex shrink-0 items-center gap-1 text-slate">
        {label}
        {helpKey ? <HelpTip helpKey={helpKey} /> : null}
      </span>
      <span className="leader-line" aria-hidden />
      <span className="shrink-0 font-mono text-ink">{value}</span>
    </div>
  );
}

export function InvoiceForm({
  mode,
  invoice,
  force = false,
}: {
  mode: "create" | "edit";
  invoice?: Invoice;
  force?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts(true);
  const { data: bookings } = useRoomBookings();
  const { labels, config: bizConfig, isHotel, isJewellery } = useBusinessType();
  const lineFields = bizConfig.invoiceLineFields;
  const hotelStay = lineFields.hotelStay;
  const hideCustomerType = isHotel || isJewellery;
  const { data: company } = useCompanySettings();
  const { data: warehouses } = useWarehouses(true);
  const { data: metalRates } = useMetalRates();
  const { data: liveMarket } = useLiveMarketRates(isJewellery);
  const { create, update } = useInvoiceMutations();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState(invoice?.customer_id ?? "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoice_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [warehouseId, setWarehouseId] = useState(invoice?.warehouse_id ?? "");
  const [barcodeScan, setBarcodeScan] = useState("");
  const [bookingPick, setBookingPick] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    invoice ? linesFromInvoice(invoice, undefined) : hotelStay ? [] : [newLine()]
  );
  const [activeLine, setActiveLine] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(mode === "create");
  const searchRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (mode !== "edit" || !invoice || hydrated) return;
    if (!hotelStay && !products?.length) return;
    setLines(linesFromInvoice(invoice, products));
    setCustomerId(invoice.customer_id);
    setInvoiceDate(invoice.invoice_date.slice(0, 10));
    setNotes(invoice.notes ?? "");
    setWarehouseId(invoice.warehouse_id ?? "");
    setHydrated(true);
  }, [mode, invoice, products, hydrated, hotelStay]);

  useEffect(() => {
    if (warehouseId || !warehouses?.length) return;
    const def = warehouses.find((w) => w.is_default) ?? warehouses[0];
    if (def) setWarehouseId(def.id);
  }, [warehouses, warehouseId]);

  const selectedCustomer = customers?.find((c) => c.id === customerId) ?? null;

  const billableBookings = useMemo(() => {
    const used = new Set(lines.map((l) => l.room_booking_id).filter(Boolean));
    return (bookings ?? []).filter(
      (b) =>
        isActiveBookingStatus(b.status) &&
        !used.has(b.id) &&
        (!customerId || b.customer_id === customerId)
    );
  }, [bookings, lines, customerId]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return (customers ?? [])
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q) ||
          (c.gstin ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  const totals = useMemo(() => {
    if (!selectedCustomer) return null;
    const valid = lines.filter((l) => isValidDraftLine(l, hotelStay));
    if (!valid.length) return null;
    return calcInvoiceTotals(
      valid.map((l) => ({
        quantity: Number(l.quantity),
        unitPrice: Number(l.unit_price),
        gstRate: hotelStay ? l.gst_rate : l.product!.gst_rate,
      })),
      selectedCustomer.state
    );
  }, [lines, selectedCustomer, hotelStay]);

  const pickProduct = (key: string, product: Product) => {
    const jewellery = lineFields.jewelleryPricing && isJewelleryProduct(product);
    const shop = jewellery
      ? findLatestRate(metalRates, product.metal_type, product.purity)
      : null;
    const resolved = jewellery
      ? resolveJewelleryRatePerGram({
          metal: product.metal_type,
          purity: product.purity,
          liveRates: liveMarket?.rates,
          shopRatePerGram: shop?.rate_per_gram ?? null,
        })
      : { ratePerGram: 0, source: null as RateSource | null };
    const j = jewellery
      ? jewelleryLineFromProduct(product, resolved.ratePerGram)
      : null;

    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              product,
              quantity: j?.quantity ?? 1,
              unit_price: j?.unit_price ?? product.base_price,
              price_overridden: false,
              search: `${product.name}${product.variant ? ` (${product.variant})` : ""}`,
              imei_serial: lineFields.lineImeiSerial ? l.imei_serial || "" : "",
              batch_number: lineFields.lineBatchNumber
                ? product.batch_number ?? l.batch_number ?? ""
                : "",
              variant_tag: lineFields.lineVariantTag
                ? product.variant ?? l.variant_tag ?? ""
                : "",
              metal_rate_used: j?.ratePerGram ?? null,
              rate_locked_at_sale: j?.ratePerGram ?? null,
              rate_source: resolved.source,
              gross_weight: j?.grossWeight ?? null,
              net_weight: j?.netWeight ?? null,
              making_charge_amount: j?.makingCharge ?? null,
              stone_value: j?.stoneValue ?? null,
              jewellery_purity: j?.jewellery_purity ?? null,
              jewellery_huid: j?.jewellery_huid ?? null,
              wastage_amount: j?.wastageAmount ?? null,
            }
          : l
      )
    );
    setActiveLine(null);
    if (jewellery && !(resolved.ratePerGram > 0)) {
      toast(
        `No live/shop rate for ${formatJewelleryCatalogLabel(product.metal_type, product.purity)}. Override rate/g on the line.`,
        "info"
      );
    }
  };

  const addBookingLine = (booking: RoomBooking) => {
    const type = booking.room?.room_type;
    const nights = bookingNights(booking);
    const label = bookingLineLabel(booking);
    const line: DraftLine = {
      ...newLine(),
      product: null,
      room_booking_id: booking.id,
      booking_label: label,
      search: label,
      quantity: nights,
      unit_price: Number(type?.base_price ?? 0),
      price_overridden: false,
      gst_rate: Number(type?.gst_rate ?? 12),
      hsn_code: type?.sac_code ?? "",
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      guest_id_proof: booking.guest_id_proof ?? "",
    };
    setLines((prev) => [...prev, line]);
    if (!customerId) setCustomerId(booking.customer_id);
    setBookingPick("");
  };

  const productSuggestions = (search: string) => {
    const q = search.toLowerCase();
    return (products ?? [])
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.variant ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  };

  const applyBarcode = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const product =
      (products ?? []).find(
        (p) =>
          (p.barcode && p.barcode === code) ||
          p.sku.toLowerCase() === code.toLowerCase()
      ) ?? null;
    if (!product) {
      toast(
        `We couldn't find a product for "${code}". Check the barcode or add the product first.`,
        "error"
      );
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.product?.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.key === existing.key ? { ...l, quantity: Number(l.quantity) + 1 } : l
        );
      }
      const empty = prev.find((l) => !l.product && !l.room_booking_id);
      const filled: DraftLine = {
        ...newLine(),
        product,
        unit_price: product.base_price,
        price_overridden: false,
        search: `${product.name}${product.variant ? ` (${product.variant})` : ""}`,
        quantity: 1,
        batch_number: lineFields.lineBatchNumber ? product.batch_number ?? "" : "",
        variant_tag: lineFields.lineVariantTag ? product.variant ?? "" : "",
      };
      if (empty) {
        return prev.map((l) => (l.key === empty.key ? { ...filled, key: l.key } : l));
      }
      return [...prev, filled];
    });
    toast(`Added ${product.name}`);
    // Re-pick through jewellery engine when applicable
    if (lineFields.jewelleryPricing && isJewelleryProduct(product)) {
      // find the line we just set - defer by updating via pick on matching product
      setLines((prev) => {
        const target = prev.find((l) => l.product?.id === product.id);
        if (!target) return prev;
        const rateRow = findLatestRate(metalRates, product.metal_type, product.purity);
        const j = jewelleryLineFromProduct(product, rateRow?.rate_per_gram ?? 0);
        return prev.map((l) =>
          l.key === target.key
            ? {
                ...l,
                quantity: j.quantity,
                unit_price: j.unit_price,
                metal_rate_used: j.ratePerGram,
                gross_weight: j.grossWeight,
                net_weight: j.netWeight,
                making_charge_amount: j.makingCharge,
                stone_value: j.stoneValue,
                jewellery_purity: j.jewellery_purity,
                jewellery_huid: j.jewellery_huid,
              }
            : l
        );
      });
    }
  };

  const goNext = () => {
    setError("");
    if (step === 1 && !customerId) {
      setError("Pick who this invoice is for, or add a new customer.");
      return;
    }
    if (step === 2) {
      const valid = lines.filter((l) => isValidDraftLine(l, hotelStay));
      if (!valid.length) {
        setError(
          hotelStay
            ? "Add at least one room booking to bill."
            : `Add at least one ${labels.product.toLowerCase()} they're buying.`
        );
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const submit = async () => {
    setError("");
    if (!user) return;
    if (!customerId) {
      setError("Pick who this invoice is for.");
      setStep(1);
      return;
    }
    const valid = lines.filter((l) => isValidDraftLine(l, hotelStay));
    if (!valid.length) {
      setError(
        hotelStay
          ? "Add at least one room booking."
          : `Add at least one ${labels.product.toLowerCase()}.`
      );
      setStep(2);
      return;
    }

    const items = valid.map((l) => {
      if (hotelStay) {
        return {
          product_id: null,
          room_booking_id: l.room_booking_id,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          price_overridden: l.price_overridden,
          hsn_code: l.hsn_code || null,
          gst_rate: l.gst_rate,
          check_in_date: l.check_in_date || null,
          check_out_date: l.check_out_date || null,
          guest_id_proof: l.guest_id_proof || null,
        };
      }
      const jewellery =
        lineFields.jewelleryPricing && isJewelleryProduct(l.product);
      return {
        product_id: l.product!.id,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        price_overridden: l.price_overridden,
        imei_serial: lineFields.lineImeiSerial ? l.imei_serial || null : null,
        batch_number: lineFields.lineBatchNumber ? l.batch_number || null : null,
        variant_tag: lineFields.lineVariantTag ? l.variant_tag || null : null,
        metal_rate_used: jewellery ? l.metal_rate_used : null,
        rate_locked_at_sale: jewellery
          ? l.rate_locked_at_sale ?? l.metal_rate_used
          : null,
        rate_source: jewellery
          ? l.price_overridden
            ? "manual"
            : l.rate_source
          : null,
        gross_weight: jewellery ? l.gross_weight : null,
        net_weight: jewellery ? l.net_weight : null,
        making_charge_amount: jewellery ? l.making_charge_amount : null,
        stone_value: jewellery ? l.stone_value : null,
        jewellery_purity: jewellery ? l.jewellery_purity : null,
        jewellery_huid: jewellery ? l.jewellery_huid : null,
        check_in_date: null,
        check_out_date: null,
        guest_id_proof: null,
      };
    });

    try {
      if (mode === "edit" && invoice) {
        await update.mutateAsync({
          invoice_id: invoice.id,
          customer_id: customerId,
          invoice_date: invoiceDate,
          notes: notes || undefined,
          warehouse_id: warehouseId || null,
          user_id: user.id,
          force,
          items,
        });
        toast(`Done! ${invoice.invoice_number} is updated.`);
        router.push(`/invoices/${invoice.id}`);
      } else {
        const created = await create.mutateAsync({
          customer_id: customerId,
          invoice_date: invoiceDate,
          notes: notes || undefined,
          warehouse_id: warehouseId || null,
          user_id: user.id,
          prefix: company?.invoice_prefix ?? "AB",
          items,
        });
        toast(`Done! Invoice ${created.invoice_number} is ready.`);
        if (!created.id) {
          throw new Error("Create succeeded but no invoice id was returned");
        }
        router.push(`/invoices/${created.id}`);
      }
    } catch (e) {
      const msg = (e as Error).message || "Something went wrong";
      const friendly = msg.includes("limit")
        ? msg
        : `We couldn't save this invoice. ${msg.includes("stock") ? "Check stock levels and try again." : "Please check the details and try again."}`;
      setError(friendly);
      toast(friendly, "error");
    }
  };

  const intra = selectedCustomer ? isIntraState(selectedCustomer.state) : true;
  const saving = create.isPending || update.isPending;
  const cancelHref = mode === "edit" && invoice ? `/invoices/${invoice.id}` : "/invoices";
  const validLines = lines.filter((l) => isValidDraftLine(l, hotelStay));

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title={
          mode === "edit"
            ? `Edit ${invoice?.invoice_number ?? "Invoice"}`
            : "New Invoice"
        }
        description={
          mode === "edit"
            ? "Update the customer, products, and notes - same invoice number"
            : "Create a bill in four easy steps"
        }
        actions={
          <Button variant="secondary" onClick={() => router.push(cancelHref)}>
            Cancel
          </Button>
        }
      />

      {force && mode === "edit" && (
        <div className="mb-4 rounded-[10px] border border-brass/40 bg-brass/10 px-4 py-3 text-sm text-ink">
          Admin override: this invoice is <strong>{invoice?.status}</strong>. Saving will still
          reverse and re-apply stock for the new line items.
        </div>
      )}

      <InvoiceStepProgress
        step={step}
        onStepClick={(s) => {
          if (s < step) setStep(s);
        }}
      />

      {step === 1 && (
        <section className="panel mx-auto max-w-2xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Who is this for?</h2>
          <p className="mt-1 text-sm text-slate">
            Choose the customer receiving this invoice - or add someone new.
          </p>
          <div className="mt-4 flex items-center justify-end">
            <Button variant="ghost" onClick={() => setQuickAdd(true)}>
              <UserPlus className="h-4 w-4" /> Add new customer
            </Button>
          </div>
          <div className="relative mt-2">
            <input
              className="h-11 min-h-[44px] w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-ink placeholder:text-slate-dim focus:border-emerald focus:outline-none"
              placeholder="Search by name, phone, or GSTIN…"
              value={selectedCustomer ? selectedCustomer.name : customerSearch}
              onChange={(e) => {
                setCustomerId("");
                setCustomerSearch(e.target.value);
                setShowCustomerDrop(true);
              }}
              onFocus={() => setShowCustomerDrop(true)}
            />
            {showCustomerDrop && !selectedCustomer && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[10px] border border-border bg-surface">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full flex-col px-3 py-3 text-left text-sm transition-colors hover:bg-surface-hover"
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerSearch("");
                      setShowCustomerDrop(false);
                    }}
                  >
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-xs text-slate">
                      {c.state}
                      {!hideCustomerType && ` · ${customerTypeLabel(c.customer_type)}`}
                      {c.gstin ? ` · ${c.gstin}` : ""}
                    </span>
                  </button>
                ))}
                {!filteredCustomers.length && (
                  <p className="px-3 py-3 text-sm text-slate">
                    No matches - try Add new customer above.
                  </p>
                )}
              </div>
            )}
          </div>
          {selectedCustomer && (
            <p className="mt-3 text-sm text-slate">
              {selectedCustomer.state} -{" "}
              {intra ? (
                <span className="inline-flex items-center gap-1 text-emerald">
                  Same state (CGST + SGST) <HelpTip helpKey="cgst" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-brass">
                  Different state (IGST) <HelpTip helpKey="igst" />
                </span>
              )}
              {" · "}
              Your business state: {BUSINESS_STATE}
            </p>
          )}
          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={goNext} disabled={!customerId}>
              {hotelStay ? "Next: Bill a room stay" : "Next: What are they buying?"}
            </Button>
          </div>
        </section>
      )}

      {step === 2 && hotelStay && (
        <section className="panel mx-auto max-w-3xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Bill a room stay</h2>
          <p className="mt-1 text-sm text-slate">
            Pick an existing booking. Nights and rate come from the stay and room type — no product quantity.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <Select
                label="Room booking"
                value={bookingPick}
                onChange={(e) => setBookingPick(e.target.value)}
                placeholder="Select a booking…"
                options={billableBookings.map((b) => ({
                  value: b.id,
                  label: `${bookingLineLabel(b)} · ${formatDate(b.check_in_date)} → ${formatDate(b.check_out_date)} · ${b.customer?.name ?? "Guest"}`,
                }))}
              />
            </div>
            <Button
              onClick={() => {
                const b = billableBookings.find((x) => x.id === bookingPick);
                if (b) addBookingLine(b);
              }}
              disabled={!bookingPick}
            >
              <Plus className="h-4 w-4" /> Add stay
            </Button>
          </div>
          {!billableBookings.length && (
            <p className="mt-3 text-sm text-slate">
              No open bookings for this guest.{" "}
              <Link href="/bookings" className="text-emerald underline">
                Create a booking
              </Link>{" "}
              first.
            </p>
          )}

          <div className="mt-4 space-y-3">
            {lines.length === 0 && (
              <p className="rounded-[10px] border border-dashed border-border bg-cloud px-4 py-6 text-center text-sm text-slate">
                No stays on this invoice yet.
              </p>
            )}
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid gap-2 rounded-[10px] border border-border bg-cloud p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <p className="text-[10px] uppercase tracking-[0.05em] text-slate">Stay</p>
                  <p className="mt-1 text-sm font-medium text-ink">{line.booking_label}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate">
                    {formatDate(line.check_in_date)} → {formatDate(line.check_out_date)}
                    {line.hsn_code ? ` · SAC ${line.hsn_code}` : ""}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    Nights
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                    value={line.quantity}
                    {...getNumberInputHandlers({
                      onChange: (e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  quantity: e.target.value,
                                }
                              : l
                          )
                        ),
                    })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    Rate / night{" "}
                    {line.price_overridden && <span className="text-brass">(override)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                    value={line.unit_price}
                    {...getNumberInputHandlers({
                      onChange: (e) => {
                        const raw = e.target.value;
                        const booking = bookings?.find((b) => b.id === line.room_booking_id);
                        const catalog = Number(booking?.room?.room_type?.base_price ?? 0);
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  unit_price: raw,
                                  price_overridden: Number(raw) !== catalog,
                                }
                              : l
                          )
                        );
                      },
                    })}
                  />
                </div>
                <div className="flex items-end justify-between gap-2 sm:col-span-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.05em] text-slate">Line</p>
                    <p className="font-mono text-sm font-medium text-ink">
                      {formatINR(Number(line.quantity) * Number(line.unit_price))}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 className="h-4 w-4 text-rose" /> Remove
                  </Button>
                </div>
                <div className="sm:col-span-12">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    Guest ID proof{" "}
                    <span className="normal-case tracking-normal text-slate-dim">(optional)</span>
                  </label>
                  <input
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-ink focus:border-emerald focus:outline-none"
                    value={line.guest_id_proof}
                    placeholder="Aadhaar / passport last 4…"
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key ? { ...l, guest_id_proof: e.target.value } : l
                        )
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Input
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra note for this bill…"
            />
          </div>

          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="lg" onClick={goNext}>
              Next: Check everything
            </Button>
          </div>
        </section>
      )}

      {step === 2 && !hotelStay && (
        <section className="panel mx-auto max-w-3xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">What are they buying?</h2>
          <p className="mt-1 text-sm text-slate">
            Add {labels.productPlural.toLowerCase()}, quantities, and prices. You can scan a barcode if you have one.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative">
              <ScanBarcode className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-dim" />
              <input
                className="h-11 min-h-[44px] w-52 rounded-[10px] border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-slate-dim focus:border-emerald focus:outline-none sm:w-60"
                placeholder="Scan barcode / SKU"
                value={barcodeScan}
                onChange={(e) => setBarcodeScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyBarcode(barcodeScan);
                    setBarcodeScan("");
                  }
                }}
              />
            </div>
            <Button variant="secondary" onClick={() => setLines((p) => [...p, newLine()])}>
              <Plus className="h-4 w-4" /> Add another {labels.product.toLowerCase()}
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid gap-2 rounded-[10px] border border-border bg-cloud p-3 sm:grid-cols-12"
                style={
                  line.product
                    ? { boxShadow: `inset 3px 0 0 ${productColor(line.product.id)}` }
                    : undefined
                }
              >
                <div className="relative sm:col-span-5">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    {labels.product}
                  </label>
                  <input
                    ref={(el) => {
                      searchRefs.current[line.key] = el;
                    }}
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-ink focus:border-emerald focus:outline-none"
                    value={line.search}
                    placeholder={labels.searchProduct}
                    onFocus={() => setActiveLine(line.key)}
                    onChange={(e) => {
                      setActiveLine(line.key);
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key
                            ? { ...l, search: e.target.value, product: null }
                            : l
                        )
                      );
                    }}
                  />
                  {activeLine === line.key && !line.product && (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-[10px] border border-border bg-surface">
                      {productSuggestions(line.search).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full justify-between px-3 py-2.5 text-left text-sm hover:bg-surface-hover"
                          onClick={() => pickProduct(line.key, p)}
                        >
                          <span className="inline-flex items-center gap-2 text-ink">
                            <ProductSwatch productId={p.id} />
                            {p.name}
                            {p.variant ? ` (${p.variant})` : ""} · {p.pack_size}
                          </span>
                          <span className="font-mono text-xs text-slate">
                            {formatINR(p.base_price)}
                            {lineFields.hotelStay
                              ? " / night"
                              : ` · stk ${p.current_stock ?? 0}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    {labels.quantity}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                    value={line.quantity}
                    {...getNumberInputHandlers({
                      onChange: (e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  quantity: e.target.value,
                                }
                              : l
                          )
                        ),
                    })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                    {lineFields.jewelleryPricing && isJewelleryProduct(line.product)
                      ? "Rate / g"
                      : lineFields.hotelStay
                        ? "Rate / night"
                        : "Rate"}{" "}
                    {line.price_overridden && <span className="text-brass">(override)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                    value={
                      lineFields.jewelleryPricing && isJewelleryProduct(line.product)
                        ? line.metal_rate_used ?? ""
                        : line.unit_price
                    }
                    {...getNumberInputHandlers({
                      onChange: (e) =>
                        setLines((prev) =>
                          prev.map((l) => {
                            if (l.key !== line.key) return l;
                            const raw = e.target.value;
                            if (raw === "") {
                              return {
                                ...l,
                                metal_rate_used: null,
                                rate_locked_at_sale: null,
                                unit_price: "",
                                price_overridden: false,
                              };
                            }
                            const numericRaw = Number(raw);
                            if (
                              lineFields.jewelleryPricing &&
                              isJewelleryProduct(l.product)
                            ) {
                              const catalog = resolveJewelleryRatePerGram({
                                metal: l.product!.metal_type,
                                purity: l.product!.purity,
                                liveRates: liveMarket?.rates,
                                shopRatePerGram:
                                  findLatestRate(
                                    metalRates,
                                    l.product!.metal_type,
                                    l.product!.purity
                                  )?.rate_per_gram ?? null,
                              });
                              const breakdown = calcJewelleryTaxable({
                                netWeight: Number(l.net_weight) || 0,
                                grossWeight: Number(l.gross_weight) || 0,
                                ratePerGram: numericRaw,
                                makingChargeType: l.product!.making_charge_type,
                                makingChargeValue:
                                  Number(l.product!.making_charge_value) || 0,
                                stoneValue: Number(l.product!.stone_value) || 0,
                                wastagePercent:
                                  Number(l.product!.wastage_percent) || 0,
                              });
                              return {
                                ...l,
                                metal_rate_used: numericRaw,
                                rate_locked_at_sale: numericRaw,
                                rate_source:
                                  numericRaw !== catalog.ratePerGram
                                    ? "manual"
                                    : catalog.source,
                                making_charge_amount: breakdown.makingCharge,
                                stone_value: breakdown.stoneValue,
                                wastage_amount: breakdown.wastageAmount,
                                unit_price: breakdown.taxableValue,
                                price_overridden: numericRaw !== catalog.ratePerGram,
                              };
                            }
                            return {
                              ...l,
                              unit_price: raw,
                              price_overridden:
                                !!l.product && Number(raw) !== l.product.base_price,
                            };
                          })
                        ),
                    })}
                  />
                </div>
                <div className="flex items-end justify-between gap-2 sm:col-span-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.05em] text-slate">
                      {lineFields.jewelleryPricing && isJewelleryProduct(line.product)
                        ? "Taxable"
                        : "Line"}
                    </p>
                    <p className="font-mono text-sm font-medium text-ink">
                      {line.product
                        ? formatINR(Number(line.quantity) * Number(line.unit_price))
                        : "-"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 className="h-4 w-4 text-rose" /> Remove
                  </Button>
                </div>
                {lineFields.jewelleryPricing && isJewelleryProduct(line.product) && (
                  <div className="sm:col-span-12 rounded-[8px] border border-border/80 bg-surface px-3 py-2 font-mono text-[11px] text-slate">
                    Locked rate {formatINR(line.rate_locked_at_sale ?? line.metal_rate_used ?? 0)}
                    /g
                    {line.rate_source ? ` · ${line.rate_source}` : ""} ·{" "}
                    {formatPurityLabel(line.jewellery_purity)} ·{" "}
                    {line.net_weight ?? 0} g ×{" "}
                    {formatINR(line.metal_rate_used ?? 0)}/g = Metal{" "}
                    {formatINR(
                      calcJewelleryTaxable({
                        netWeight: Number(line.net_weight) || 0,
                        ratePerGram: Number(line.metal_rate_used) || 0,
                        makingChargeType: "flat",
                        makingChargeValue: 0,
                        stoneValue: 0,
                      }).metalValue
                    )}{" "}
                    + Making {formatINR(line.making_charge_amount ?? 0)}
                    {(line.wastage_amount ?? 0) > 0
                      ? ` + Wastage ${formatINR(line.wastage_amount ?? 0)}`
                      : ""}{" "}
                    + Stone {formatINR(line.stone_value ?? 0)}
                    {line.jewellery_huid ? ` · HUID ${line.jewellery_huid}` : ""}
                  </div>
                )}
                {(lineFields.lineImeiSerial ||
                  lineFields.lineBatchNumber ||
                  lineFields.lineVariantTag) && (
                  <div className="grid gap-2 sm:col-span-12 sm:grid-cols-3">
                    {lineFields.lineImeiSerial && (
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                          {labels.lineImeiSerial}{" "}
                          <span className="normal-case tracking-normal text-slate-dim">(optional)</span>
                        </label>
                        <input
                          className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                          value={line.imei_serial}
                          placeholder="15-digit IMEI / serial"
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, imei_serial: e.target.value } : l
                              )
                            )
                          }
                        />
                      </div>
                    )}
                    {lineFields.lineBatchNumber && (
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                          {labels.lineBatchNumber}{" "}
                          <span className="normal-case tracking-normal text-slate-dim">(optional)</span>
                        </label>
                        <input
                          className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 font-mono text-sm text-ink focus:border-emerald focus:outline-none"
                          value={line.batch_number}
                          placeholder="Batch / lot"
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, batch_number: e.target.value } : l
                              )
                            )
                          }
                        />
                      </div>
                    )}
                    {lineFields.lineVariantTag && (
                      <div
                        className={
                          lineFields.lineImeiSerial || lineFields.lineBatchNumber
                            ? ""
                            : "sm:col-span-2"
                        }
                      >
                        <label className="mb-1 block text-[10px] uppercase tracking-[0.05em] text-slate">
                          {labels.lineVariantTag}{" "}
                          <span className="normal-case tracking-normal text-slate-dim">(optional)</span>
                        </label>
                        <input
                          className="h-11 min-h-[44px] w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-ink focus:border-emerald focus:outline-none"
                          value={line.variant_tag}
                          placeholder="Size: L, Color: Red"
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, variant_tag: e.target.value } : l
                              )
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Input
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra note for this bill…"
            />
          </div>

          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="lg" onClick={goNext}>
              Next: Check everything
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="panel mx-auto max-w-xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Check everything</h2>
          <p className="mt-1 text-sm text-slate">
            Confirm the date, warehouse, and totals before you create the invoice.
          </p>

          {mode === "edit" && invoice && (
            <p className="mt-3 font-mono text-xs text-slate">No. {invoice.invoice_number}</p>
          )}

          <div className="mt-4 space-y-3">
            <Input
              label="Invoice date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
            {(warehouses ?? []).length > 0 && !hotelStay && (
              <Select
                label="Warehouse"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
              />
            )}
          </div>

          <div className="mt-5 rounded-[10px] border border-border bg-cloud p-4 text-sm">
            <p className="font-medium text-ink">{selectedCustomer?.name}</p>
            <p className="mt-1 text-slate">
              {validLines.length} {hotelStay ? "stay(s)" : "product(s)"}
            </p>
            <ul className="mt-2 space-y-1 text-slate">
              {validLines.map((l) => (
                <li key={l.key}>
                  {hotelStay
                    ? `${l.booking_label} × ${l.quantity} night(s)`
                    : `${l.product?.name} × ${l.quantity}`}{" "}
                  - {formatINR(Number(l.quantity) * Number(l.unit_price))}
                </li>
              ))}
            </ul>
          </div>

          {totals ? (
            <div className="mt-5 space-y-2.5">
              <LeaderRow label="Subtotal" value={formatINR(totals.subtotal)} />
              {intra ? (
                <>
                  <LeaderRow label="CGST" value={formatINR(totals.totalCgst)} helpKey="cgst" />
                  <LeaderRow label="SGST" value={formatINR(totals.totalSgst)} helpKey="sgst" />
                </>
              ) : (
                <LeaderRow label="IGST" value={formatINR(totals.totalIgst)} helpKey="igst" />
              )}
              <LeaderRow
                label="Round off"
                value={`${totals.roundOff >= 0 ? "+" : ""}${formatINR(totals.roundOff)}`}
              />
              <div className="mt-3 rounded-[10px] border border-sage bg-sage-soft px-3 py-3">
                <div className="flex items-end justify-between gap-3">
                  <span className="font-display text-xs font-semibold uppercase tracking-[0.06em] text-sage">
                    Grand Total
                  </span>
                  <span className="font-display text-2xl font-semibold tracking-tight text-sage">
                    <span className="font-mono">{formatINR(totals.grandTotal)}</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate">Add a customer and products to see totals.</p>
          )}

          {error && <p className="mt-3 text-sm text-rose">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button size="lg" onClick={goNext}>
              Next: Send it
            </Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="panel mx-auto max-w-xl p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Send it</h2>
          <p className="mt-1 text-sm text-slate">
            {mode === "edit"
              ? "Save your changes. You can share the invoice on WhatsApp from the invoice page."
              : "Create the invoice, then you can print, download PDF, or share on WhatsApp."}
          </p>

          <div className="mt-5 rounded-[10px] border border-border bg-cloud p-4 text-sm space-y-2">
            <p>
              <span className="text-slate">Customer:</span>{" "}
              <span className="font-medium text-ink">{selectedCustomer?.name}</span>
            </p>
            <p>
              <span className="text-slate">Items:</span>{" "}
              <span className="font-medium text-ink">{validLines.length}</span>
            </p>
            <p>
              <span className="text-slate">Total:</span>{" "}
              <span className="font-mono font-semibold text-ink">
                {totals ? formatINR(totals.grandTotal) : "-"}
              </span>
            </p>
          </div>

          {error && <p className="mt-3 text-sm text-rose">{error}</p>}

          <div className="mt-6 flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button size="lg" loading={saving} onClick={() => void submit()}>
              {mode === "edit" ? "Save changes" : "Generate invoice"}
            </Button>
          </div>
        </section>
      )}

      <CustomerFormModal
        open={quickAdd}
        onClose={() => setQuickAdd(false)}
        customer={null}
        onCreated={(c: Customer) => {
          setCustomerId(c.id);
          setCustomerSearch("");
        }}
      />
    </div>
  );
}
