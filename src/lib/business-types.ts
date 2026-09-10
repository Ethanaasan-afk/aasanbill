/**
 * Business-type configuration layer.
 * Vertical-specific labels, categories, and product-form field whitelist.
 * Same core engine - only small conditional fields/labels change.
 */

export const BUSINESS_TYPES = [
  "grocery",
  "mobile_shop",
  "pharmacy",
  "cloth_shop",
  "service_freelancer",
  "jewellery",
  "hotel",
  "general",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** New orgs and unmigrated rows resolve here - no vertical extras. */
export const DEFAULT_BUSINESS_TYPE: BusinessType = "general";

/** Legacy DB / localStorage keys → current ids. */
const LEGACY_BUSINESS_TYPE_MAP: Record<string, BusinessType> = {
  grocery_kirana: "general",
  general_store: "general",
  manufacturer_trader: "general",
  cloth_shop_lite: "cloth_shop",
  freelancer: "service_freelancer",
  grocery: "grocery",
  mobile_shop: "mobile_shop",
  pharmacy: "pharmacy",
  cloth_shop: "cloth_shop",
  service_freelancer: "service_freelancer",
  jewellery: "jewellery",
  hotel: "hotel",
  general: "general",
};

/** Every field that can appear on the product add/edit form (single inventory). */
export const PRODUCT_FORM_FIELDS = [
  "name",
  "category",
  "variant",
  "sku",
  "barcode",
  "pack_size",
  "batch_number",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "gst_rate",
  "reorder_threshold",
  "mfg_date",
  "exp_date",
  "is_service",
  "is_active",
] as const;

export type ProductFormFieldId = (typeof PRODUCT_FORM_FIELDS)[number];

/** Legacy grocery/cleaning catalog (kept as the grocery baseline). */
export const GROCERY_CATEGORIES = [
  "Dishwash",
  "Handwash",
  "Toilet Cleaner",
  "Bathroom Cleaner",
  "Floor Cleaner",
  "Car Wash",
  "Liquid Detergent",
] as const;

export type BusinessLabels = {
  product: string;
  productPlural: string;
  addProduct: string;
  editProduct: string;
  searchProduct: string;
  productName: string;
  stock: string;
  quantity: string;
  variant: string;
  packSize: string;
  reorderThreshold: string;
  lineImeiSerial: string;
  lineBatchNumber: string;
  lineVariantTag: string;
  productBatchNumber: string;
  serviceToggle: string;
  lineCheckInDate: string;
  lineCheckOutDate: string;
  lineGuestIdProof: string;
};

/** Invoice-line optional fields (not the product catalog form). */
export type InvoiceLineFields = {
  lineImeiSerial: boolean;
  lineBatchNumber: boolean;
  lineVariantTag: boolean;
  /** Weight × daily metal rate pricing (jewellery only). */
  jewelleryPricing: boolean;
  /** Guest stay folio fields: check-in/out dates + ID proof (hotel only). */
  hotelStay: boolean;
};

export type BusinessTypeConfig = {
  id: BusinessType;
  label: string;
  description: string;
  labels: BusinessLabels;
  categories: readonly string[];
  /** Sole source of truth for product form visibility */
  productFormFields: readonly ProductFormFieldId[];
  /** Invoice line extras */
  invoiceLineFields: InvoiceLineFields;
};

const BASE_LABELS: BusinessLabels = {
  product: "Product",
  productPlural: "Products",
  addProduct: "Add product",
  editProduct: "Edit product",
  searchProduct: "Search product…",
  productName: "Product name",
  stock: "Stock",
  quantity: "Qty",
  variant: "Variant",
  packSize: "Pack size",
  reorderThreshold: "Reorder threshold",
  lineImeiSerial: "IMEI / Serial Number",
  lineBatchNumber: "Batch number",
  lineVariantTag: "Size / Color",
  productBatchNumber: "Batch number",
  serviceToggle: "This is a service (no stock tracking)",
  lineCheckInDate: "Check-in date",
  lineCheckOutDate: "Check-out date",
  lineGuestIdProof: "Guest ID proof number",
};

/** Grocery - same core catalog fields as before (pack size, dates). */
const GROCERY_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "variant",
  "sku",
  "barcode",
  "pack_size",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "gst_rate",
  "reorder_threshold",
  "mfg_date",
  "exp_date",
  "is_active",
];

/** General - no vertical extras; standard retail catalog. */
const GENERAL_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "variant",
  "sku",
  "barcode",
  "pack_size",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "gst_rate",
  "reorder_threshold",
  "is_active",
];

/** Mobile - IMEI lives on invoice lines only, not the product catalog. */
const MOBILE_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "variant",
  "sku",
  "barcode",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "gst_rate",
  "reorder_threshold",
  "is_active",
];

