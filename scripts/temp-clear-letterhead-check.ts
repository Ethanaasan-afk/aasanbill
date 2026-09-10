/**
 * Temporarily clear a test org's address/GSTIN, print letterhead lines, restore.
 * Uses service role. Prefer isolation test orgs from prior pentest.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/temp-clear-letterhead-check.ts
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import {
  formatCompanyAddress,
  formatCompanyContact,
} from "../src/lib/invoice-letterhead";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnvLocal();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Prefer a Test Business A org from isolation pentest
  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, name, address, city, state, pincode, gstin, phone, email, brand_name")
    .ilike("name", "Test Business A%")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  const org = orgs?.[0];
  if (!org) {
    console.log("No Test Business A org found — skipping live clear/restore");
    return;
  }

  const original = {
    address: org.address,
    city: org.city,
    state: org.state,
    pincode: org.pincode,
    gstin: org.gstin,
    phone: org.phone,
    email: org.email,
  };

  console.log("Org:", org.id, org.name);
  console.log("BEFORE clear:");
  console.log(
    " ",
    formatCompanyAddress(org),
    "|",
    formatCompanyContact(org)
  );

  const { error: clearErr } = await admin
    .from("organizations")
    .update({
      address: null,
      city: "",
      pincode: "",
      gstin: null,
      phone: "",
      email: "",
      // keep state so place-of-supply still works elsewhere
    })
    .eq("id", org.id);
  if (clearErr) throw clearErr;

  const { data: cleared } = await admin
    .from("organizations")
    .select("address, city, state, pincode, gstin, phone, email, brand_name, name")
    .eq("id", org.id)
    .single();

  console.log("AFTER clear (letterhead):");
  console.log(
    " address=",
    JSON.stringify(formatCompanyAddress(cleared!)),
    " contact=",
    JSON.stringify(formatCompanyContact(cleared!))
  );

  const { error: restoreErr } = await admin
    .from("organizations")
    .update(original)
    .eq("id", org.id);
  if (restoreErr) throw restoreErr;

  const { data: restored } = await admin
    .from("organizations")
    .select("address, city, state, pincode, gstin, phone, email")
    .eq("id", org.id)
    .single();

  console.log("RESTORED:");
  console.log(
    " ",
    formatCompanyAddress(restored!),
    "|",
    formatCompanyContact(restored!)
  );
  console.log("Done — values restored.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
