import {
  hashProductId,
  productColor,
  productHue,
} from "@/lib/product-color";

/** Quick sanity checks - run with: npx tsx src/lib/product-color.test.ts */

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const ids = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "prod-aura-dishwash-1L",
  "prod-aura-floor-5L",
  "prod-aura-glass-500ml",
  "prod-aura-handwash-250",
  "prod-aura-toilet-1L",
  "c0ffee00-aaaa-bbbb-cccc-ddddeeee0001",
  "c0ffee00-aaaa-bbbb-cccc-ddddeeee0002",
  "c0ffee00-aaaa-bbbb-cccc-ddddeeee0003",
  "c0ffee00-aaaa-bbbb-cccc-ddddeeee0004",
];

// Deterministic: same ID → same hue/color
{
  const a = productColor(ids[0]);
  const b = productColor(ids[0]);
  assert(a === b, "same id must yield same color");
  assert(productHue(ids[0]) === productHue(ids[0]), "same hue");
  assert(hashProductId(ids[0]) === hashProductId(ids[0]), "same hash");
}

// Distinct IDs should mostly get distinct hues (golden-angle spacing)
{
  const hues = ids.map(productHue);
  const unique = new Set(hues.map((h) => Math.round(h * 10) / 10));
  assert(
    unique.size >= ids.length - 1,
    `expected nearly distinct hues, got ${unique.size}/${ids.length}`
  );
}

// Hue formula uses golden angle on the hash
{
  const id = ids[3];
  const expected = (hashProductId(id) * 137.5) % 360;
  assert(Math.abs(productHue(id) - expected) < 1e-9, "golden-angle mismatch");
}

// Output shape / brand vibrancy
{
  const c = productColor(ids[1]);
  assert(/^hsl\([\d.]+ 65% 55%\)$/.test(c), `unexpected format: ${c}`);
}

// Hue in [0, 360)
{
  for (const id of ids) {
    const h = productHue(id);
    assert(h >= 0 && h < 360, `hue out of range: ${h}`);
  }
}

// Name changes irrelevant - only ID matters
{
  assert(productColor("stable-id-xyz") === productColor("stable-id-xyz"), "stable");
}

console.log("product-color tests passed");
