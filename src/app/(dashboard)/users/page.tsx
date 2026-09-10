"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/ui/page-header";
import { isDemoMode } from "@/lib/demo/mode";
import { demoDb } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { inviteUserSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type InviteForm = z.infer<typeof inviteUserSchema>;

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    enabled: isAdmin,
    queryFn: async () => {
      if (isDemoMode()) return demoDb.getUsers();
      const supabase = createClient();
      const { data, error } = await supabase.from("users").select("*").order("created_at");
      if (error) throw error;
      return data as AppUser[];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { role: "staff", email: "", full_name: "", password: "" },
  });

  if (!isAdmin) {
    return <EmptyState title="Admin only" description="Only admins can manage users." />;
  }

  const onInvite = async (values: InviteForm) => {
    setApiError("");
    if (isDemoMode()) {
      setApiError("User invites are disabled in demo mode.");
      return;
    }
    const res = await fetch("/api/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) {
      setApiError(json.error ?? "Failed to create user");
      return;
    }
    reset();
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Manage users"
        description="Admin creates staff accounts - no public signup"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add user
          </Button>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.full_name}</td>
                  <td>
                    <Badge variant={u.role === "admin" ? "info" : "default"}>{u.role}</Badge>
                  </td>
                  <td className="font-mono text-xs text-slate">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create user account">
        <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
          <Input label="Full name" error={errors.full_name?.message} {...register("full_name")} />
          <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <Input
            label="Temporary password"
            type="password"
            error={errors.password?.message}
            help="At least 8 characters, with uppercase, lowercase, a number, and a symbol"
            {...register("password")}
          />
          <Select
            label="Role"
            options={[
              { value: "staff", label: "Staff" },
              { value: "admin", label: "Admin" },
            ]}
            {...register("role")}
          />
          {apiError && <p className="text-xs text-danger">{apiError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
