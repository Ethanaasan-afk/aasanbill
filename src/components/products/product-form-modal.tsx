"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { GST_RATES, PACK_SIZES } from "@/lib/constants";
import {
  categoryOptionsForBusinessType,
  productFormFieldSet,
  type ProductFormFieldId,
} from "@/lib/business-types";
import {
  calcJewelleryTaxable,
  jewelleryPurityKey,
  JEWELLERY_DEFAULT_GST,
  JEWELLERY_DEFAULT_HSN,
  JEWELLERY_HSN_HELP,
  JEWELLERY_PURITY_OPTIONS,
  MAKING_CHARGE_TYPE_OPTIONS,
  parseJewelleryPurityKey,
  resolveJewelleryRatePerGram,
  type MakingChargeType,
  type MetalType,
} from "@/lib/jewellery";
import { calcProductMargin, MARGIN_BADGE_CLASS, priceWithGst } from "@/lib/product-margin";
import { formatINR, generateSku } from "@/lib/utils";
import { productSchemaForFields } from "@/lib/validations";
import type { Product } from "@/lib/types";
import { useProductMutations, useProducts } from "@/hooks/use-products";
import { useBusinessType } from "@/hooks/use-business-type";
import { useLiveMarketRates } from "@/hooks/use-live-market-rates";
import { findLatestRate, useMetalRates } from "@/hooks/use-metal-rates";
import { useToast } from "@/components/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormValues = z.infer<ReturnType<typeof productSchemaForFields>>;

const FIELD_ORDER: ProductFormFieldId[] = [
  "name",
  "category",
  "variant",
  "pack_size",
  "sku",
  "barcode",
  "batch_number",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "gst_rate",
  "is_service",
  "reorder_threshold",
  "mfg_date",
  "exp_date",
  "is_active",
];

