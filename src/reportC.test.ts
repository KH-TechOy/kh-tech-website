import { afterEach, expect, test, vi } from "vitest";
import { emptyReport, reportIsEmpty } from "./reportModel";
import { billingTotals, emptyBilling } from "./reportWorkModel";
import { signatureValid, signaturePath } from "./reportSignature";
import {
  sanitizeEmployeeDrafts,
  stripFinancial,
} from "./reportAuth/employeePrivacy";
import { validOperations } from "./reportArchive";
import { readWork } from "../report-api/workStorage";
import type { Document } from "../report-api/types";
afterEach(() => vi.unstubAllGlobals());
test("VAT and fractional work/travel/material totals use deterministic cents and configured rate", () => {
  const form = {
    ...emptyReport().form,
    hours: "2",
    materials: [
      { name: "Liitin", quantity: "2", unit: "kpl", unitPriceCents: 2500 },
    ],
  };
  expect(
    billingTotals(form, {
      ...emptyBilling(),
      hourRateCents: 10000,
      travelKm: 10,
      travelRateCents: 100,
      otherCents: 1600,
      vatBasisPoints: 2550,
    }),
  ).toMatchObject({ net: 27600, vat: 7038, gross: 34638 });
  expect(
    billingTotals(
      { ...form, hours: "0,1", materials: [] },
      {
        ...emptyBilling(),
        hourRateCents: 29,
        travelKm: 0.1,
        travelRateCents: 29,
        vatBasisPoints: 1400,
      },
    ),
  ).toMatchObject({ net: 6, vat: 1, gross: 7 });
});
test("operational-only draft is retained and precision beyond supported travel scale fails validation", () => {
  const state = emptyReport();
  expect(reportIsEmpty(state)).toBe(true);
  expect(
    reportIsEmpty({
      ...state,
      operations: { travelKm: 1, otherCents: 0, otherDescription: "" },
    }),
  ).toBe(false);
  expect(
    validOperations({ travelKm: 0.1234, otherCents: 0, otherDescription: "" }),
  ).toBe(true);
  expect(
    validOperations({
      travelKm: 0.000001,
      otherCents: 0,
      otherDescription: "",
    }),
  ).toBe(false);
});
test("signature vectors are bounded Firestore-compatible maps and reject unexpected fields, malformed points and oversized input", () => {
  const signature = {
    version: 1,
    strokes: [{ points: [0, 0, 200, 800] }],
    confirmedAt: "",
    context: {
      reportId: "KHT-20261112-ABCDEF",
      customer: "Test",
      date: "2026-11-12",
    },
  };
  expect(signatureValid(signature)).toBe(true);
  expect(signaturePath(signature.strokes[0].points)).toContain("Q");
  expect(signatureValid({ ...signature, strokes: [[0, 0, 200, 800]] })).toBe(
    false,
  );
  expect(
    signatureValid({ ...signature, strokes: [{ points: [10001, 0] }] }),
  ).toBe(false);
  expect(
    signatureValid({
      ...signature,
      strokes: [{ points: Array(2050).fill(1) }],
    }),
  ).toBe(false);
  expect(signatureValid({ ...signature, token: "unexpected" })).toBe(false);
});
test("targeted financial cache migration preserves text, photos, signatures and operational expenses and leaves other users untouched", () => {
  const billing = {
    ...emptyBilling(),
    hourRateCents: 6000,
    travelKm: 12,
    otherCents: 500,
  };
  const own = {
      customer: "Keep",
      photos: ["local-photo"],
      signature: { strokes: [] },
      billing,
    },
    foreign = { customer: "Other user", billing };
  const values = new Map([
    ["kht-report2:employee:snapshot", JSON.stringify(own)],
    [
      "kht-report2:employee:cloud",
      JSON.stringify({
        revision: 7,
        text: JSON.stringify({ form: { customer: "Keep" }, billing }),
      }),
    ],
    ["kht-report2:other:snapshot", JSON.stringify(foreign)],
    ["unrelated", "retained"],
  ]);
  const priceKey =
    "kht-report-forms:employee:" +
    encodeURIComponent("price:KHT-20261112-ABCDEF:billing:hourRateCents");
  values.set(
    priceKey,
    JSON.stringify({ version: 1, value: { text: "60", base: 6000 } }),
  );
  values.set(
    "kht-report-forms:employee:catalog",
    JSON.stringify({
      version: 1,
      value: { name: "Keep material", purchase: "4,20", selling: "12,34" },
    }),
  );
  vi.stubGlobal("sessionStorage", {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index],
    getItem: (key: string) => values.get(key),
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  sanitizeEmployeeDrafts("employee", new Map());
  const clean = JSON.parse(values.get("kht-report2:employee:snapshot")!);
  expect(clean).not.toHaveProperty("billing");
  expect(clean).toMatchObject({
    customer: "Keep",
    photos: ["local-photo"],
    signature: { strokes: [] },
    operations: { travelKm: 12, otherCents: 500 },
  });
  expect(
    JSON.parse(JSON.parse(values.get("kht-report2:employee:cloud")!).text),
  ).not.toHaveProperty("billing");
  expect(values.get("kht-report2:other:snapshot")).toBe(
    JSON.stringify(foreign),
  );
  expect(values.get("unrelated")).toBe("retained");
  expect(stripFinancial(own)).not.toHaveProperty("billing");
  expect(values.has(priceKey)).toBe(false);
  expect(
    JSON.parse(values.get("kht-report-forms:employee:catalog")!).value,
  ).toEqual({ name: "Keep material", purchase: "", selling: "12,34" });
});
test("legacy financial migration preserves exact current prices and revision and refuses missing financial fields", async () => {
  const state = emptyReport(),
    writes = new Map<string, Document>();
  const legacy = {
    ...state,
    schemaVersion: 2,
    revision: 7,
    lastMutation: "prior-mutation",
    billing: { ...emptyBilling(), hourRateCents: 7777 },
  };
  const tx = {
    get: async (path: string) =>
      (path.startsWith("reports/")
        ? legacy
        : {
            billing: { ...emptyBilling(), hourRateCents: 1 },
            revision: 6,
          }) as unknown as Document,
    put: (path: string, value: Document) => {
      writes.set(path, value);
    },
  };
  await readWork(tx, state.id);
  expect(writes.get("reportFinances/" + state.id)).toMatchObject({
    revision: 7,
    billing: { hourRateCents: 7777 },
  });
  expect(writes.get("reports/" + state.id)).not.toHaveProperty("billing");
  writes.clear();
  await expect(
    readWork(
      {
        ...tx,
        get: async () =>
          ({ ...legacy, billing: undefined }) as unknown as Document,
      },
      state.id,
    ),
  ).rejects.toMatchObject({ code: "finance_migration_required" });
  expect(writes.size).toBe(0);
});
