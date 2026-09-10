import { calcInvoiceTotals } from "@/lib/gst";
import { getFinancialYear } from "@/lib/utils";
import type {
  AppUser,
  BusinessDataEntry,
  CompanySettings,
  CreateInvoicePayload,
  CreditNote,
  CreditNoteItem,
  Customer,
  Invoice,
  InvoiceItem,
  Organization,
  OtherExpense,
  PriceHistory,
  Product,
  ProductCost,
  Purchase,
  PurchaseItem,
  StockMovement,
  Supplier,
  Warehouse,
} from "@/lib/types";
import type { Payment } from "@/lib/udhaar";
import { invoiceStatusFromPaid } from "@/lib/invoice-payment";
import {
  companySettingsToOrganizationPatch,
  organizationToCompanySettings,
} from "@/lib/organization";
import type { BusinessDataCategory, PaymentMode } from "@/lib/constants";
import { DEMO_ADMIN } from "./mode";

function id() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const P3 = "33333333-3333-4333-8333-333333333333";
const P4 = "44444444-4444-4444-8444-444444444444";
const P5 = "55555555-5555-4555-8555-555555555555";
const P6 = "66666666-6666-4666-8666-666666666666";
const P7 = "77777777-7777-4777-8777-777777777777";
const P8 = "88888888-8888-4888-8888-888888888888";
const P9 = "99999999-9999-4999-8999-999999999999";
const P10 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const C1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const C2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const W1 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const S1 = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const S2 = "ffffffff-ffff-4fff-8fff-ffffffffffff";

