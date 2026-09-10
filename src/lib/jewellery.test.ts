/**
 * Quick sanity checks - run with: npx tsx src/lib/jewellery.test.ts
 */
import {
  calcJewelleryTaxable,
  calcMakingCharge,
  jewelleryLineFromProduct,
} from "./jewellery";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const metal = calcJewelleryTaxable({
  netWeight: 10,
  grossWeight: 12,
  ratePerGram: 7000,
  makingChargeType: "per_gram",
  makingChargeValue: 500,
  stoneValue: 2000,
  wastagePercent: 0,
});

assert(metal.metalValue === 70000, `metalValue ${metal.metalValue}`);
assert(metal.makingCharge === 5000, `making ${metal.makingCharge}`);
assert(metal.stoneValue === 2000, `stone ${metal.stoneValue}`);
assert(metal.taxableValue === 77000, `taxable ${metal.taxableValue}`);

const withWastage = calcJewelleryTaxable({
  netWeight: 10,
  ratePerGram: 7000,
  makingChargeType: "flat",
  makingChargeValue: 1000,
  wastagePercent: 5,
  stoneValue: 0,
});
// metal 70000 + making 1000 + wastage 3500 = 74500
assert(withWastage.wastageAmount === 3500, `wastage ${withWastage.wastageAmount}`);
assert(withWastage.taxableValue === 74500, `taxable+wastage ${withWastage.taxableValue}`);

assert(calcMakingCharge({ type: "percent", value: 10, netWeight: 1, metalValue: 50000 }) === 5000, "percent");
assert(calcMakingCharge({ type: "flat", value: 1500, netWeight: 1, metalValue: 1 }) === 1500, "flat");

const line = jewelleryLineFromProduct(
  {
    metal_type: "gold",
    purity: "22k",
    huid_number: "ABC123",
    gross_weight: 12,
    net_weight: 10,
    making_charge_type: "flat",
    making_charge_value: 1000,
    stone_value: 0,
    wastage_percent: 0,
    base_price: 0,
  },
  7000
);
assert(line.unit_price === 71000, `line unit ${line.unit_price}`);
assert(line.jewellery_huid === "ABC123", "huid");

console.log("jewellery.test.ts: ok");
