import { expect, test } from "vitest";
import { emptyReport } from "./reportModel";
import { billingTotals, emptyBilling } from "./reportWorkModel";
import { buildPdf } from "./pdf";
test("billing uses fixed cents, Finnish decimals and snapshots, without treating a report as an invoice", () => {
  const state = emptyReport();
  state.form.hours = "2,5";
  state.form.materials = [
    { name: "Liitin", quantity: "3", unit: "kpl", unitPriceCents: 1234 },
  ];
  state.billing = {
    ...emptyBilling(),
    hourRateCents: 6000,
    travelKm: 12.5,
    travelRateCents: 100,
    otherCents: 500,
    vatBasisPoints: 2550,
  };
  const totals = billingTotals(state.form, state.billing);
  expect(totals).toMatchObject({
    work: 15000,
    materialsTotal: 3702,
    travel: 1250,
    other: 500,
    net: 20452,
    vat: 5215,
    gross: 25667,
  });
  const pdf = buildPdf(state).output();
  expect(pdf).toContain("%PDF-");
  expect(pdf.length).toBeGreaterThan(5000);
});
