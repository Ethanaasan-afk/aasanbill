# Multi-tenant Phase 1 — run order & verification

## Run these in Supabase SQL Editor (in order)

1. `supabase/migrations/016_organizations.sql` (if not already applied)
2. `supabase/migrations/017_organization_id_columns.sql`
3. `supabase/migrations/018_org_rls.sql`
4. `supabase/migrations/019_org_rpcs_and_auth.sql`

Service role key must be set for `/api/auth/signup` and `/api/users/invite` (`SUPABASE_SERVICE_ROLE_KEY`).

## What changed in the app

- **Signup:** `/signup` → `POST /api/auth/signup` creates Auth user + organization (14-day trial) + admin `users` row + default warehouse, then signs in.
- **Invite:** teammates get the inviter’s `organization_id`.
- **Data access:** RLS scopes all tenant tables by `current_org_id()`; app stamps `organization_id` on inserts; Settings load the signed-in user’s org only.
- **Trial guard:** banner when trial expired / cancelled; creates blocked (reads still work).

## Verification checklist

1. **AURA admin** — log in; products, customers, invoices still present.
2. **New business** — open `/signup`, create a test org; lists should be empty; Settings shows the new business name.
3. **Isolation** — as Org B, you must not see Org A data (Network tab / empty queries). Invite a staff user into Org A; they see only Org A.
4. **Trial** — set `trial_ends_at` to the past and `subscription_status = 'trialing'` on a test org; banner appears and create actions toast an error.

Demo mode remains a single local tenant (not an isolation test).
