import fs from "fs";
import { pdf } from "pdf-to-img";

const doc = await pdf("tmp/invoice-preview.pdf", { scale: 2 });
let i = 0;
for await (const page of doc) {
  i += 1;
  const out = `tmp/invoice-preview-p${i}.png`;
  fs.writeFileSync(out, page);
  console.log("wrote", out, page.length);
}
