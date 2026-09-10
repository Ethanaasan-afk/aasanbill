import { z } from "zod";
import { GST_RATES } from "@/lib/constants";
import { BUSINESS_TYPES, type ProductFormFieldId } from "@/lib/business-types";

/** Empty string / blank → null; otherwise non-negative number. */
const optionalPrice = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : val;
}, z.union([z.null(), z.number().min(0, "Price must be ≥ 0")]));

const optionalString = z.string().optional().nullable().or(z.literal(""));

/** Full product payload schema (DB still stores all columns; form whitelist controls UI). */
export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  variant: optionalString,
  sku: z.string().optional().default(""),
  barcode: optionalString,
  pack_size: z.string().optional().default("Unit"),
  hsn_code: z.string().optional().default(""),
  base_price: z.coerce.number().min(0, "Price must be ≥ 0"),
  manufacturing_cost: optionalPrice,
  gst_rate: z.coerce.number().refine((v) => (GST_RATES as readonly number[]).includes(v), {
    message: "Invalid GST rate",
  }),
  reorder_threshold: z.coerce.number().int().min(0).default(10),
  is_active: z.boolean().default(true),
  mfg_date: optionalString,
  exp_date: optionalString,
  imei_serial: optionalString,
  batch_number: optionalString,
  is_service: z.boolean().default(false),
  metal_type: z.enum(["gold", "silver", "platinum", "palladium"]).optional().nullable(),
  purity: optionalString,
  huid_number: optionalString,
  gross_weight: z.coerce.number().min(0).optional().nullable(),
  net_weight: z.coerce.number().min(0).optional().nullable(),
  making_charge_type: z.enum(["flat", "per_gram", "percent"]).optional().nullable(),
  making_charge_value: z.coerce.number().min(0).optional().nullable(),
  stone_value: z.coerce.number().min(0).optional().nullable(),
  wastage_percent: z.coerce.number().min(0).optional().nullable(),
});

/** Validate only whitelisted fields as required; others get safe defaults on submit. */
export function productSchemaForFields(visible: ReadonlySet<ProductFormFieldId>) {
  return productSchema.superRefine((data, ctx) => {
    if (visible.has("name") && !data.name?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Name is required", path: ["name"] });
    }
    if (visible.has("category") && !data.category?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is required", path: ["category"] });
    }
    if (visible.has("sku") && !data.sku?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SKU is required", path: ["sku"] });
    }
    if (visible.has("pack_size") && !data.pack_size?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pack size is required", path: ["pack_size"] });
    }
    if (visible.has("hsn_code") && (data.hsn_code?.trim().length ?? 0) < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HSN code is required",
        path: ["hsn_code"],
      });
    }
  });
}

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  billing_address: z.string().optional().nullable(),
  state: z.string().min(1, "State is required"),
  gstin: z.string().optional().nullable(),
  customer_type: z.enum(["b2b", "b2c"]),
}).superRefine((data, ctx) => {
  if (data.customer_type === "b2b" && (!data.gstin || data.gstin.length < 15)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GSTIN required for wholesaler (15 characters)",
      path: ["gstin"],
    });
  }
});

export const stockInSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive("Quantity must be > 0"),
  source: z.enum(["production", "purchase"]),
  batch_number: z.string().optional().nullable(),
  mfg_date: z.string().optional().nullable(),
  exp_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const stockOutSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive("Quantity must be > 0"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional().nullable(),
});

export const stockAdjustSchema = z.object({
  product_id: z.string().uuid(),
  new_quantity: z.coerce.number().int().min(0),
  reason: z.string().min(3, "Reason is required"),
});

export const companySettingsSchema = z.object({
  company_name: z.string().min(1),
  brand_name: z.string().min(1),
  gstin: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email("Enter a valid email"),
  bank_name: z.string().optional().default(""),
  bank_account: z.string().optional().default(""),
  bank_ifsc: z.string().optional().default(""),
  bank_branch: z.string().optional().default(""),
  invoice_prefix: z.string().min(1, "Invoice prefix is required").default("AB"),
  upi_id: z.string().optional().default(""),
  business_type: z.enum(BUSINESS_TYPES).default("general"),
});

export const STRONG_PASSWORD_HINT =
  "At least 8 characters, with uppercase, lowercase, a number, and a symbol";

/** Signup / invite: min 8 + mixed case, digit, and symbol. */
export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol (e.g. ! @ # $)");

export function passwordStrengthChecks(password: string) {
  return {
    minLength: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export const inviteUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(["admin", "staff"]),
  password: strongPasswordSchema,
});

export const signupSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  owner_name: z.string().min(1, "Owner name is required"),
  email: z.string().trim().toLowerCase().email(),
  password: strongPasswordSchema,
  business_type: z.enum(BUSINESS_TYPES).default("general"),
});

/** For auth users who already have a session but no org/profile yet. */
export const completeSetupSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  owner_name: z.string().min(1, "Owner name is required"),
  business_type: z.enum(BUSINESS_TYPES).default("general"),
});
