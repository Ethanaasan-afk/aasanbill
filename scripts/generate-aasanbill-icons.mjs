/**
 * Generate AasanBill favicon / PWA icons and a simple full wordmark logo.
 * Run: node scripts/generate-aasanbill-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync, existsSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconSrc = join(root, "public", "logo", "aasanbill-icon.png");
const outLogo = join(root, "public", "logo");
const outIcons = join(root, "public", "icons");

mkdirSync(outLogo, { recursive: true });
mkdirSync(outIcons, { recursive: true });

if (!existsSync(iconSrc)) {
  console.error("Missing", iconSrc);
  process.exit(1);
}

const sizes = [
  { file: join(outIcons, "icon-16.png"), size: 16 },
  { file: join(outIcons, "icon-32.png"), size: 32 },
  { file: join(outIcons, "icon-180.png"), size: 180 },
  { file: join(outIcons, "icon-192.png"), size: 192 },
  { file: join(outIcons, "icon-512.png"), size: 512 },
  { file: join(root, "public", "favicon-16x16.png"), size: 16 },
  { file: join(root, "public", "favicon-32x32.png"), size: 32 },
  { file: join(root, "public", "apple-touch-icon.png"), size: 180 },
];

for (const { file, size } of sizes) {
  await sharp(iconSrc)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(file);
  console.log("wrote", file);
}

// favicon.ico as 32x32 png copy (Next also accepts icon.png in app/)
await sharp(iconSrc)
  .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toFile(join(root, "public", "favicon.ico"));

// App router icon
await sharp(iconSrc)
  .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toFile(join(root, "src", "app", "icon.png"));

// Full logo: icon + wordmark on white
const mark = await sharp(iconSrc)
  .resize(160, 160, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toBuffer();

const svg = `
<svg width="720" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="200" fill="#ffffff"/>
  <text x="200" y="118" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#0B1220">AasanBill</text>
  <text x="202" y="152" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#64748B">Billing Made Simple</text>
</svg>`;

const base = await sharp(Buffer.from(svg)).png().toBuffer();
await sharp(base)
  .composite([{ input: mark, left: 24, top: 20 }])
  .png()
  .toFile(join(outLogo, "aasanbill-full.png"));

copyFileSync(join(outLogo, "aasanbill-full.png"), join(root, "public", "aasanbill-full.png"));
copyFileSync(iconSrc, join(root, "public", "aasanbill-icon.png"));

console.log("wrote full logo + public copies");
