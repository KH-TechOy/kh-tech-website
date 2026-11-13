import { expect, test } from "vitest";
import { billingTotals, emptyBilling, scaledAmount } from "./reportWorkModel";
import { emptyReport } from "./reportModel";

// The former arithmetic remains an independent test oracle, never part of the GAS bundle.
function originalAmount(value: string, rate: number) {
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  const divisor = 10n ** BigInt(fraction.length);
  return Number(
    ((BigInt(whole || "0") * divisor + BigInt(fraction || "0")) * BigInt(rate) +
      divisor / 2n) /
      divisor,
  );
}
test("GAS-compatible amount arithmetic is exactly equal to the original BigInt calculation at bounds and half-cent cases", () => {
  for (const quantity of [
    "0",
    "1",
    ".005",
    "0,05",
    "2.5",
    "12.3456",
    "99999.9999",
    "100000",
  ])
    for (const rate of [0, 1, 5, 29, 9999, 100000000])
      expect(scaledAmount(quantity, rate)).toBe(originalAmount(quantity, rate));
  let seed = 13727;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (let i = 0; i < 10000; i++) {
    const quantity =
        (next() % 100000) + "." + String(next() % 10000).padStart(4, "0"),
      rate = next() % 100000001;
    expect(scaledAmount(quantity, rate)).toBe(originalAmount(quantity, rate));
  }
});
test("maximum report totals and varying VAT rates retain exact cents even when net multiplied by basis points exceeds safe Number integers", () => {
  const form = {
    ...emptyReport().form,
    hours: "10000",
    materials: Array.from({ length: 50 }, () => ({
      name: "Bounds",
      quantity: "99999.999",
      unit: "kpl",
      unitPriceCents: 100000000,
    })),
  };
  const billing = {
    ...emptyBilling(),
    hourRateCents: 100000000,
    travelKm: 100000,
    travelRateCents: 100000000,
    otherCents: 100000000,
  };
  for (const otherCents of [0,1,4999,9999,100000000]) for (const basisPoints of [0, 1, 125, 1400, 2550, 9999, 10000]) {
    const totals = billingTotals(form, {
      ...billing,
      otherCents,
      vatBasisPoints: basisPoints,
    });
    const net =
      BigInt(originalAmount("99999.999", 100000000)) * 50n +
      BigInt(originalAmount(form.hours, billing.hourRateCents)) +
      BigInt(
        originalAmount(String(billing.travelKm), billing.travelRateCents),
      ) +
      BigInt(otherCents);
    const vat = (net * BigInt(basisPoints) + 5000n) / 10000n;
    expect(totals).toMatchObject({
      net: Number(net),
      vat: Number(vat),
      gross: Number(net + vat),
    });
  }
});