export function ProductFormModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}) {
  const { upsert } = useProductMutations();
  const { toast } = useToast();
  const { labels, businessType, isJewellery, isHotel } = useBusinessType();
  const { data: allProducts } = useProducts();
  const { data: metalRates } = useMetalRates();
  const { data: liveMarket } = useLiveMarketRates(isJewellery);

  const visible = useMemo(() => productFormFieldSet(businessType), [businessType]);

  const categoryOptions = useMemo(
    () =>
      categoryOptionsForBusinessType(
        businessType,
        (allProducts ?? []).map((p) => p.category)
      ),
    [businessType, allProducts]
  );

  const emptyDefaults: FormValues = useMemo(
    () => ({
      name: "",
      category: categoryOptions[0] ?? "Other",
      variant: "",
      sku: "",
      barcode: "",
      pack_size: visible.has("pack_size") ? "500ml" : "Pcs",
      hsn_code: isJewellery ? JEWELLERY_DEFAULT_HSN : "",
      base_price: 0,
      manufacturing_cost: null,
      gst_rate: isJewellery ? JEWELLERY_DEFAULT_GST : 18,
      reorder_threshold: visible.has("reorder_threshold") ? 10 : 0,
      is_active: true,
      mfg_date: "",
      exp_date: "",
      imei_serial: "",
      batch_number: "",
      is_service: isHotel ? true : false,
      metal_type: isJewellery ? "gold" : null,
      purity: isJewellery ? "22k" : "",
      huid_number: "",
      gross_weight: null,
      net_weight: null,
      making_charge_type: isJewellery ? "flat" : null,
      making_charge_value: 0,
      stone_value: 0,
      wastage_percent: 0,
    }),
    [categoryOptions, visible, isJewellery, isHotel]
  );

  const schema = useMemo(() => productSchemaForFields(visible), [visible]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults,
  });

  const [metalType, setMetalType] = useState<MetalType>("gold");
  const [purity, setPurity] = useState("22k");
  const [huid, setHuid] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [makingType, setMakingType] = useState<MakingChargeType>("flat");
  const [makingValue, setMakingValue] = useState("0");
  const [stoneValue, setStoneValue] = useState("0");
  const [wastagePercent, setWastagePercent] = useState("0");

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        category: product.category,
        variant: product.variant ?? "",
        sku: product.sku,
        barcode: product.barcode ?? "",
        pack_size: product.pack_size,
        hsn_code: product.hsn_code,
        base_price: product.base_price,
        manufacturing_cost: product.manufacturing_cost ?? null,
        gst_rate: product.gst_rate,
        reorder_threshold: product.reorder_threshold,
        is_active: product.is_active,
        mfg_date: product.mfg_date ?? "",
        exp_date: product.exp_date ?? "",
        imei_serial: product.imei_serial ?? "",
        batch_number: product.batch_number ?? "",
        is_service: Boolean(product.is_service),
        metal_type: product.metal_type ?? null,
        purity: product.purity ?? "",
        huid_number: product.huid_number ?? "",
        gross_weight: product.gross_weight ?? null,
        net_weight: product.net_weight ?? null,
        making_charge_type: product.making_charge_type ?? null,
        making_charge_value: product.making_charge_value ?? 0,
        stone_value: product.stone_value ?? 0,
        wastage_percent: product.wastage_percent ?? 0,
      });
      if (isJewellery) {
        setMetalType((product.metal_type as MetalType) || "gold");
        setPurity(product.purity || "22k");
        setHuid(product.huid_number ?? "");
        const w = product.net_weight ?? product.gross_weight;
        setWeightGrams(w != null ? String(w) : "");
        const mt = (product.making_charge_type as MakingChargeType) || "flat";
        setMakingType(mt === "percent" ? "percent" : "flat");
        setMakingValue(String(product.making_charge_value ?? 0));
        setStoneValue(String(product.stone_value ?? 0));
        setWastagePercent(String(product.wastage_percent ?? 0));
      }
    } else {
      reset(emptyDefaults);
      if (isJewellery) {
        setMetalType("gold");
        setPurity("22k");
        setHuid("");
        setWeightGrams("");
        setMakingType("flat");
        setMakingValue("0");
        setStoneValue("0");
        setWastagePercent("0");
      }
    }
  }, [product, open, reset, emptyDefaults, isJewellery]);

  const name = watch("name");
  const pack = watch("pack_size");
  const variant = watch("variant");
  const category = watch("category");
  const isService = Boolean(watch("is_service"));
  const basePrice = Number(watch("base_price")) || 0;
  const gstRate = Number(watch("gst_rate")) || 0;
  const mfgCostRaw = watch("manufacturing_cost");
  const mfgCost =
    mfgCostRaw == null || (typeof mfgCostRaw === "string" && mfgCostRaw === "")
      ? null
      : Number(mfgCostRaw);

  const shopRate = useMemo(
    () => findLatestRate(metalRates, metalType, purity),
    [metalRates, metalType, purity]
  );

  const resolvedRate = useMemo(
    () =>
      resolveJewelleryRatePerGram({
        metal: metalType,
        purity,
        liveRates: liveMarket?.rates,
        shopRatePerGram: shopRate?.rate_per_gram ?? null,
      }),
    [metalType, purity, liveMarket?.rates, shopRate]
  );

  const jewelleryPreview = useMemo(() => {
    if (!isJewellery) return null;
    const w = Number(weightGrams) || 0;
    return calcJewelleryTaxable({
      netWeight: w,
      grossWeight: w,
      ratePerGram: resolvedRate.ratePerGram,
      makingChargeType: makingType,
      makingChargeValue: Number(makingValue) || 0,
      stoneValue: Number(stoneValue) || 0,
      wastagePercent: Number(wastagePercent) || 0,
    });
  }, [
    isJewellery,
    weightGrams,
    resolvedRate,
    makingType,
    makingValue,
    stoneValue,
    wastagePercent,
  ]);

  const finalWithGst = useMemo(() => {
    const taxable = isJewellery ? jewelleryPreview?.taxableValue ?? 0 : basePrice;
    return priceWithGst(taxable, gstRate);
  }, [isJewellery, jewelleryPreview, basePrice, gstRate]);

  const margin = useMemo(
    () =>
      calcProductMargin(
        basePrice,
        Number.isFinite(mfgCost as number) ? mfgCost : null
      ),
    [basePrice, mfgCost]
  );

  const selectCategories = useMemo(() => {
    const opts = [...categoryOptions];
    if (category && !opts.includes(category)) opts.unshift(category);
    return opts.map((c) => ({ value: c, label: c }));
  }, [categoryOptions, category]);

  const purityOptions = useMemo(
    () =>
      JEWELLERY_PURITY_OPTIONS.map((o) => ({
        value: jewelleryPurityKey(o.metal_type, o.purity),
        label: o.label,
      })),
    []
  );

  const puritySelectValue = jewelleryPurityKey(metalType, purity);

  const show = (field: ProductFormFieldId) => {
    if (!visible.has(field)) return false;
    if (field === "reorder_threshold" && isService) return false;
    return true;
  };

  const onSubmit = async (values: FormValues) => {
    const sku =
      (show("sku") ? values.sku : "")?.trim() ||
      generateSku(values.name || "ITEM", values.pack_size || "Unit", values.variant);
    const pack_size = show("pack_size")
      ? values.pack_size || "Unit"
      : isJewellery || isHotel
        ? "Pcs"
        : values.pack_size?.trim() || "Unit";
    const hsn_code = show("hsn_code")
      ? values.hsn_code
      : values.hsn_code?.trim() || (isJewellery ? JEWELLERY_DEFAULT_HSN : "998314");
    const asService = Boolean(show("is_service") && values.is_service);

    if (isJewellery) {
      const w = Number(weightGrams);
      if (!(w > 0)) {
        toast("Weight (grams) is required for jewellery.", "error");
        return;
      }
    }

    // Jewellery: never persist a fixed catalog price — estimates recalculate from live rates.
    const computedBase = isJewellery ? 0 : values.base_price;

    await upsert.mutateAsync({
      ...(product?.id ? { id: product.id } : {}),
      name: values.name,
      category: values.category,
      variant: show("variant") ? values.variant || null : null,
      sku,
      barcode: show("barcode") ? values.barcode || null : null,
      pack_size,
      hsn_code: hsn_code || (isJewellery ? JEWELLERY_DEFAULT_HSN : "998314"),
      base_price: computedBase,
      manufacturing_cost: show("manufacturing_cost")
        ? values.manufacturing_cost ?? null
        : null,
      gst_rate: values.gst_rate,
      reorder_threshold: asService
        ? 0
        : show("reorder_threshold")
          ? values.reorder_threshold
          : 0,
      is_active: values.is_active,
      mfg_date: show("mfg_date") ? values.mfg_date || null : null,
      exp_date: show("exp_date") ? values.exp_date || null : null,
      batch_number: show("batch_number") ? values.batch_number || null : null,
      is_service: isHotel ? true : show("is_service") ? asService : false,
      imei_serial: null,
      metal_type: isJewellery ? metalType : null,
      purity: isJewellery ? purity : null,
      huid_number: isJewellery ? huid.trim() || null : null,
      gross_weight: isJewellery ? Number(weightGrams) || null : null,
      net_weight: isJewellery ? Number(weightGrams) || null : null,
      making_charge_type: isJewellery ? makingType : null,
      making_charge_value: isJewellery ? Number(makingValue) || 0 : null,
      stone_value: isJewellery ? Number(stoneValue) || 0 : null,
      wastage_percent: isJewellery ? Number(wastagePercent) || 0 : null,
    });
    toast(product ? `${labels.product} updated` : `${labels.product} created`);
    onClose();
  };

  const fieldsToRender = FIELD_ORDER.filter((f) => show(f));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? labels.editProduct : labels.addProduct}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        {fieldsToRender.map((field) => {
          switch (field) {
            case "name":
              return (
                <Input
                  key={field}
                  label={labels.productName}
                  error={errors.name?.message}
                  {...register("name")}
                />
              );
            case "category":
              return (
                <Select
                  key={field}
                  label="Category"
                  options={selectCategories}
                  error={errors.category?.message}
                  {...register("category")}
                />
              );
            case "variant":
              return (
                <Input
                  key={field}
                  label={labels.variant}
                  placeholder={
                    businessType === "cloth_shop" ? "e.g. L, Red" : undefined
                  }
                  {...register("variant")}
                />
              );
            case "pack_size":
              return (
                <div key={field} className="contents">
                  <Select
                    label={labels.packSize}
                    options={[
                      ...PACK_SIZES.map((p) => ({ value: p, label: p })),
                      { value: "Unit", label: "Unit" },
                      { value: "Pcs", label: "Pcs" },
                      { value: "custom", label: "Custom (type below)" },
                    ]}
                    {...register("pack_size")}
                  />
                  {!PACK_SIZES.includes(pack as (typeof PACK_SIZES)[number]) &&
                    pack !== "Unit" &&
                    pack !== "Pcs" && (
                      <Input
                        label={`Custom ${labels.packSize.toLowerCase()}`}
                        {...register("pack_size")}
                        className="sm:col-span-2"
                      />
                    )}
                </div>
              );
            case "sku":
              return (
                <div key={field} className="flex items-end gap-2">
                  <Input label="SKU" error={errors.sku?.message} {...register("sku")} />
                  {!product && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mb-0.5 shrink-0"
                      onClick={() =>
                        setValue("sku", generateSku(name || "ITEM", pack || "1", variant))
                      }
                    >
                      Auto
                    </Button>
                  )}
                </div>
              );
            case "barcode":
              return (
                <Input
                  key={field}
                  label="Barcode / EAN (optional)"
                  helpKey="barcode"
                  placeholder="Scan or type barcode"
                  {...register("barcode")}
                />
              );
            case "batch_number":
              return (
                <Input
                  key={field}
                  label={`${labels.productBatchNumber} (optional)`}
                  placeholder="e.g. BN-2026-01"
                  className="sm:col-span-2"
                  {...register("batch_number")}
                />
              );
            case "hsn_code":
              return (
                <Input
                  key={field}
                  label="HSN code"
                  helpKey={isJewellery ? undefined : "hsn_code"}
                  help={isJewellery ? JEWELLERY_HSN_HELP : undefined}
                  error={errors.hsn_code?.message}
                  {...register("hsn_code")}
                />
              );
            case "base_price":
              return (
                <Input
                  key={field}
                  label="Base price (excl. GST)"
                  type="number"
                  step="0.01"
                  error={errors.base_price?.message}
                  {...register("base_price")}
                />
              );
            case "manufacturing_cost":
              return (
                <div key={field} className="space-y-1.5">
                  <div className="flex items-end gap-2">
                    <Input
                      label="Manufacturing cost (₹)"
                      type="number"
                      step="0.01"
                      placeholder="Internal only"
                      emptyAsZero={false}
                      error={errors.manufacturing_cost?.message as string | undefined}
                      className="flex-1"
                      {...register("manufacturing_cost")}
                    />
                    {margin && (
                      <span
                        className={`mb-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${MARGIN_BADGE_CLASS[margin.tone]}`}
                        title="(Base - cost) / base - internal only; does not affect invoices"
                      >
                        Margin {margin.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate">
                    Quick reference only - not used on invoices. Detailed costs stay in Business
                    Data.
                  </p>
                </div>
              );
            case "gst_rate":
              return (
                <div key={field} className="contents">
                  <Select
                    label="GST rate %"
                    helpKey="gst_rate"
                    options={GST_RATES.map((r) => ({ value: String(r), label: `${r}%` }))}
                    error={errors.gst_rate?.message}
                    {...register("gst_rate")}
                  />
                  <p className="self-end font-mono text-xs text-slate sm:pb-2">
                    Final price with GST:{" "}
                    <span className="font-medium text-ink">{formatINR(finalWithGst)}</span>
                  </p>
                </div>
              );
            case "is_service":
              return (
                <label
                  key={field}
                  className="flex items-start gap-2 text-sm text-ink sm:col-span-2"
                >
                  <input type="checkbox" className="mt-0.5" {...register("is_service")} />
                  <span>
                    <span className="font-medium">{labels.serviceToggle}</span>
                    <span className="mt-0.5 block text-[11px] text-slate">
                      Hides reorder/stock settings and skips stock deduction when invoiced.
                    </span>
                  </span>
                </label>
              );
            case "reorder_threshold":
              return (
                <Input
                  key={field}
                  label={labels.reorderThreshold}
                  helpKey="reorder_threshold"
                  type="number"
                  error={errors.reorder_threshold?.message}
                  {...register("reorder_threshold")}
                />
              );
            case "mfg_date":
              return (
                <Input
                  key={field}
                  label="Manufacturing date"
                  type="date"
                  error={errors.mfg_date?.message}
                  {...register("mfg_date")}
                />
              );
            case "exp_date":
              return (
                <Input
                  key={field}
                  label="Expiry date"
                  type="date"
                  error={errors.exp_date?.message}
                  {...register("exp_date")}
                />
              );
            case "is_active":
              return (
                <label
                  key={field}
                  className="flex items-center gap-2 text-sm text-muted sm:col-span-2"
                >
                  <input type="checkbox" {...register("is_active")} />
                  Active {labels.product.toLowerCase()}
                </label>
              );
            default:
              return null;
          }
        })}

        {isJewellery && (
          <div className="sm:col-span-2 space-y-4 rounded-[12px] border border-border bg-cloud p-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">
                Jewellery pricing
              </h3>
              <p className="mt-0.5 text-[11px] text-slate">
                Weight × today&apos;s live rate + making + wastage. Not stored as a fixed base
                price — recalculates daily.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="jewellery_purity"
                label="Purity"
                options={purityOptions}
                value={puritySelectValue}
                onChange={(e) => {
                  const parsed = parseJewelleryPurityKey(e.target.value);
                  setMetalType(parsed.metal_type);
                  setPurity(parsed.purity);
                }}
              />
              <Input
                id="weight_grams"
                label="Weight (grams)"
                type="number"
                step="0.001"
                min={0}
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <div className="sm:col-span-2 space-y-1.5">
                <Input
                  id="huid"
                  label="HUID number (optional)"
                  value={huid}
                  onChange={(e) => setHuid(e.target.value)}
                  placeholder="BIS hallmark unique ID"
                />
                <p className="text-[11px] text-amber">
                  Required for BIS-hallmarked gold jewellery under Indian regulations.
                </p>
              </div>
              <Select
                id="making_type"
                label="Making charge type"
                options={[...MAKING_CHARGE_TYPE_OPTIONS]}
                value={makingType === "percent" ? "percent" : "flat"}
                onChange={(e) =>
                  setMakingType(e.target.value === "percent" ? "percent" : "flat")
                }
              />
              <Input
                id="making_value"
                label={
                  makingType === "percent"
                    ? "Making charge (%)"
                    : "Making charge (₹ fixed)"
                }
                type="number"
                step="0.01"
                min={0}
                value={makingValue}
                onChange={(e) => setMakingValue(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <Input
                id="wastage_percent"
                label="Wastage % (optional)"
                type="number"
                step="0.01"
                min={0}
                value={wastagePercent}
                onChange={(e) => setWastagePercent(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <Input
                id="stone_value"
                label="Stone / diamond value (₹)"
                type="number"
                step="0.01"
                min={0}
                value={stoneValue}
                onChange={(e) => setStoneValue(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            </div>

            <div className="rounded-[10px] border border-sage bg-sage-soft px-3 py-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sage">
                Estimated price at today&apos;s rate
              </p>
              {resolvedRate.ratePerGram > 0 ? (
                <>
                  <p className="mt-2 font-display text-lg font-semibold text-ink">
                    {formatINR(jewelleryPreview?.taxableValue ?? 0)}
                    <span className="ml-2 text-xs font-normal text-slate">excl. GST</span>
                  </p>
                  <p className="mt-2 font-mono text-xs text-ink">
                    Metal {formatINR(jewelleryPreview?.metalValue ?? 0)} (
                    {Number(weightGrams) || 0} g × {formatINR(resolvedRate.ratePerGram)}
                    /g) + Making {formatINR(jewelleryPreview?.makingCharge ?? 0)}
                    {(jewelleryPreview?.wastageAmount ?? 0) > 0
                      ? ` + Wastage ${formatINR(jewelleryPreview?.wastageAmount ?? 0)}`
                      : ""}
                    {(jewelleryPreview?.stoneValue ?? 0) > 0
                      ? ` + Stone ${formatINR(jewelleryPreview?.stoneValue ?? 0)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-slate">
                    Rate source:{" "}
                    {resolvedRate.source === "live_metal_rates"
                      ? "Live market rates"
                      : "Today's Rates (shop)"}
                    . Not saved on the product — locked only when you invoice.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-amber">
                  No live or shop rate for this purity yet. Check Live rates / Today&apos;s
                  Rates.
                </p>
              )}
            </div>
          </div>
        )}

        {upsert.isError && (
          <p className="sm:col-span-2 text-xs text-danger">
            {(upsert.error as Error).message}
          </p>
        )}

        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={upsert.isPending}>
            {product ? "Save changes" : labels.addProduct}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