const PHARMACY_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "variant",
  "sku",
  "barcode",
  "pack_size",
  "batch_number",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "gst_rate",
  "reorder_threshold",
  "mfg_date",
  "exp_date",
  "is_active",
];

const CLOTH_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "variant",
  "sku",
  "barcode",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "gst_rate",
  "reorder_threshold",
  "is_active",
];

const SERVICE_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "sku",
  "hsn_code",
  "base_price",
  "gst_rate",
  "reorder_threshold",
  "is_service",
  "is_active",
];

/** Jewellery - fixed base_price replaced by weight × daily metal rate engine. */
const JEWELLERY_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "sku",
  "barcode",
  "hsn_code",
  "gst_rate",
  "reorder_threshold",
  "is_active",
];

/** Hotel - room types via dedicated table; product form unused for hotel catalog. */
const HOTEL_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "hsn_code",
  "base_price",
  "gst_rate",
  "is_active",
];

const MOBILE_CATEGORIES = [
  "Smartphones",
  "Feature Phones",
  "Chargers & Cables",
  "Earphones/Headphones",
  "Cases & Covers",
  "Screen Guards",
  "Power Banks",
  "Memory Cards",
  "Other Accessories",
] as const;

const PHARMACY_CATEGORIES = [
  "Tablets",
  "Syrups",
  "Injectables",
  "OTC / General",
  "Surgical / Consumables",
  "Personal Care",
  "Other",
] as const;

const CLOTH_CATEGORIES = [
  "Men",
  "Women",
  "Kids",
  "Ethnic Wear",
  "Western Wear",
  "Accessories",
  "Other",
] as const;

const SERVICE_CATEGORIES = [
  "Consulting",
  "Design",
  "Development",
  "Writing / Content",
  "Marketing",
  "Training",
  "Retainers",
  "Other",
] as const;

const GENERAL_CATEGORIES = [
  "Stationery",
  "Household",
  "Snacks / Packaged Food",
  "Beverages",
  "Personal Care",
  "Electronics Accessories",
  "Other",
  ...GROCERY_CATEGORIES,
] as const;

const HOTEL_CATEGORIES = [
  "Standard Room",
  "Deluxe Room",
  "Suite",
  "Dormitory / Shared",
  "Extra Bed",
  "Amenities / Add-on",
  "Other",
] as const;

function cfg(
  id: BusinessType,
  label: string,
  description: string,
  overrides: {
    labels?: Partial<BusinessLabels>;
    categories?: readonly string[];
    productFormFields: readonly ProductFormFieldId[];
    invoiceLineFields?: Partial<InvoiceLineFields>;
  }
): BusinessTypeConfig {
  return {
    id,
    label,
    description,
    labels: { ...BASE_LABELS, ...overrides.labels },
    categories: overrides.categories ?? GROCERY_CATEGORIES,
    productFormFields: overrides.productFormFields,
    invoiceLineFields: {
      lineImeiSerial: false,
      lineBatchNumber: false,
      lineVariantTag: false,
      jewelleryPricing: false,
      hotelStay: false,
      ...overrides.invoiceLineFields,
    },
  };
}

