import { createAdminClient } from "@/lib/supabase/admin";
import { mapRazorpayPlanIdToTier } from "@/lib/billing/plans";
import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function unixToIso(seconds: number | undefined | null): string | null {
  if (seconds == null || !Number.isFinite(Number(seconds))) return null;
  return new Date(Number(seconds) * 1000).toISOString();
}

async function resolveOrgId(
  admin: ReturnType<typeof createAdminClient>,
  payload: Record<string, unknown>
): Promise<string | null> {
  const sub = (payload.subscription ?? payload) as Record<string, unknown>;
  const notes = (sub.notes ?? {}) as Record<string, unknown>;
  if (typeof notes.organization_id === "string" && notes.organization_id) {
    return notes.organization_id;
  }
  const subId = typeof sub.id === "string" ? sub.id : null;
  if (subId) {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("razorpay_subscription_id", subId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  const customerId = typeof sub.customer_id === "string" ? sub.customer_id : null;
  if (customerId) {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("razorpay_customer_id", customerId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[billing/webhook] RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody) as { event?: string; payload?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event ?? "unknown";
  const payloadRoot = event.payload ?? {};
  // Razorpay nests entity under payload.subscription.entity etc.
  const nestedSub = (payloadRoot.subscription as { entity?: Record<string, unknown> } | undefined)
    ?.entity;
  const entity = (nestedSub ??
    (payloadRoot.payment as { entity?: Record<string, unknown> } | undefined)?.entity ??
    payloadRoot) as Record<string, unknown>;

  const admin = createAdminClient();
  const orgId = await resolveOrgId(admin, {
    ...entity,
    subscription: entity,
  });

  const subId = typeof entity.id === "string" ? entity.id : null;

  // Always log for debugging
  await admin.from("billing_events").insert({
    organization_id: orgId,
    event_type: eventType,
    razorpay_subscription_id: subId,
    raw_payload: event,
  });

  if (!orgId) {
    console.warn("[billing/webhook] could not resolve organization for", eventType);
    return NextResponse.json({ ok: true, matched: false });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (subId) patch.razorpay_subscription_id = subId;

  const planFromNotes =
    typeof (entity.notes as { plan?: string } | undefined)?.plan === "string"
      ? (entity.notes as { plan: string }).plan
      : null;
  const planFromId = mapRazorpayPlanIdToTier(
    typeof entity.plan_id === "string" ? entity.plan_id : null
  );
  const tier =
    planFromNotes === "starter" || planFromNotes === "pro" || planFromNotes === "business"
      ? planFromNotes
      : planFromId;

  const periodEnd = unixToIso(
    (entity.current_end as number | undefined) ?? (entity.charge_at as number | undefined)
  );

  switch (eventType) {
    case "subscription.activated":
      patch.subscription_status = "active";
      patch.cancel_at_period_end = false;
      if (tier) patch.plan = tier;
      if (periodEnd) patch.current_period_end = periodEnd;
      break;
    case "subscription.charged":
      if (periodEnd) patch.current_period_end = periodEnd;
      if (tier) patch.plan = tier;
      if (patch.subscription_status === undefined) {
        // keep active if charging succeeded
        patch.subscription_status = "active";
      }
      break;
    case "subscription.pending":
    case "subscription.halted":
      patch.subscription_status = "past_due";
      break;
    case "subscription.cancelled":
      patch.subscription_status = "cancelled";
      patch.cancel_at_period_end = false;
      break;
    default:
      // logged only
      break;
  }

  if (Object.keys(patch).length > 1) {
    await admin.from("organizations").update(patch).eq("id", orgId);
  }

  return NextResponse.json({ ok: true, matched: true, organization_id: orgId });
}
