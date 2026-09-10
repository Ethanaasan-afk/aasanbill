import type { AppUser } from "@/lib/types";

export const DEMO_ORG_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

export function requireOrganizationId(user: AppUser | null | undefined): string {
  const orgId = user?.organization_id;
  if (!orgId) {
    throw new Error("Your account is not linked to an organization. Contact support.");
  }
  return orgId;
}
