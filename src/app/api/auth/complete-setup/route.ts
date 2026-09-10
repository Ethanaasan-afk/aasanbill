import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyBusinessName } from "@/lib/organization";
import { DEFAULT_BUSINESS_TYPE, normalizeBusinessType } from "@/lib/business-types";
import { completeSetupSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

function uniqueSlug(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`.slice(0, 60);
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Sign in first, then finish setup." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = completeSetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { business_name, owner_name, business_type } = parsed.data;
    const resolvedType = normalizeBusinessType(business_type ?? DEFAULT_BUSINESS_TYPE);
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("users")
      .select("id, organization_id")
      .eq("id", authUser.id)
      .maybeSingle();

    if (existing?.organization_id) {
      return NextResponse.json(
        { error: "Your account is already linked to a business. Refresh the page." },
        { status: 400 }
      );
    }

    const baseSlug = slugifyBusinessName(business_name);
    let slug = baseSlug;
    let orgId: string | null = null;
    let lastOrgError: string | undefined;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({
          name: business_name.trim(),
          slug,
          brand_name: business_name.trim(),
          state: "Gujarat",
          email: authUser.email ?? "",
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

      return NextResponse.json(
        { error: orgErr?.message ?? "Failed to create organization" },
        { status: 400 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: lastOrgError ?? "Could not allocate a unique business slug" },
        { status: 400 }
      );
    }

    await admin
      .from("organizations")
      .update({ business_type: resolvedType })
      .eq("id", orgId);

    await admin.from("warehouses").insert({
      name: "Main warehouse",
      code: "MAIN",
      address: null,
      is_default: true,
      is_active: true,
      organization_id: orgId,
    });

    if (existing) {
      const { error: updateErr } = await admin
        .from("users")
        .update({
          full_name: owner_name.trim(),
          role: "admin",
          organization_id: orgId,
        })
        .eq("id", authUser.id);

      if (updateErr) {
        await admin.from("organizations").delete().eq("id", orgId);
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
    } else {
      const { error: profileErr } = await admin.from("users").insert({
        id: authUser.id,
        full_name: owner_name.trim(),
        role: "admin",
        organization_id: orgId,
      });

      if (profileErr) {
        await admin.from("organizations").delete().eq("id", orgId);
        return NextResponse.json({ error: profileErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({
      ok: true,
      organization_id: orgId,
      business_type: resolvedType,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
