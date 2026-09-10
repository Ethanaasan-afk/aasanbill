"use client";

import { SignatureUploadSection } from "@/components/settings/signature-upload-section";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { useCompanySettings, useUpdateCompanySettings } from "@/hooks/use-company";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/business-types";
import { isDemoMode } from "@/lib/demo/mode";
import { companySettingsSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormValues = z.infer<typeof companySettingsSchema>;

export default function SettingsPage() {
  const { isAdmin, user, loading: authLoading } = useAuth();
  const { data, isLoading, isError, error, refetch } = useCompanySettings();
  const update = useUpdateCompanySettings();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(companySettingsSchema),
  });

  const watchedType = watch("business_type");
  const typeHint =
    BUSINESS_TYPE_OPTIONS.find((o) => o.value === watchedType)?.description ?? "";

  useEffect(() => {
    if (!data) return;
    reset({
      company_name: data.company_name ?? "",
      brand_name: data.brand_name ?? "",
      gstin: data.gstin ?? "",
      address: data.address ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      pincode: data.pincode ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      bank_name: data.bank_name ?? "",
      bank_account: data.bank_account ?? "",
      bank_ifsc: data.bank_ifsc ?? "",
      bank_branch: data.bank_branch ?? "",
      invoice_prefix: data.invoice_prefix ?? "AB",
      upi_id: data.upi_id ?? "",
      business_type: data.business_type ?? "general",
    });
    // FIX: Added `data` to the dependency array to satisfy ESLint
  }, [data, reset]);

  if (authLoading) return <LoadingBlock />;

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin only"
        description={`Signed in as ${user?.role ?? "staff"}. Only an admin account can open Settings. Ask an admin to change your role, or log in with an admin user.`}
      />
    );
  }

  if (isLoading) return <LoadingBlock />;

  if (isError || !data) {
    return (
      <EmptyState
        title="Could not load settings"
        description={(error as Error)?.message || "Check your connection / Supabase organizations table."}
        action={
          <Button type="button" variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const onSubmit = async (values: FormValues) => {
    try {
      await update.mutateAsync({ id: data.id, ...values });
      toast("Settings saved");
      reset(values);
    } catch (e) {
      const msg = (e as Error).message || "Save failed";
      toast(msg, /Saved, but/.test(msg) ? "info" : "error");
      if (/Saved, but/.test(msg)) reset(values);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Organization settings"
        description="Letterhead, GSTIN, bank & UPI - stored on your organization (multi-tenant)"
      />

      <form
        onSubmit={handleSubmit(onSubmit, () =>
          toast("Please fix the highlighted fields", "error")
        )}
        className="panel max-w-2xl space-y-6 p-5"
      >
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">Business type</h2>
          <Select
            label="What kind of business is this?"
            options={BUSINESS_TYPE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            error={errors.business_type?.message}
            {...register("business_type")}
          />
          {typeHint ? <p className="mt-1.5 text-xs text-slate">{typeHint}</p> : null}
          <p className="mt-1 text-[11px] text-slate-dim">
            Changes labels and optional invoice fields only - GST, stock, and billing stay the same.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Company name" error={errors.company_name?.message} {...register("company_name")} />
          <Input label="Brand name" error={errors.brand_name?.message} {...register("brand_name")} />
          <Input label="GSTIN" error={errors.gstin?.message} {...register("gstin")} />
          <Input label="Invoice prefix" error={errors.invoice_prefix?.message} {...register("invoice_prefix")} />
          <div className="sm:col-span-2">
            <Input label="Address" error={errors.address?.message} {...register("address")} />
          </div>
          <Input label="City" error={errors.city?.message} {...register("city")} />
          <Input label="State" error={errors.state?.message} {...register("state")} />
          <Input label="Pincode" error={errors.pincode?.message} {...register("pincode")} />
          <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
          <Input label="Email" error={errors.email?.message} {...register("email")} />
        </div>

        <SignatureUploadSection
          organizationId={data.id}
          signatureUrl={data.signature_url}
        />

        <div>
          <h2 className="mb-3 text-sm font-semibold">Bank details (invoice footer)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Bank name" {...register("bank_name")} />
            <Input label="Account number" {...register("bank_account")} />
            <Input label="IFSC" {...register("bank_ifsc")} />
            <Input label="Branch" {...register("bank_branch")} />
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">UPI payments</h2>
          <Input
            label="UPI ID / VPA"
            placeholder="business@upi"
            error={errors.upi_id?.message}
            {...register("upi_id")}
          />
          <p className="mt-1.5 text-xs text-slate">
            Shown on invoices with a pay QR so customers can settle unpaid bills.
          </p>
        </div>

        {update.isError && (
          <p className="text-xs text-coral-deep">{(update.error as Error).message}</p>
        )}

        <Button type="submit" loading={update.isPending || isSubmitting} disabled={!isDirty}>
          Save settings
        </Button>
      </form>

      <div className="panel mt-6 max-w-2xl space-y-3 p-5">
        <h2 className="font-display text-sm font-semibold text-ink">Help &amp; tour</h2>
        <p className="text-sm text-slate">
          Replay the welcome walkthrough that opens and explains every section of the app.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            const { requestOnboardingReplay } = await import("@/lib/onboarding-storage");
            requestOnboardingReplay();
            if (user?.id && !isDemoMode()) {
              try {
                const { createClient } = await import("@/lib/supabase/client");
                await createClient()
                  .from("users")
                  .update({ has_seen_onboarding: false })
                  .eq("id", user.id);
              } catch {
                /* local replay still works */
              }
            }
            toast("Starting the tour…");
            window.location.href = "/";
          }}
        >
          Replay welcome tour
        </Button>
      </div>
    </div>
  );
}