export const BUSINESS_TYPE_CONFIG: Record<BusinessType, BusinessTypeConfig> = {
  grocery: cfg(
    "grocery",
    "Grocery / Kirana Store",
    "Everyday retail - stock, billing, and expiry dates.",
    {
      categories: GROCERY_CATEGORIES,
      productFormFields: GROCERY_PRODUCT_FIELDS,
    }
  ),
  mobile_shop: cfg(
    "mobile_shop",
    "Mobile / Electronics Shop",
    "Phones and accessories - IMEI/serial captured per invoice line.",
    {
      categories: MOBILE_CATEGORIES,
      productFormFields: MOBILE_PRODUCT_FIELDS,
      invoiceLineFields: { lineImeiSerial: true },
    }
  ),
  pharmacy: cfg(
    "pharmacy",
    "Pharmacy / Medical Store",
    "Medicines - batch and expiry on products; batch on invoice lines.",
    {
      categories: PHARMACY_CATEGORIES,
      productFormFields: PHARMACY_PRODUCT_FIELDS,
      invoiceLineFields: { lineBatchNumber: true },
    }
  ),
  cloth_shop: cfg(
    "cloth_shop",
    "Clothing Shop",
    "Apparel - free-text Size / Color tag on products and invoice lines.",
    {
      categories: CLOTH_CATEGORIES,
      productFormFields: CLOTH_PRODUCT_FIELDS,
      invoiceLineFields: { lineVariantTag: true },
      labels: {
        variant: "Size / Color",
        lineVariantTag: "Size / Color",
      },
    }
  ),
  service_freelancer: cfg(
    "service_freelancer",
    "Freelancer / Service Business",
    "Services billing - optional stock tracking per item.",
    {
      categories: SERVICE_CATEGORIES,
      productFormFields: SERVICE_PRODUCT_FIELDS,
      labels: {
        product: "Product / Service",
        productPlural: "Products / Services",
        addProduct: "Add product / service",
        editProduct: "Edit product / service",
        searchProduct: "Search products / services…",
        productName: "Name",
        stock: "Availability",
        quantity: "Qty / units",
        reorderThreshold: "Reorder threshold (stocked items)",
      },
    }
  ),
  jewellery: cfg(
    "jewellery",
    "Jewellery Shop",
    "Gold/silver weight × daily rates, making charges, and HUID - separate from fixed-price billing.",
    {
      categories: [
        "Ring",
        "Necklace",
        "Bangle",
        "Chain",
        "Earring",
        "Bracelet",
        "Coin",
        "Other",
      ],
      productFormFields: JEWELLERY_PRODUCT_FIELDS,
      invoiceLineFields: { jewelleryPricing: true },
      labels: {
        product: "Ornament",
        productPlural: "Ornaments",
        addProduct: "Add ornament",
        editProduct: "Edit ornament",
        searchProduct: "Search ornaments…",
        productName: "Ornament name",
        stock: "Pieces in stock",
        quantity: "Pieces",
      },
    }
  ),
  hotel: cfg(
    "hotel",
    "Hotel / Guest House",
    "Guest folio billing with room types, physical rooms, and date-based bookings.",
    {
      categories: HOTEL_CATEGORIES,
      productFormFields: HOTEL_PRODUCT_FIELDS,
      invoiceLineFields: { hotelStay: true },
      labels: {
        product: "Room type",
        productPlural: "Room Types",
        addProduct: "Add room type",
        editProduct: "Edit room type",
        searchProduct: "Search room types…",
        productName: "Room type name",
        stock: "Availability",
        quantity: "Nights",
        lineCheckInDate: "Check-in date",
        lineCheckOutDate: "Check-out date",
        lineGuestIdProof: "Guest ID proof number",
      },
    }
  ),
  general: cfg(
    "general",
    "Other / General",
    "Standard billing and inventory - no vertical-specific fields.",
    {
      categories: GENERAL_CATEGORIES,
      productFormFields: GENERAL_PRODUCT_FIELDS,
    }
  ),
};

export const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES.map((id) => ({
  value: id,
  label: BUSINESS_TYPE_CONFIG[id].label,
  description: BUSINESS_TYPE_CONFIG[id].description,
}));

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && (BUSINESS_TYPES as readonly string[]).includes(value);
}

export function normalizeBusinessType(value: unknown): BusinessType {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_BUSINESS_TYPE;
  const mapped = LEGACY_BUSINESS_TYPE_MAP[value.trim()];
  return mapped ?? DEFAULT_BUSINESS_TYPE;
}

export function getBusinessTypeConfig(type: unknown): BusinessTypeConfig {
  return BUSINESS_TYPE_CONFIG[normalizeBusinessType(type)];
}

export function businessTypeLabel(type: unknown): string {
  return getBusinessTypeConfig(type).label;
}

export function categoriesForBusinessType(type: unknown): readonly string[] {
  return getBusinessTypeConfig(type).categories;
}

export function productFormFieldSet(type: unknown): Set<ProductFormFieldId> {
  return new Set(getBusinessTypeConfig(type).productFormFields);
}

export function showsProductFormField(type: unknown, field: ProductFormFieldId): boolean {
  return productFormFieldSet(type).has(field);
}

export function getInvoiceLineFields(type: unknown): InvoiceLineFields {
  return getBusinessTypeConfig(type).invoiceLineFields;
}

export function isJewelleryBusiness(type: unknown): boolean {
  return normalizeBusinessType(type) === "jewellery";
}

export function isHotelBusiness(type: unknown): boolean {
  return normalizeBusinessType(type) === "hotel";
}

/**
 * Nights between check-in and check-out (checkout exclusive).
 * Informational only - never used for availability checks.
 */
export function nightsFromStayDates(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): number | null {
  if (!checkIn || !checkOut) return null;
  const a = Date.parse(`${checkIn}T00:00:00`);
  const b = Date.parse(`${checkOut}T00:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

/** Merge defaults with any custom categories already used on products. */
export function categoryOptionsForBusinessType(
  type: unknown,
  existingCategories: Iterable<string> = []
): string[] {
  const defaults = categoriesForBusinessType(type);
  const seen = new Set<string>(defaults);
  const extras: string[] = [];
  for (const c of Array.from(existingCategories)) {
    const trimmed = c?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    extras.push(trimmed);
  }
  extras.sort((a, b) => a.localeCompare(b));
  return [...defaults, ...extras];
}
