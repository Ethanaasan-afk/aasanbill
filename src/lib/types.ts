import type {
  CustomerType,
  BusinessDataCategory,
  ExpenseCategory,
  InvoiceStatus,
  MovementType,
  PaymentMode,
  UserRole,
} from "./constants";
import type { BusinessType } from "./business-types";

export interface AppUser {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  organization_id: string | null;
  has_seen_onboarding?: boolean;
}

/** Tenant / business account (replaces company_settings for app reads). */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  gstin: string | null;
  address: string | null;
  state: string;
  bank_details: string | null;
  logo_url: string | null;
  plan: "free" | "starter" | "pro" | "business";
  subscription_status: "trialing" | "active" | "past_due" | "cancelled";
  trial_ends_at: string | null;
  created_at: string;
  brand_name: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
  bank_name: string;
  bank_account: string;
  bank_ifsc: string;
  bank_branch: string;
  invoice_prefix: string;
  upi_id: string;
  updated_at: string;
  /** Public URL of authorized signatory image (org-scoped storage). */
  signature_url?: string | null;
  /** Vertical config; missing/null treated as general */
  business_type?: BusinessType;
  razorpay_customer_id?: string | null;
  razorpay_subscription_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

export interface BillingEvent {
  id: string;
  organization_id: string | null;
  event_type: string;
  razorpay_subscription_id: string | null;
  raw_payload: unknown;
  created_at: string;
}

/**
 * Letterhead / invoice shape used by PDF + Settings UI.
 * Mapped from Organization (company_settings is no longer read by the app).
 */
export interface CompanySettings {
  id: string;
  company_name: string;
  brand_name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  bank_name: string;
  bank_account: string;
  bank_ifsc: string;
  bank_branch: string;
  invoice_prefix: string;
  /** UPI VPA for customer payments, e.g. business@upi */
  upi_id?: string;
  /** Authorized signatory image URL (org upload). */
  signature_url?: string | null;
  updated_at: string;
  /** Same as Organization.id */
  organization_id?: string;
  slug?: string;
  plan?: Organization["plan"];
  subscription_status?: Organization["subscription_status"];
  trial_ends_at?: string | null;
  business_type?: BusinessType;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  organization_id?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  state: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  organization_id?: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  hsn_code: string;
  quantity: number;
  unit_cost: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  line_total: number;
  batch_number: string | null;
  mfg_date: string | null;
  exp_date: string | null;
  product?: Product;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  warehouse_id: string | null;
  purchase_date: string;
  subtotal: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  round_off: number;
  grand_total: number;
  status: "received" | "cancelled";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  organization_id?: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
  items?: PurchaseItem[];
}

export interface CreditNoteItem {
  id: string;
  credit_note_id: string;
  product_id: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  line_total: number;
  product?: Product;
}

export interface CreditNote {
  id: string;
  credit_note_number: string;
  invoice_id: string;
  customer_id: string;
  warehouse_id: string | null;
  credit_date: string;
  subtotal: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  round_off: number;
  grand_total: number;
  reason: string | null;
  status: "issued" | "cancelled";
  created_by: string | null;
  created_at: string;
  organization_id?: string;
  invoice?: Invoice;
  customer?: Customer;
  items?: CreditNoteItem[];
}

export interface Product {
  id: string;
  organization_id?: string;
  name: string;
  category: string;
  variant: string | null;
  sku: string;
  /** Optional barcode / EAN for scanner billing */
  barcode?: string | null;
  pack_size: string;
  hsn_code: string;
  base_price: number;
  /**
   * Internal quick-reference unit cost. Not used for invoices, GST, or customer pricing.
   * Detailed cost history lives in Business Data → Product Costs.
   */
  manufacturing_cost?: number | null;
  gst_rate: number;
  reorder_threshold: number;
  is_active: boolean;
  image_url: string | null;
  mfg_date?: string | null;
  exp_date?: string | null;
  /** @deprecated Prefer invoice-line IMEI; kept for older mobile catalog rows */
  imei_serial?: string | null;
  /** Pharmacy - optional batch on the catalog item */
  batch_number?: string | null;
  /** Freelancer - when true, skip stock check/deduction on invoices */
  is_service?: boolean;
  /** Jewellery - gold | silver | platinum | palladium; null for fixed-price products */
  metal_type?: "gold" | "silver" | "platinum" | "palladium" | null;
  purity?: string | null;
  huid_number?: string | null;
  gross_weight?: number | null;
  net_weight?: number | null;
  making_charge_type?: "flat" | "per_gram" | "percent" | null;
  making_charge_value?: number | null;
  stone_value?: number | null;
  /** Jewellery: % of metal value (estimate only; not a fixed base price) */
  wastage_percent?: number | null;
  created_at: string;
  updated_at: string;
  current_stock?: number;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  old_price: number | null;
  new_price: number;
  changed_by: string | null;
  changed_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reference: string | null;
  reason: string | null;
  batch_number: string | null;
  mfg_date: string | null;
  exp_date: string | null;
  created_by: string | null;
  created_at: string;
  edited_at?: string | null;
  edited_by?: string | null;
  warehouse_id?: string | null;
  organization_id?: string;
  product?: Product;
  user?: AppUser;
  editor?: AppUser;
  warehouse?: Warehouse;
}

