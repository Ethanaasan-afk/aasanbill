"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessType } from "@/hooks/use-business-type";
import { useCustomerMutations } from "@/hooks/use-customers";
import { useToast } from "@/components/ui/toast";
import { INDIAN_STATES } from "@/lib/constants";
import type { Customer } from "@/lib/types";
import { customerSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormValues = z.infer<typeof customerSchema>;

export function CustomerFormModal({
  open,
  onClose,
  customer,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onCreated?: (c: Customer) => void;
}) {
  const { isHotel, isJewellery } = useBusinessType();
  /** Retail / wholesaler is for trade verticals only — not hotel guests or jewellery clients. */
  const hideCustomerType = isHotel || isJewellery;
  const { upsert } = useCustomerMutations();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      billing_address: "",
      state: "Gujarat",
      gstin: "",
      customer_type: "b2c",
    },
  });

  const customerType = watch("customer_type");

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        billing_address: customer.billing_address ?? "",
        state: customer.state,
        gstin: customer.gstin ?? "",
        customer_type: hideCustomerType ? "b2c" : customer.customer_type,
      });
    } else {
      reset({
        name: "",
        phone: "",
        email: "",
        billing_address: "",
        state: "Gujarat",
        gstin: "",
        customer_type: "b2c",
      });
    }
  }, [customer, open, reset, hideCustomerType]);

  const onSubmit = async (values: FormValues) => {
    const result = await upsert.mutateAsync({
      ...(customer?.id ? { id: customer.id } : {}),
      ...values,
      customer_type: hideCustomerType ? "b2c" : values.customer_type,
      email: values.email || null,
      phone: values.phone || null,
      gstin: values.gstin || null,
      billing_address: values.billing_address || null,
    });
    toast(customer ? "Customer updated" : "Customer created");
    onCreated?.(result);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? "Edit customer" : "Add customer"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name / Business name"
          className="sm:col-span-2"
          error={errors.name?.message}
          {...register("name")}
        />
        {!hideCustomerType && (
          <Select
            label="Customer type"
            options={[
              { value: "b2c", label: "Retail" },
              { value: "b2b", label: "Wholesaler" },
            ]}
            {...register("customer_type")}
            onChange={(e) => {
              setValue("customer_type", e.target.value as "b2b" | "b2c");
              if (e.target.value === "b2c") setValue("gstin", "");
            }}
          />
        )}
        <Select
          label="State"
          options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
          error={errors.state?.message}
          {...register("state")}
        />
        <Input label="Phone" {...register("phone")} />
        <Input label="Email" type="email" {...register("email")} />
        {(hideCustomerType || customerType === "b2b") && (
          <Input
            label="GSTIN"
            helpKey="gstin"
            className="sm:col-span-2"
            error={errors.gstin?.message}
            {...register("gstin")}
          />
        )}
        <Textarea
          label="Billing address"
          className="sm:col-span-2"
          {...register("billing_address")}
        />

        {upsert.isError && (
          <p className="sm:col-span-2 text-xs text-danger">{(upsert.error as Error).message}</p>
        )}

        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={upsert.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
