import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteUserSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: "Your account has no organization. Run migrations 016–019." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password, full_name, role } = parsed.data;
    const admin = createAdminClient();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Failed to create auth user" },
        { status: 400 }
      );
    }

    const { error: profileErr } = await admin.from("users").upsert(
      {
        id: created.user.id,
        full_name,
        role,
        organization_id: profile.organization_id,
      },
      { onConflict: "id" }
    );

    if (profileErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: created.user.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