export interface Customer {
  id: string;
  name: string;
  organization_id?: string;
  phone: string | null;
  email: string | null;
  billing_address: string | null;
  state: string;
  gstin: string | null;
  customer_type: CustomerType;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  subtotal: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  round_off: number;
  grand_total: number;
  /** Sum of payments applied to this invoice */
  amount_paid?: number;
  status: InvoiceStatus;
  cancelled_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  edited_at?: string | null;
  edited_by?: string | null;
  warehouse_id?: string | null;
  organization_id?: string;
  /** Public PDF short link code for /i/{short_code} */
  short_code?: string | null;
  customer?: Customer;
  items?: InvoiceItem[];
  creator?: AppUser;
  warehouse?: Warehouse;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string | null;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  price_overridden: boolean;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  line_total: number;
  /** Mobile shop - optional IMEI/serial for this line */
  imei_serial?: string | null;
  /** Pharmacy - optional batch for this line */
  batch_number?: string | null;
  /** Cloth shop lite - free-text size/color tag */
  variant_tag?: string | null;
  /** Jewellery snapshots - rate/weights charged at bill time */
  metal_rate_used?: number | null;
  /** Same locked ₹/g as metal_rate_used; permanent sale-time snapshot */
  rate_locked_at_sale?: number | null;
  /** live_metal_rates | metal_rates | manual */
  rate_source?: string | null;
  gross_weight?: number | null;
  net_weight?: number | null;
  making_charge_amount?: number | null;
  stone_value?: number | null;
  jewellery_purity?: string | null;
  jewellery_huid?: string | null;
  /** Hotel folio - stay dates and guest ID (display only) */
  check_in_date?: string | null;
  check_out_date?: string | null;
  guest_id_proof?: string | null;
  /** Hotel: line billed from a room booking */
  room_booking_id?: string | null;
  product?: Product;
}

export interface CreateInvoicePayload {
  customer_id: string;
  invoice_date: string;
  notes?: string;
  warehouse_id?: string | null;
  items: {
    product_id?: string | null;
    quantity: number;
    unit_price: number;
    price_overridden: boolean;
    imei_serial?: string | null;
    batch_number?: string | null;
    variant_tag?: string | null;
    metal_rate_used?: number | null;
    rate_locked_at_sale?: number | null;
    rate_source?: string | null;
    gross_weight?: number | null;
    net_weight?: number | null;
    making_charge_amount?: number | null;
    stone_value?: number | null;
    jewellery_purity?: string | null;
    jewellery_huid?: string | null;
    check_in_date?: string | null;
    check_out_date?: string | null;
    guest_id_proof?: string | null;
    room_booking_id?: string | null;
    hsn_code?: string | null;
    gst_rate?: number | null;
  }[];
}

export type UpdateInvoicePayload = CreateInvoicePayload & {
  force?: boolean;
};

/** Internal bookkeeping - never used by invoices / base_price */
export interface ProductCost {
  id: string;
  product_id: string;
  cost_price: number;
  supplier: string | null;
  purchase_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
}

export interface OtherExpense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paid_to: string | null;
  payment_mode: PaymentMode | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** Hotel — billable room category (per night). */
export type RoomType = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  sac_code: string | null;
  base_price: number;
  gst_rate: number;
  max_occupancy: number;
  is_active: boolean;
  created_at: string;
};

export type RoomStatus = "available" | "maintenance" | "out_of_service";

export type HotelRoom = {
  id: string;
  organization_id: string;
  room_type_id: string;
  room_number: string;
  status: RoomStatus;
  created_at: string;
  room_type?: RoomType;
};

export type RoomBookingStatus = "booked" | "checked_in" | "checked_out" | "cancelled";

export type RoomBooking = {
  id: string;
  organization_id: string;
  room_id: string;
  customer_id: string;
  check_in_date: string;
  check_out_date: string;
  status: RoomBookingStatus;
  guest_id_proof: string | null;
  notes: string | null;
  invoice_id: string | null;
  created_at: string;
  room?: HotelRoom;
  customer?: Customer;
};

/** Unified Business Data ledger entry */
export interface BusinessDataEntry {
  id: string;
  company_person_name: string;
  category: BusinessDataCategory;
  item_name: string;
  expense_name: string;
  payment_method: PaymentMode;
  amount: number;
  note: string | null;
  entry_date: string;
  created_by: string | null;
  created_at: string;
  organization_id?: string;
}
