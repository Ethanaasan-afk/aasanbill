import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

function loadEnv() {
  const text = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) throw listErr;
  console.log(
    "buckets:",
    (buckets || []).map((b) => b.name).join(", ")
  );

  const exists = (buckets || []).some((b) => b.name === "signatures" || b.id === "signatures");
  if (!exists) {
    const { data, error } = await admin.storage.createBucket("signatures", {
      public: true,
      fileSizeLimit: 2097152,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg"],
    });
    console.log("createBucket:", data?.name ?? data, error?.message ?? "ok");
  } else {
    const { error } = await admin.storage.updateBucket("signatures", {
      public: true,
      fileSizeLimit: 2097152,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg"],
    });
    console.log("signatures bucket exists; update:", error?.message ?? "ok");
  }

  const { data: cols, error: cErr } = await admin
    .from("organizations")
    .select("id, signature_url")
    .limit(1);
  console.log("signature_url column:", cErr ? cErr.message : "ok", cols);

  // Make a simple signature PNG with sharp if available
  let png;
  try {
    const sharp = require("sharp");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120">
      <rect width="100%" height="100%" fill="none"/>
      <text x="20" y="75" font-family="Segoe Script, Brush Script MT, cursive" font-size="48" fill="#0F172A">A. Owner</text>
    </svg>`;
    png = await sharp(Buffer.from(svg)).png().toBuffer();
  } catch {
    // 1x1 transparent PNG fallback
    png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
  }

  const out = path.join(process.cwd(), "tmp", "sample-signature.png");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, png);
  console.log("wrote", out, png.length, "bytes");

  if (cErr) {
    console.log("Skip upload — run PASTE_028_org_signature.sql first for signature_url column + policies.");
    return;
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .ilike("name", "Test Business A%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const orgId = org?.id;
  if (!orgId) {
    console.log("No Test Business A org to attach sample signature");
    return;
  }

  const objectPath = `${orgId}/signature.png`;
  await admin.storage.from("signatures").remove([objectPath]);
  const { error: upErr } = await admin.storage
    .from("signatures")
    .upload(objectPath, png, { contentType: "image/png", upsert: true });
  if (upErr) {
    console.log("upload error:", upErr.message);
    return;
  }
  const { data: pub } = admin.storage.from("signatures").getPublicUrl(objectPath);
  const url = `${pub.publicUrl}?v=${Date.now()}`;
  const { error: updErr } = await admin
    .from("organizations")
    .update({ signature_url: url, updated_at: new Date().toISOString() })
    .eq("id", orgId);
  console.log("attached to", org.name, updErr?.message ?? url);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