type Store = {
  products: Product[];
  stock: Record<string, number>;
  priceHistory: PriceHistory[];
  movements: StockMovement[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  company: CompanySettings;
  organization: Organization;
  users: AppUser[];
  invoiceSeq: number;
  purchaseSeq: number;
  creditNoteSeq: number;
  productCosts: ProductCost[];
  otherExpenses: OtherExpense[];
  businessDataEntries: BusinessDataEntry[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  purchases: Purchase[];
  creditNotes: CreditNote[];
};

function seed(): Store {
  const products: Product[] = [
    {
      id: P1,
      name: "Handwash - Rose",
      category: "Handwash",
      variant: "Rose",
      sku: "HAN-ROS-500ML-A1",
      pack_size: "500ml",
      hsn_code: "34013000",
      base_price: 85,
      manufacturing_cost: 42,
      gst_rate: 18,
      reorder_threshold: 20,
      is_active: true,
      image_url: null,
      barcode: "8901001000001",
      mfg_date: "2026-01-15",
      exp_date: "2026-08-05",
      created_at: "2026-01-10T10:00:00.000Z",
      updated_at: "2026-01-10T10:00:00.000Z",
    },
    {
      id: P2,
      name: "Dishwash Liquid",
      category: "Dishwash",
      variant: "Lemon",
      sku: "DIS-LEM-1L-B2",
      pack_size: "1L",
      hsn_code: "34022090",
      base_price: 120,
      manufacturing_cost: 105,
      gst_rate: 18,
      reorder_threshold: 15,
      is_active: true,
      image_url: null,
      barcode: "8901001000002",
      mfg_date: "2026-03-01",
      exp_date: "2026-07-31",
      created_at: "2026-01-10T10:00:00.000Z",
      updated_at: "2026-01-10T10:00:00.000Z",
    },
    {
      id: P3,
      name: "Floor Cleaner",
      category: "Floor Cleaner",
      variant: "Pine",
      sku: "FLO-PIN-5L-C3",
      pack_size: "5L",
      hsn_code: "34025000",
      base_price: 350,
      gst_rate: 18,
      reorder_threshold: 10,
      is_active: true,
      image_url: null,
      barcode: null,
      mfg_date: "2025-12-01",
      exp_date: "2026-07-20",
      created_at: "2026-01-12T10:00:00.000Z",
      updated_at: "2026-01-12T10:00:00.000Z",
    },
    {
      id: P4,
      name: "Liquid Detergent",
      category: "Liquid Detergent",
      variant: "Fresh",
      sku: "DET-FRE-1L-D4",
      pack_size: "1L",
      hsn_code: "34022090",
      base_price: 175,
      gst_rate: 18,
      reorder_threshold: 25,
      is_active: true,
      image_url: null,
      barcode: null,
      created_at: "2026-01-15T10:00:00.000Z",
      updated_at: "2026-01-15T10:00:00.000Z",
    },
    {
      id: P5,
      name: "Handwash",
      category: "Handwash",
      variant: null,
      sku: "HANDWASH-1L-P5",
      pack_size: "1L",
      hsn_code: "34013000",
      base_price: 90,
      gst_rate: 18,
      reorder_threshold: 15,
      is_active: true,
      image_url: null,
      barcode: null,
      created_at: "2026-01-20T10:00:00.000Z",
      updated_at: "2026-01-20T10:00:00.000Z",
    },
    {
      id: P6,
      name: "Toilet Cleaner",
      category: "Toilet Cleaner",
      variant: null,
      sku: "TOILET-CLEANER-1L-P6",
      pack_size: "1L",
      hsn_code: "34013000",
      base_price: 85,
      gst_rate: 18,
      reorder_threshold: 12,
      is_active: true,
      image_url: null,
      barcode: null,
      created_at: "2026-01-20T10:00:00.000Z",
      updated_at: "2026-01-20T10:00:00.000Z",
    },
    {
      id: P7,
      name: "Car Wash",
      category: "Car Wash",
      variant: null,
      sku: "CAR-WASH-1L-P7",
      pack_size: "1L",
      hsn_code: "34025000",
      base_price: 140,
      gst_rate: 18,
      reorder_threshold: 10,
      is_active: true,
      image_url: null,
      barcode: null,
      created_at: "2026-01-20T10:00:00.000Z",
      updated_at: "2026-01-20T10:00:00.000Z",
    },
    {
      id: P8,
      name: "Dish Wash",
      category: "Dishwash",
      variant: null,
      sku: "DISH-WASH-1L-P8",
      pack_size: "1L",
      hsn_code: "34022090",
      base_price: 120,
      gst_rate: 18,
      reorder_threshold: 15,
      is_active: true,
      image_url: null,
      barcode: null,
      created_at: "2026-01-20T10:00:00.000Z",
      updated_at: "2026-01-20T10:00:00.000Z",
    },
    {
      id: P9,
      name: "Clothe Wash",
      category: "Liquid Detergent",
      variant: null,
      sku: "CLOTHE-WASH-1L-P9",
      pack_size: "1L",
      hsn_code: "34022090",
      base_price: 175,
      gst_rate: 18,
      reorder_threshold: 20,
      is_active: true,
      image_url: null,
      barcode: null,
      created_at: "2026-01-20T10:00:00.000Z",
      updated_at: "2026-01-20T10:00:00.000Z",
    },
    {
      id: P10,
      name: "Bathroom Cleaner",
      category: "Bathroom Cleaner",
      variant: null,
      sku: "BATHROOM-CLEANER-1L-P10",
      pack_size: "1L",
      hsn_code: "34029090",
      base_price: 90,
      gst_rate: 18,
      reorder_threshold: 12,
      is_active: true,
      image_url: null,
      barcode: null,
      created_at: "2026-01-20T10:00:00.000Z",
      updated_at: "2026-01-20T10:00:00.000Z",
    },
  ];

  const stock: Record<string, number> = {
    [P1]: 48,
    [P2]: 12, // low stock
    [P3]: 30,
    [P4]: 8, // low stock
    [P5]: 25,
    [P6]: 18,
    [P7]: 10,
    [P8]: 22,
    [P9]: 9,
    [P10]: 6,
  };

  const customers: Customer[] = [
    {
      id: C1,
      name: "Sharma Traders",
      phone: "9876543210",
      email: "sharma@example.com",
      billing_address: "12 MG Road, Ahmedabad",
      state: "Gujarat",
      gstin: "24ABCDE1234F1Z5",
      customer_type: "b2b",
      created_at: "2026-02-01T10:00:00.000Z",
    },
    {
      id: C2,
      name: "Walk-in Customer",
      phone: "9123456780",
      email: null,
      billing_address: "Mumbai",
      state: "Maharashtra",
      gstin: null,
      customer_type: "b2c",
      created_at: "2026-02-05T10:00:00.000Z",
    },
  ];

  const movements: StockMovement[] = [
    {
      id: id(),
      product_id: P1,
      movement_type: "in",
      quantity: 50,
      reference: "Production batch",
      reason: "Initial demo stock",
      batch_number: "BATCH-01",
      mfg_date: "2026-01-01",
      exp_date: "2027-01-01",
      created_by: DEMO_ADMIN.id,
      created_at: "2026-01-10T11:00:00.000Z",
      product: products[0],
      user: DEMO_ADMIN,
    },
    {
      id: id(),
      product_id: P2,
      movement_type: "in",
      quantity: 20,
      reference: "Purchase",
      reason: "Initial demo stock",
      batch_number: null,
      mfg_date: null,
      exp_date: null,
      created_by: DEMO_ADMIN.id,
      created_at: "2026-01-10T11:05:00.000Z",
      product: products[1],
      user: DEMO_ADMIN,
    },
  ];

  const organization: Organization = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Laiba Lubricants Pvt. Ltd.",
    slug: "aura-clean",
    gstin: "24AAAAA0000A1Z5",
    address: "Plot 12, GIDC Industrial Estate",
    state: "Gujarat",
    bank_details: "State Bank of India · A/c 12345678901 · IFSC SBIN0001234 · Ahmedabad Main",
    logo_url: null,
    plan: "business",
    subscription_status: "active",
    trial_ends_at: "2027-07-31T00:00:00.000Z",
    created_at: "2026-01-01T10:00:00.000Z",
    brand_name: "AasanBill",
    city: "Ahmedabad",
    pincode: "380015",
    phone: "+91 98765 43210",
    email: "billing@aasanbill.local",
    bank_name: "State Bank of India",
    bank_account: "12345678901",
    bank_ifsc: "SBIN0001234",
    bank_branch: "Ahmedabad Main",
    invoice_prefix: "AB",
    upi_id: "aura@upi",
    signature_url: null,
    updated_at: now(),
    razorpay_customer_id: null,
    razorpay_subscription_id: null,
    current_period_end: null,
    cancel_at_period_end: false,
    business_type: "general",
  };

  const company: CompanySettings = organizationToCompanySettings(organization);

  const warehouses: Warehouse[] = [
    {
      id: W1,
      name: "Main warehouse",
      code: "MAIN",
      address: null,
      is_default: true,
      is_active: true,
      created_at: "2026-01-01T10:00:00.000Z",
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: S1,
      name: "Gujarat Chem Distributors",
      phone: "9825012345",
      email: "orders@gujchem.example.com",
      gstin: "24AABCG1234H1Z2",
      address: "GIDC Vatva, Ahmedabad",
      state: "Gujarat",
      notes: "Primary raw material supplier",
      is_active: true,
      created_at: "2026-02-01T10:00:00.000Z",
    },
    {
      id: S2,
      name: "PackRight Packaging",
      phone: "9811122233",
      email: null,
      gstin: null,
      address: "Naroda Industrial Area",
      state: "Gujarat",
      notes: null,
      is_active: true,
      created_at: "2026-02-10T10:00:00.000Z",
    },
  ];

  return {
    products,
    stock,
    priceHistory: [],
    movements,
    customers,
    invoices: [],
    payments: [],
    company,
    organization,
    users: [DEMO_ADMIN],
    invoiceSeq: 0,
    purchaseSeq: 0,
    creditNoteSeq: 0,
    productCosts: [],
    otherExpenses: [],
    businessDataEntries: [
      {
        id: id(),
        company_person_name: "Local Chem Supplier",
        category: "product_purchase",
        item_name: "Handwash concentrate",
        expense_name: "July restock",
        payment_method: "upi",
        amount: 4500,
        note: "Bulk drum",
        entry_date: "2026-07-15",
        created_by: DEMO_ADMIN.id,
        created_at: "2026-07-15T10:00:00.000Z",
      },
      {
        id: id(),
        company_person_name: "GIDC Vendor",
        category: "product_purchase",
        item_name: "Floor cleaner base",
        expense_name: "Raw material buy",
        payment_method: "bank_transfer",
        amount: 12600,
        note: null,
        entry_date: "2026-07-05",
        created_by: DEMO_ADMIN.id,
        created_at: "2026-07-05T10:00:00.000Z",
      },
      {
        id: id(),
        company_person_name: "Landlord - Unit 12",
        category: "rent",
        item_name: "Factory shed",
        expense_name: "Unit rent - July",
        payment_method: "bank_transfer",
        amount: 18000,
        note: null,
        entry_date: "2026-07-01",
        created_by: DEMO_ADMIN.id,
        created_at: "2026-07-01T09:00:00.000Z",
      },
      {
        id: id(),
        company_person_name: "Staff payroll",
        category: "salary",
        item_name: "Weekly wages",
        expense_name: "Staff wages - week 1",
        payment_method: "upi",
        amount: 12000,
        note: null,
        entry_date: "2026-07-05",
        created_by: DEMO_ADMIN.id,
        created_at: "2026-07-05T09:00:00.000Z",
      },
      {
        id: id(),
        company_person_name: "Torrent Power",
        category: "utilities",
        item_name: "Electricity",
        expense_name: "Electricity bill",
        payment_method: "upi",
        amount: 3400,
        note: null,
        entry_date: "2026-07-12",
        created_by: DEMO_ADMIN.id,
        created_at: "2026-07-12T09:00:00.000Z",
      },
    ],
    warehouses,
    suppliers,
    purchases: [],
    creditNotes: [],
  };
}

const globalKey = "__aura_demo_store_v8__";

function getStore(): Store {
  const g = globalThis as unknown as Record<string, Store | undefined>;
  if (!g[globalKey]) g[globalKey] = seed();
  const s = g[globalKey]!;
  if (!s.productCosts) s.productCosts = [];
  if (!s.otherExpenses) s.otherExpenses = [];
  if (!s.businessDataEntries) s.businessDataEntries = [];
  if (!s.warehouses) {
    s.warehouses = [
      {
        id: W1,
        name: "Main warehouse",
        code: "MAIN",
        address: null,
        is_default: true,
        is_active: true,
        created_at: "2026-01-01T10:00:00.000Z",
      },
    ];
  }
  if (!s.suppliers) s.suppliers = [];
  if (!s.purchases) s.purchases = [];
  if (!s.creditNotes) s.creditNotes = [];
  if (s.purchaseSeq == null) s.purchaseSeq = 0;
  if (s.creditNoteSeq == null) s.creditNoteSeq = 0;
  if (s.company && s.company.upi_id === undefined) s.company.upi_id = "aura@upi";
  if (!s.organization) {
    s.organization = {
      id: s.company.id,
      name: s.company.company_name,
      slug: "aura-clean",
      gstin: s.company.gstin || null,
      address: s.company.address || null,
      state: s.company.state,
      bank_details: null,
      logo_url: null,
      plan: "business",
      subscription_status: "active" as const,
      trial_ends_at: "2027-07-31T00:00:00.000Z",
      created_at: "2026-01-01T10:00:00.000Z",
      brand_name: s.company.brand_name,
      city: s.company.city,
      pincode: s.company.pincode,
      phone: s.company.phone,
      email: s.company.email,
      bank_name: s.company.bank_name,
      bank_account: s.company.bank_account,
      bank_ifsc: s.company.bank_ifsc,
      bank_branch: s.company.bank_branch,
      invoice_prefix: s.company.invoice_prefix,
      upi_id: s.company.upi_id ?? "",
      updated_at: s.company.updated_at,
      razorpay_customer_id: null,
      razorpay_subscription_id: null,
      current_period_end: null,
      cancel_at_period_end: false,
      business_type: "general",
    };
    s.company = organizationToCompanySettings(s.organization);
  }
  if (!s.organization.business_type) {
    s.organization.business_type = "general";
    s.company = organizationToCompanySettings(s.organization);
  }
  if (!s.payments) s.payments = [];
  return s;
}

function withStock(p: Product): Product {
  return { ...p, current_stock: getStore().stock[p.id] ?? 0 };
}

export const demoDb = {
  getProducts(): Product[] {
    return getStore()
      .products.map(withStock)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  getProduct(productId: string): Product | null {
    const p = getStore().products.find((x) => x.id === productId);
    return p ? withStock(p) : null;
  },

  upsertProduct(payload: Partial<Product> & { name: string }): Product {
    const s = getStore();
    if (payload.id) {
      const idx = s.products.findIndex((p) => p.id === payload.id);
      if (idx < 0) throw new Error("Product not found");
      const old = s.products[idx];
      if (payload.base_price != null && payload.base_price !== old.base_price) {
        s.priceHistory.unshift({
          id: id(),
          product_id: old.id,
          old_price: old.base_price,
          new_price: payload.base_price,
          changed_by: DEMO_ADMIN.id,
          changed_at: now(),
        });
      }
      const rest = { ...payload } as Record<string, unknown>;
      delete rest.current_stock;
      delete rest.created_at;
      s.products[idx] = {
        ...old,
        ...(rest as Partial<Product>),
        updated_at: now(),
      };
      return withStock(s.products[idx]);
    }
    const product: Product = {
      id: id(),
      name: payload.name,
      category: payload.category ?? "Handwash",
      variant: payload.variant ?? null,
      sku: payload.sku ?? `SKU-${Date.now()}`,
      pack_size: payload.pack_size ?? "500ml",
      hsn_code: payload.hsn_code ?? "34013000",
      base_price: payload.base_price ?? 0,
      manufacturing_cost: payload.manufacturing_cost ?? null,
      gst_rate: payload.gst_rate ?? 18,
      reorder_threshold: payload.reorder_threshold ?? 10,
      is_active: payload.is_active ?? true,
      image_url: payload.image_url ?? null,
      barcode: payload.barcode ?? null,
      mfg_date: payload.mfg_date || null,
      exp_date: payload.exp_date || null,
      imei_serial: payload.imei_serial || null,
      batch_number: payload.batch_number || null,
      is_service: Boolean(payload.is_service),
      created_at: now(),
      updated_at: now(),
    };
    s.products.push(product);
    s.stock[product.id] = 0;
    return withStock(product);
  },

  deleteProduct(productId: string) {
    const s = getStore();
    s.products = s.products.filter((p) => p.id !== productId);
    delete s.stock[productId];
  },

  getPriceHistory(productId: string) {
    return getStore().priceHistory.filter((h) => h.product_id === productId);
  },

  getMovements(productId?: string): StockMovement[] {
    const s = getStore();
    return s.movements
      .filter((m) => !productId || m.product_id === productId)
      .map((m) => ({
        ...m,
        product: s.products.find((p) => p.id === m.product_id),
        user: s.users.find((u) => u.id === m.created_by) ?? DEMO_ADMIN,
        editor: m.edited_by
          ? s.users.find((u) => u.id === m.edited_by) ?? DEMO_ADMIN
          : undefined,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  updateMovement(input: {
    id: string;
    quantity: number;
    reason?: string | null;
    reference?: string | null;
    batch_number?: string | null;
    mfg_date?: string | null;
    exp_date?: string | null;
    edited_by: string;
  }) {
    const s = getStore();
    const m = s.movements.find((x) => x.id === input.id);
    if (!m) throw new Error("Movement not found");

    const oldQty = m.quantity;
    let nextQty = input.quantity;
    if (m.movement_type === "in") nextQty = Math.abs(input.quantity);
    if (m.movement_type === "out") nextQty = -Math.abs(input.quantity);

    s.stock[m.product_id] = (s.stock[m.product_id] ?? 0) - oldQty + nextQty;
    m.quantity = nextQty;
    if (input.reason !== undefined) m.reason = input.reason;
    if (input.reference !== undefined) m.reference = input.reference;
    if (input.batch_number !== undefined) m.batch_number = input.batch_number;
    if (input.mfg_date !== undefined) m.mfg_date = input.mfg_date;
    if (input.exp_date !== undefined) m.exp_date = input.exp_date;
    m.edited_at = now();
    m.edited_by = input.edited_by;
    return m;
  },

  stockIn(input: {
    product_id: string;
    quantity: number;
    source: "production" | "purchase";
    batch_number?: string | null;
    mfg_date?: string | null;
    exp_date?: string | null;
    notes?: string | null;
    user_id: string;
    warehouse_id?: string | null;
  }) {
    const s = getStore();
    s.stock[input.product_id] = (s.stock[input.product_id] ?? 0) + input.quantity;
    s.movements.unshift({
      id: id(),
      product_id: input.product_id,
      movement_type: "in",
      quantity: input.quantity,
      reference: input.source === "production" ? "Production batch" : "Purchase",
      reason: input.notes ?? null,
      batch_number: input.batch_number ?? null,
      mfg_date: input.mfg_date || null,
      exp_date: input.exp_date || null,
      created_by: input.user_id,
      created_at: now(),
      warehouse_id: input.warehouse_id ?? s.warehouses.find((w) => w.is_default)?.id ?? null,
    });
  },

  stockOut(input: {
    product_id: string;
    quantity: number;
    reason: string;
    notes?: string | null;
    user_id: string;
    warehouse_id?: string | null;
  }) {
    const s = getStore();
    const current = s.stock[input.product_id] ?? 0;
    if (current < input.quantity) throw new Error("Insufficient stock");
    s.stock[input.product_id] = current - input.quantity;
    s.movements.unshift({
      id: id(),
      product_id: input.product_id,
      movement_type: "out",
      quantity: -Math.abs(input.quantity),
      reference: "Manual out",
      reason: `${input.reason}${input.notes ? ` - ${input.notes}` : ""}`,
      batch_number: null,
      mfg_date: null,
      exp_date: null,
      created_by: input.user_id,
      created_at: now(),
      warehouse_id: input.warehouse_id ?? s.warehouses.find((w) => w.is_default)?.id ?? null,
    });
  },

  adjust(input: {
    product_id: string;
    new_quantity: number;
    reason: string;
    user_id: string;
    current_stock: number;
    warehouse_id?: string | null;
  }) {
    const delta = input.new_quantity - input.current_stock;
    if (delta === 0) return;
    const s = getStore();
    s.stock[input.product_id] = input.new_quantity;
    s.movements.unshift({
      id: id(),
      product_id: input.product_id,
      movement_type: "adjustment",
      quantity: delta,
      reference: "Physical stock count",
      reason: input.reason,
      batch_number: null,
      mfg_date: null,
      exp_date: null,
      created_by: input.user_id,
      created_at: now(),
      warehouse_id: input.warehouse_id ?? s.warehouses.find((w) => w.is_default)?.id ?? null,
    });
  },

  getCustomers(): Customer[] {
    return [...getStore().customers].sort((a, b) => a.name.localeCompare(b.name));
  },

  getCustomer(customerId: string): Customer | undefined {
    return getStore().customers.find((c) => c.id === customerId);
  },

  getPayments(customerId?: string): Payment[] {
    const all = getStore().payments;
    return customerId ? all.filter((p) => p.customer_id === customerId) : [...all];
  },

  recordPayment(input: {
    customer_id: string;
    invoice_id?: string | null;
    amount: number;
    payment_date: string;
    payment_mode: PaymentMode;
    notes?: string | null;
    user_id: string;
  }): Payment {
    const s = getStore();
    const customer = s.customers.find((c) => c.id === input.customer_id);
    if (!customer) throw new Error("Customer not found");
    if (input.amount <= 0) throw new Error("amount must be > 0");

    let invoice: Invoice | undefined;
    if (input.invoice_id) {
      invoice = s.invoices.find((i) => i.id === input.invoice_id);
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.customer_id !== input.customer_id) {
        throw new Error("Invoice does not belong to this customer");
      }
      if (invoice.status === "cancelled") {
        throw new Error("Cannot record payment on a cancelled invoice");
      }
    }

    const payment: Payment = {
      id: id(),
      customer_id: input.customer_id,
      invoice_id: input.invoice_id ?? null,
      amount: input.amount,
      payment_date: input.payment_date || today(),
      payment_mode: input.payment_mode,
      notes: input.notes ?? null,
      created_by: input.user_id,
      created_at: now(),
      invoice: invoice
        ? { invoice_number: invoice.invoice_number, grand_total: invoice.grand_total }
        : null,
      customer: { name: customer.name, phone: customer.phone },
    };
    s.payments.unshift(payment);

    if (invoice) {
      const newPaid = Math.min(
        invoice.grand_total,
        (invoice.amount_paid ?? 0) + input.amount
      );
      invoice.amount_paid = newPaid;
      invoice.status = invoiceStatusFromPaid(newPaid, invoice.grand_total);
    }

    return payment;
  },

  upsertCustomer(
    payload: Partial<Customer> & { name: string; state: string; customer_type: "b2b" | "b2c" }
  ): Customer {
    const s = getStore();
    if (payload.id) {
      const idx = s.customers.findIndex((c) => c.id === payload.id);
      if (idx < 0) throw new Error("Customer not found");
      const rest = { ...payload } as Record<string, unknown>;
      delete rest.created_at;
      s.customers[idx] = { ...s.customers[idx], ...(rest as Partial<Customer>) };
      return s.customers[idx];
    }
    const customer: Customer = {
      id: id(),
      name: payload.name,
      phone: payload.phone || null,
      email: payload.email || null,
      billing_address: payload.billing_address || null,
      state: payload.state,
      gstin: payload.gstin || null,
      customer_type: payload.customer_type,
      created_at: now(),
    };
    s.customers.push(customer);
    return customer;
  },

  deleteCustomer(customerId: string) {
    getStore().customers = getStore().customers.filter((c) => c.id !== customerId);
  },

  getInvoices(): Invoice[] {
    const s = getStore();
    return [...s.invoices]
      .map((inv) => ({
        ...inv,
        customer: s.customers.find((c) => c.id === inv.customer_id),
        creator: s.users.find((u) => u.id === inv.created_by) ?? DEMO_ADMIN,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  getInvoice(invoiceId: string): Invoice | null {
    const s = getStore();
    const inv = s.invoices.find((i) => i.id === invoiceId);
    if (!inv) return null;
    return {
      ...inv,
      customer: s.customers.find((c) => c.id === inv.customer_id),
      creator: s.users.find((u) => u.id === inv.created_by) ?? DEMO_ADMIN,
      items: (inv.items ?? []).map((it) => ({
        ...it,
        product: s.products.find((p) => p.id === it.product_id),
      })),
    };
  },

  createInvoice(payload: CreateInvoicePayload & { user_id: string; prefix: string }): Invoice {
    const s = getStore();
    const customer = s.customers.find((c) => c.id === payload.customer_id);
    if (!customer) throw new Error("Customer not found");

    for (const item of payload.items) {
      const product = s.products.find((p) => p.id === item.product_id);
      if (product?.is_service) continue;
      const stock = s.stock[item.product_id] ?? 0;
      if (stock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product?.name ?? "product"} (have ${stock}, need ${item.quantity})`
        );
      }
    }

    const lineInputs = payload.items.map((item) => {
      const product = s.products.find((p) => p.id === item.product_id)!;
      return {
        quantity: item.quantity,
        unitPrice: item.unit_price,
        gstRate: product.gst_rate,
      };
    });
    const totals = calcInvoiceTotals(lineInputs, customer.state);

    s.invoiceSeq += 1;
    const fy = getFinancialYear();
    const invoiceNumber = `${payload.prefix || "AB"}/${fy}/${String(s.invoiceSeq).padStart(4, "0")}`;

    const invoiceId = id();
    const items: InvoiceItem[] = payload.items.map((item, idx) => {
      const product = s.products.find((p) => p.id === item.product_id)!;
      const line = totals.lines[idx];
      return {
        id: id(),
        invoice_id: invoiceId,
        product_id: item.product_id,
        hsn_code: product.hsn_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        price_overridden: item.price_overridden,
        taxable_value: line.taxableValue,
        gst_rate: product.gst_rate,
        cgst_amount: line.cgstAmount,
        sgst_amount: line.sgstAmount,
        igst_amount: line.igstAmount,
        line_total: line.lineTotal,
        imei_serial: item.imei_serial ?? null,
        batch_number: item.batch_number ?? null,
        variant_tag: item.variant_tag ?? null,
        check_in_date: item.check_in_date ?? null,
        check_out_date: item.check_out_date ?? null,
        guest_id_proof: item.guest_id_proof ?? null,
        product,
      };
    });

    const invoice: Invoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      customer_id: payload.customer_id,
      invoice_date: payload.invoice_date || today(),
      subtotal: totals.subtotal,
      total_cgst: totals.totalCgst,
      total_sgst: totals.totalSgst,
      total_igst: totals.totalIgst,
      round_off: totals.roundOff,
      grand_total: totals.grandTotal,
      status: "issued",
      amount_paid: 0,
      cancelled_reason: null,
      notes: payload.notes ?? null,
      created_by: payload.user_id,
      created_at: now(),
      warehouse_id: payload.warehouse_id ?? null,
      customer,
      creator: DEMO_ADMIN,
      items,
    };

    s.invoices.unshift(invoice);

    for (const item of payload.items) {
      const product = s.products.find((p) => p.id === item.product_id);
      if (product?.is_service) continue;
      s.stock[item.product_id] = (s.stock[item.product_id] ?? 0) - item.quantity;
      s.movements.unshift({
        id: id(),
        product_id: item.product_id,
        movement_type: "out",
        quantity: -Math.abs(item.quantity),
        reference: invoiceNumber,
        reason: `Invoice ${invoiceNumber}`,
        batch_number: null,
        mfg_date: null,
        exp_date: null,
        created_by: payload.user_id,
        created_at: now(),
        warehouse_id: payload.warehouse_id ?? null,
      });
    }

    return invoice;
  },

  updateInvoice(
    invoiceId: string,
    payload: CreateInvoicePayload & { user_id: string; force?: boolean }
  ): Invoice {
    const s = getStore();
    const inv = s.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error("Invoice not found");

    if (inv.status !== "issued" && !payload.force) {
      throw new Error(`Only issued invoices can be edited (status=${inv.status})`);
    }

    const customer = s.customers.find((c) => c.id === payload.customer_id);
    if (!customer) throw new Error("Customer not found");

    // Reverse old invoice stock movements (outs + any void restores)
    for (const item of inv.items ?? []) {
      const product = s.products.find((p) => p.id === item.product_id);
      if (product?.is_service) continue;
      s.stock[item.product_id] = (s.stock[item.product_id] ?? 0) + item.quantity;
    }
    s.movements = s.movements.filter((m) => {
      if (m.reference !== inv.invoice_number) return true;
      const reason = m.reason ?? "";
      if (m.movement_type === "out" && reason.startsWith("Invoice ")) return false;
      if (m.movement_type === "in" && reason.startsWith("Void restore")) {
        // undo restore effect on stock if still present
        s.stock[m.product_id] = (s.stock[m.product_id] ?? 0) - Math.abs(m.quantity);
        return false;
      }
      return true;
    });

    for (const item of payload.items) {
      const product = s.products.find((p) => p.id === item.product_id);
      if (product?.is_service) continue;
      const stock = s.stock[item.product_id] ?? 0;
      if (stock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product?.name ?? "product"} (have ${stock}, need ${item.quantity})`
        );
      }
    }

    const lineInputs = payload.items.map((item) => {
      const product = s.products.find((p) => p.id === item.product_id)!;
      return {
        quantity: item.quantity,
        unitPrice: item.unit_price,
        gstRate: product.gst_rate,
      };
    });
    const totals = calcInvoiceTotals(lineInputs, customer.state);

    const items: InvoiceItem[] = payload.items.map((item, idx) => {
      const product = s.products.find((p) => p.id === item.product_id)!;
      const line = totals.lines[idx];
      return {
        id: id(),
        invoice_id: inv.id,
        product_id: item.product_id,
        hsn_code: product.hsn_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        price_overridden: item.price_overridden,
        taxable_value: line.taxableValue,
        gst_rate: product.gst_rate,
        cgst_amount: line.cgstAmount,
        sgst_amount: line.sgstAmount,
        igst_amount: line.igstAmount,
        line_total: line.lineTotal,
        imei_serial: item.imei_serial ?? null,
        batch_number: item.batch_number ?? null,
        variant_tag: item.variant_tag ?? null,
        check_in_date: item.check_in_date ?? null,
        check_out_date: item.check_out_date ?? null,
        guest_id_proof: item.guest_id_proof ?? null,
        product,
      };
    });

    inv.customer_id = payload.customer_id;
    inv.invoice_date = payload.invoice_date || inv.invoice_date;
    inv.subtotal = totals.subtotal;
    inv.total_cgst = totals.totalCgst;
    inv.total_sgst = totals.totalSgst;
    inv.total_igst = totals.totalIgst;
    inv.round_off = totals.roundOff;
    inv.grand_total = totals.grandTotal;
    inv.notes = payload.notes ?? null;
    inv.edited_at = now();
    inv.edited_by = payload.user_id;
    inv.items = items;
    inv.customer = customer;
    if (payload.warehouse_id !== undefined) {
      inv.warehouse_id = payload.warehouse_id ?? null;
    }

    for (const item of payload.items) {
      const product = s.products.find((p) => p.id === item.product_id);
      if (product?.is_service) continue;
      s.stock[item.product_id] = (s.stock[item.product_id] ?? 0) - item.quantity;
      s.movements.unshift({
        id: id(),
        product_id: item.product_id,
        movement_type: "out",
        quantity: -Math.abs(item.quantity),
        reference: inv.invoice_number,
        reason: `Invoice ${inv.invoice_number}`,
        batch_number: null,
        mfg_date: null,
        exp_date: null,
        created_by: payload.user_id,
        created_at: now(),
        warehouse_id: inv.warehouse_id ?? null,
      });
    }

    return this.getInvoice(invoiceId)!;
  },

  updateInvoiceStatus(input: {
    id: string;
    status: "issued" | "paid" | "partially_paid" | "cancelled";
    cancelled_reason?: string;
    user_id: string;
    restoreStock?: boolean;
  }) {
    const s = getStore();
    const inv = s.invoices.find((i) => i.id === input.id);
    if (!inv) throw new Error("Invoice not found");
    if (inv.status === "cancelled") throw new Error("Invoice is already cancelled");

    if (input.status === "paid") {
      const remaining = Math.max(0, inv.grand_total - (inv.amount_paid ?? 0));
      if (remaining > 0) {
        this.recordPayment({
          customer_id: inv.customer_id,
          invoice_id: inv.id,
          amount: remaining,
          payment_date: today(),
          payment_mode: "cash",
          notes: "Marked paid",
          user_id: input.user_id,
        });
        return;
      }
      inv.amount_paid = inv.grand_total;
    }

    inv.status = input.status;
    inv.cancelled_reason =
      input.status === "cancelled" ? input.cancelled_reason ?? null : null;

    if (input.status === "cancelled" && input.restoreStock) {
      for (const item of inv.items ?? []) {
        s.stock[item.product_id] = (s.stock[item.product_id] ?? 0) + item.quantity;
        s.movements.unshift({
          id: id(),
          product_id: item.product_id,
          movement_type: "in",
          quantity: Math.abs(item.quantity),
          reference: inv.invoice_number,
          reason: `Void restore - ${input.cancelled_reason ?? ""}`,
          batch_number: null,
          mfg_date: null,
          exp_date: null,
          created_by: input.user_id,
          created_at: now(),
          warehouse_id: inv.warehouse_id ?? null,
        });
      }
    }
  },

  getWarehouses(): Warehouse[] {
    return [...getStore().warehouses].sort((a, b) => a.name.localeCompare(b.name));
  },

  upsertWarehouse(payload: Partial<Warehouse> & { name: string; code: string }): Warehouse {
    const s = getStore();
    if (payload.is_default) {
      for (const w of s.warehouses) {
        if (w.id !== payload.id) w.is_default = false;
      }
    }
    if (payload.id) {
      const idx = s.warehouses.findIndex((w) => w.id === payload.id);
      if (idx < 0) throw new Error("Warehouse not found");
      const rest = { ...payload } as Record<string, unknown>;
      delete rest.created_at;
      s.warehouses[idx] = { ...s.warehouses[idx], ...(rest as Partial<Warehouse>) };
      return s.warehouses[idx];
    }
    const warehouse: Warehouse = {
      id: id(),
      name: payload.name,
      code: payload.code,
      address: payload.address ?? null,
      is_default: payload.is_default ?? false,
      is_active: payload.is_active ?? true,
      created_at: now(),
    };
    s.warehouses.push(warehouse);
    return warehouse;
  },

  getSuppliers(): Supplier[] {
    return [...getStore().suppliers].sort((a, b) => a.name.localeCompare(b.name));
  },

  upsertSupplier(payload: Partial<Supplier> & { name: string }): Supplier {
    const s = getStore();
    if (payload.id) {
      const idx = s.suppliers.findIndex((x) => x.id === payload.id);
      if (idx < 0) throw new Error("Supplier not found");
      const rest = { ...payload } as Record<string, unknown>;
      delete rest.created_at;
      s.suppliers[idx] = { ...s.suppliers[idx], ...(rest as Partial<Supplier>) };
      return s.suppliers[idx];
    }
    const supplier: Supplier = {
      id: id(),
      name: payload.name,
      phone: payload.phone || null,
      email: payload.email || null,
      gstin: payload.gstin || null,
      address: payload.address || null,
      state: payload.state || "Gujarat",
      notes: payload.notes || null,
      is_active: payload.is_active ?? true,
      created_at: now(),
    };
    s.suppliers.push(supplier);
    return supplier;
  },

  removeSupplier(supplierId: string) {
    getStore().suppliers = getStore().suppliers.filter((x) => x.id !== supplierId);
  },

  getPurchases(): Purchase[] {
    const s = getStore();
    return [...s.purchases]
      .map((p) => ({
        ...p,
        supplier: s.suppliers.find((x) => x.id === p.supplier_id),
        warehouse: p.warehouse_id
          ? s.warehouses.find((w) => w.id === p.warehouse_id)
          : undefined,
        items: (p.items ?? []).map((it) => ({
          ...it,
          product: s.products.find((pr) => pr.id === it.product_id),
        })),
      }))
      .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
  },

  createPurchase(payload: {
    supplier_id: string;
    warehouse_id?: string | null;
    purchase_date: string;
    notes?: string;
    user_id: string;
    items: {
      product_id: string;
      quantity: number;
      unit_cost: number;
      batch_number?: string | null;
      mfg_date?: string | null;
      exp_date?: string | null;
    }[];
  }): Purchase {
    const s = getStore();
    const supplier = s.suppliers.find((x) => x.id === payload.supplier_id);
    if (!supplier) throw new Error("Supplier not found");

    for (const item of payload.items) {
      const product = s.products.find((p) => p.id === item.product_id);
      if (!product) throw new Error("Product not found");
    }

    const lineInputs = payload.items.map((item) => {
      const product = s.products.find((p) => p.id === item.product_id)!;
      return {
        quantity: item.quantity,
        unitPrice: item.unit_cost,
        gstRate: product.gst_rate,
      };
    });
    const totals = calcInvoiceTotals(lineInputs, supplier.state);

    s.purchaseSeq += 1;
    const fy = getFinancialYear();
    const purchaseNumber = `PO/${fy}/${String(s.purchaseSeq).padStart(4, "0")}`;
    const purchaseId = id();
    const warehouseId = payload.warehouse_id || null;

    const items: PurchaseItem[] = payload.items.map((item, idx) => {
      const product = s.products.find((p) => p.id === item.product_id)!;
      const line = totals.lines[idx];
      return {
        id: id(),
        purchase_id: purchaseId,
        product_id: item.product_id,
        hsn_code: product.hsn_code,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        taxable_value: line.taxableValue,
        gst_rate: product.gst_rate,
        cgst_amount: line.cgstAmount,
        sgst_amount: line.sgstAmount,
        igst_amount: line.igstAmount,
        line_total: line.lineTotal,
        batch_number: item.batch_number || null,
        mfg_date: item.mfg_date || null,
        exp_date: item.exp_date || null,
        product,
      };
    });

    const purchase: Purchase = {
      id: purchaseId,
      purchase_number: purchaseNumber,
      supplier_id: payload.supplier_id,
      warehouse_id: warehouseId,
      purchase_date: payload.purchase_date || today(),
      subtotal: totals.subtotal,
      total_cgst: totals.totalCgst,
      total_sgst: totals.totalSgst,
      total_igst: totals.totalIgst,
      round_off: totals.roundOff,
      grand_total: totals.grandTotal,
      status: "received",
      notes: payload.notes || null,
      created_by: payload.user_id,
      created_at: now(),
      supplier,
      warehouse: warehouseId
        ? s.warehouses.find((w) => w.id === warehouseId)
        : undefined,
      items,
    };

    s.purchases.unshift(purchase);

    for (const item of payload.items) {
      s.stock[item.product_id] = (s.stock[item.product_id] ?? 0) + item.quantity;
      s.movements.unshift({
        id: id(),
        product_id: item.product_id,
        movement_type: "in",
        quantity: Math.abs(item.quantity),
        reference: purchaseNumber,
        reason: `Purchase ${purchaseNumber}`,
        batch_number: item.batch_number || null,
        mfg_date: item.mfg_date || null,
        exp_date: item.exp_date || null,
        created_by: payload.user_id,
        created_at: now(),
        warehouse_id: warehouseId,
      });
    }

    return purchase;
  },

  getCreditNotes(): CreditNote[] {
    const s = getStore();
    return [...s.creditNotes]
      .map((cn) => ({
        ...cn,
        customer: s.customers.find((c) => c.id === cn.customer_id),
        invoice: s.invoices.find((i) => i.id === cn.invoice_id),
        items: (cn.items ?? []).map((it) => ({
          ...it,
          product: s.products.find((p) => p.id === it.product_id),
        })),
      }))
      .sort((a, b) => b.credit_date.localeCompare(a.credit_date));
  },

  createCreditNote(payload: {
    invoice_id: string;
    credit_date: string;
    reason?: string;
    user_id: string;
    items: {
      product_id: string;
      quantity: number;
      unit_price: number;
    }[];
  }): CreditNote {
    const s = getStore();
    const inv = s.invoices.find((i) => i.id === payload.invoice_id);
    if (!inv) throw new Error("Invoice not found");
    if (inv.status === "cancelled") {
      throw new Error("Cannot credit a cancelled invoice");
    }

    const invItems = inv.items ?? [];
    for (const item of payload.items) {
      const orig = invItems.find((i) => i.product_id === item.product_id);
      if (!orig) throw new Error("Product not on original invoice");
      if (item.quantity > orig.quantity) {
        throw new Error(
          `Return qty for ${orig.product?.name ?? "product"} exceeds invoiced qty`
        );
      }
    }

    const customer = s.customers.find((c) => c.id === inv.customer_id);
    const lineInputs = payload.items.map((item) => {
      const orig = invItems.find((i) => i.product_id === item.product_id)!;
      return {
        quantity: item.quantity,
        unitPrice: item.unit_price,
        gstRate: orig.gst_rate,
      };
    });
    const totals = calcInvoiceTotals(lineInputs, customer?.state ?? "Gujarat");

    s.creditNoteSeq += 1;
    const fy = getFinancialYear();
    const cnNumber = `CN/${fy}/${String(s.creditNoteSeq).padStart(4, "0")}`;
    const cnId = id();

    const items: CreditNoteItem[] = payload.items.map((item, idx) => {
      const orig = invItems.find((i) => i.product_id === item.product_id)!;
      const line = totals.lines[idx];
      return {
        id: id(),
        credit_note_id: cnId,
        product_id: item.product_id,
        hsn_code: orig.hsn_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        taxable_value: line.taxableValue,
        gst_rate: orig.gst_rate,
        cgst_amount: line.cgstAmount,
        sgst_amount: line.sgstAmount,
        igst_amount: line.igstAmount,
        line_total: line.lineTotal,
        product: s.products.find((p) => p.id === item.product_id),
      };
    });

    const cn: CreditNote = {
      id: cnId,
      credit_note_number: cnNumber,
      invoice_id: inv.id,
      customer_id: inv.customer_id,
      warehouse_id: inv.warehouse_id ?? null,
      credit_date: payload.credit_date || today(),
      subtotal: totals.subtotal,
      total_cgst: totals.totalCgst,
      total_sgst: totals.totalSgst,
      total_igst: totals.totalIgst,
      round_off: totals.roundOff,
      grand_total: totals.grandTotal,
      reason: payload.reason || null,
      status: "issued",
      created_by: payload.user_id,
      created_at: now(),
      invoice: inv,
      customer,
      items,
    };

    s.creditNotes.unshift(cn);

    for (const item of payload.items) {
      s.stock[item.product_id] = (s.stock[item.product_id] ?? 0) + item.quantity;
      s.movements.unshift({
        id: id(),
        product_id: item.product_id,
        movement_type: "in",
        quantity: Math.abs(item.quantity),
        reference: cnNumber,
        reason: `Credit note ${cnNumber} (return)`,
        batch_number: null,
        mfg_date: null,
        exp_date: null,
        created_by: payload.user_id,
        created_at: now(),
        warehouse_id: inv.warehouse_id ?? null,
      });
    }

    return cn;
  },

  getCompany(): CompanySettings {
    return organizationToCompanySettings(getStore().organization);
  },

  updateCompany(payload: Partial<CompanySettings> & { id: string }): CompanySettings {
    const org = this.updateOrganization({
      id: payload.id,
      ...companySettingsToOrganizationPatch(payload),
    });
    return organizationToCompanySettings(org);
  },

  getOrganization(): Organization {
    return { ...getStore().organization };
  },

  updateOrganization(payload: Partial<Organization> & { id: string }): Organization {
    const s = getStore();
    s.organization = { ...s.organization, ...payload, updated_at: now() };
    s.company = organizationToCompanySettings(s.organization);
    return { ...s.organization };
  },

  getUsers(): AppUser[] {
    return [...getStore().users];
  },

  getProductCosts(productId?: string): ProductCost[] {
    const s = getStore();
    return s.productCosts
      .filter((c) => !productId || c.product_id === productId)
      .map((c) => ({
        ...c,
        cost_price: Number(c.cost_price),
        product: s.products.find((p) => p.id === c.product_id),
      }))
      .sort((a, b) => {
        const d = b.purchase_date.localeCompare(a.purchase_date);
        if (d !== 0) return d;
        return b.created_at.localeCompare(a.created_at);
      });
  },

  getBusinessDataEntries(opts: {
    section: "product_costs" | "other_expenses";
    from?: string;
    to?: string;
  }): BusinessDataEntry[] {
    return getStore()
      .businessDataEntries
      .filter((e) => {
        if (opts.section === "product_costs") {
          if (e.category !== "product_purchase") return false;
        } else if (e.category === "product_purchase") {
          return false;
        }
        if (opts.from && e.entry_date < opts.from) return false;
        if (opts.to && e.entry_date > opts.to) return false;
        return true;
      })
      .map((e) => ({ ...e, amount: Number(e.amount) }))
      .sort((a, b) => {
        const d = b.entry_date.localeCompare(a.entry_date);
        return d !== 0 ? d : b.created_at.localeCompare(a.created_at);
      });
  },

  addBusinessDataEntry(input: {
    company_person_name: string;
    category: BusinessDataCategory;
    item_name: string;
    expense_name: string;
    payment_method: PaymentMode;
    amount: number;
    note?: string | null;
    entry_date: string;
    created_by: string;
  }): BusinessDataEntry {
    const s = getStore();
    const row: BusinessDataEntry = {
      id: id(),
      company_person_name: input.company_person_name.trim(),
      category: input.category,
      item_name: input.item_name.trim(),
      expense_name: input.expense_name.trim(),
      payment_method: input.payment_method,
      amount: Number(input.amount),
      note: input.note?.trim() || null,
      entry_date: input.entry_date,
      created_by: input.created_by,
      created_at: now(),
    };
    s.businessDataEntries.unshift(row);
    return { ...row };
  },

  updateBusinessDataEntry(
    payload: Partial<BusinessDataEntry> & { id: string }
  ): BusinessDataEntry {
    const s = getStore();
    const idx = s.businessDataEntries.findIndex((e) => e.id === payload.id);
    if (idx < 0) throw new Error("Entry not found");
    const rest = { ...payload } as Record<string, unknown>;
    delete rest.id;
    delete rest.created_at;
    delete rest.created_by;
    const patch = rest as Partial<BusinessDataEntry>;
    s.businessDataEntries[idx] = {
      ...s.businessDataEntries[idx],
      ...patch,
      amount:
        patch.amount != null
          ? Number(patch.amount)
          : s.businessDataEntries[idx].amount,
      company_person_name:
        patch.company_person_name != null
          ? patch.company_person_name.trim()
          : s.businessDataEntries[idx].company_person_name,
      item_name:
        patch.item_name != null
          ? patch.item_name.trim()
          : s.businessDataEntries[idx].item_name,
      expense_name:
        patch.expense_name != null
          ? patch.expense_name.trim()
          : s.businessDataEntries[idx].expense_name,
      note:
        patch.note !== undefined
          ? patch.note?.trim() || null
          : s.businessDataEntries[idx].note,
    };
    return { ...s.businessDataEntries[idx] };
  },

  deleteBusinessDataEntry(entryId: string) {
    const s = getStore();
    s.businessDataEntries = s.businessDataEntries.filter((e) => e.id !== entryId);
  },
};
