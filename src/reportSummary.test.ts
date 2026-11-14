import { expect, test } from "vitest";
import { summaryRow, summarize, summaryCsv } from "./reportSummary";
import { emptyReport } from "./reportModel";
import { emptyBilling, type WorkReport } from "./reportWorkModel";
const report = (id = "a") =>
  ({
    ...emptyReport(),
    id,
    schemaVersion: 3,
    ownerUid: "owner",
    assignedTo: ["one", "two"],
    title: "Koetyö",
    status: "APPROVED",
    revision: 1,
    createdAt: "",
    updatedAt: "",
    updatedBy: "",
    lastMutation: "",
    schedule: "",
    quotationReference: "",
    workOrderId: id,
    comment: "",
    form: {
      ...emptyReport().form,
      customer: "=SUM(A1)",
      hours: "2,5",
      materials: [
        { name: "Liitin", unit: "kpl", quantity: "2", unitPriceCents: 250 },
      ],
    },
  }) as WorkReport;
test("company totals deduplicate shared jobs and split employee allocation explicitly; VAT rates stay separate", () => {
  const a = summaryRow(report(), {
      ...emptyBilling(),
      hourRateCents: 10000,
      vatBasisPoints: 2550,
    }),
    b = summaryRow(
      { ...report("b"), assignedTo: [] },
      { ...emptyBilling(), vatBasisPoints: 1000 },
    );
  const s = summarize([a, a, b]);
  expect(s.totals.count).toBe(2);
  expect(s.totals.hours).toBe(5);
  expect(s.totals.net).toBe(26000);
  expect(s.employees.one.hours).toBe(1.25);
  expect(s.employees.two.hours).toBe(1.25);
  expect(s.employees.owner.hours).toBe(2.5);
  expect(Object.keys(s.vat)).toHaveLength(2);
  expect(s.totals.vat).toBe(s.vat[2550].vat + s.vat[1000].vat);
  expect(s.materials[0].quantity).toBe(4);
});
test("purchase snapshot gaps and unapproved estimates remain explicit, and CSV has Finnish Excel encoding and injection protection", () => {
  const row = summaryRow(
    { ...report(), status: "PENDING_REVIEW" },
    { ...emptyBilling(), vatBasisPoints: 2550 },
    { materialsCents: 150, missingRows: 1 },
  );
  const s = summarize([row]);
  expect(s.totals.purchase).toBe(150);
  expect(s.totals.missingCosts).toBe(1);
  expect(s.totals.estimates).toBe(1);
  const csv = summaryCsv([row]);
  expect(csv.startsWith("\ufeff")).toBe(true);
  expect(csv).toContain("'=SUM(A1)");
  expect(csv).toContain("2,5");
  expect(csv).toContain("\r\n");
  expect(csv).toContain("YHTEENSÄ");
});
test("decimal quantities are stable, special employee UIDs cannot alter object prototypes, and unsafe aggregate totals cannot be exported", () => {
  const a = summaryRow(
    {
      ...report("x"),
      assignedTo: ["__proto__"],
      form: {
        ...report().form,
        hours: "0,1",
        materials: [
          { name: "Putki", unit: "m", quantity: "0,1", unitPriceCents: 100 },
        ],
      },
    },
    emptyBilling(),
  );
  const b = {
    ...a,
    id: "y",
    hours: 0.2,
    materials: [{ ...a.materials[0], quantity: 0.2 }],
  };
  const s = summarize([a, b]);
  expect(s.totals.hours).toBe(0.3);
  expect(s.materials[0].quantity).toBe(0.3);
  expect(s.employees.__proto__.count).toBe(2);
  expect(({} as any).count).toBeUndefined();
  const huge = {
    ...a,
    totals: {
      ...a.totals,
      net: Number.MAX_SAFE_INTEGER,
      gross: Number.MAX_SAFE_INTEGER,
    },
  };
  expect(summarize([huge, { ...huge, id: "other" }]).overflow).toBe(true);
  expect(() => summaryCsv([huge, { ...huge, id: "other" }])).toThrow(
    "summary_total_limit",
  );
});
