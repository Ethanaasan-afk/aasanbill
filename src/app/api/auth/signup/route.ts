import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyBusinessName } from "@/lib/organization";
import { DEFAULT_BUSINESS_TYPE, normalizeBusinessType } from "@/lib/business-types";
import { signupSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

function uniqueSlug(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`.slice(0, 60);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { business_name, owner_name, email, password, business_type } = parsed.data;
    const resolvedType = normalizeBusinessType(business_type ?? DEFAULT_BUSINESS_TYPE);
    const admin = createAdminClient();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: owner_name },
    });

    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Failed to create account";
      const friendly = /already|registered|exists/i.test(msg)
        ? "An account with this email already exists. Sign in instead, or use a different email."
        : msg;
      return NextResponse.json({ error: friendly }, { status: 400 });
    }

    const userId = created.user.id;
    const baseSlug = slugifyBusinessName(business_name);
    let slug = baseSlug;
    let orgId: string | null = null;
    let lastOrgError: string | undefined;

    // Insert WITHOUT business_type so signup works before migration 025 is applied.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({
          name: business_name.trim(),
          slug,
          brand_name: business_name.trim(),
          state: "Gujarat",
          email: email.trim().toLowerCase(),
          invoice_prefix: "AB",
          plan: "free",
          subscription_status: "trialing",
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          city: "",
          pincode: "",
          phone: "",
          bank_name: "",
          bank_account: "",
          bank_ifsc: "",
          bank_branch: "",
          upi_id: "",
          gstin: null,
          address: null,
        })
        .select("id")
        .single();

      if (!orgErr && org) {
        orgId = org.id;
        break;
      }

      lastOrgError = orgErr?.message;
      if (orgErr && /duplicate|unique|slug/i.test(orgErr.message)) {
        slug = uniqueSlug(baseSlug);
        continue;
      }

      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: orgErr?.message ?? "Failed to create organization" },
        { status: 400 }
      );
    }

    if (!orgId) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: lastOrgError ?? "Could not allocate a unique business slug" },
        { status: 400 }
      );
    }

    // Best-effort: set business_type when the column exists (migration 025).
    const { error: typeErr } = await admin
      .from("organizations")
      .update({ business_type: resolvedType })
      .eq("id", orgId);

    const typeSaved = !typeErr;

    // Default warehouse for the new org
    await admin.from("warehouses").insert({
      name: "Main warehouse",
      code: "MAIN",
      address: null,
      is_default: true,
      is_active: true,
      organization_id: orgId,
    });

    const { error: profileErr } = await admin.from("users").upsert(
      {
        id: userId,
        full_name: owner_name.trim(),
        role: "admin",
        organization_id: orgId,
      },
      { onConflict: "id" }
    );

    if (profileErr) {
      await admin.from("organizations").delete().eq("id", orgId);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      organization_id: orgId,
      business_type: resolvedType,
      business_type_persisted: typeSaved,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
