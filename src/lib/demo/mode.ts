import { DEMO_ORG_ID } from "@/lib/org";

/** Client + server readable. Set BOTH DEMO_MODE and NEXT_PUBLIC_DEMO_MODE in .env.local */
export function isDemoMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.DEMO_MODE === "true"
  );
}

export const DEMO_ADMIN = {
  id: "00000000-0000-4000-8000-000000000001",
  full_name: "Demo Admin",
  role: "admin" as const,
  created_at: "2026-01-01T00:00:00.000Z",
  organization_id: DEMO_ORG_ID,
  has_seen_onboarding: false,
};
