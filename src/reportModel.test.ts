import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  emptyReport,
  readReport,
  saveReport,
  reportIsEmpty,
  reportErrors,
} from "./reportModel";
import { contactErrors } from "./utils";
let entries: Map<string, string>;
beforeEach(() => {
  entries = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) || null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("report persistence and validation", () => {
  it("migrates the previous report format without changing identifiers, materials or picture categories", () => {
    entries.set("kht-report-id", "KHT-20261105-ABCDEF");
    entries.set(
      "kht-report-draft",
      JSON.stringify({
        customer: "Aiempi asiakas",
        description: "Ääkköset",
        materials: [{ name: "Tiiviste", quantity: "2,5", unit: "m" }],
        photos: ["data:image/jpeg;base64,AA=="],
        photoCategories: ["after"],
      }),
    );
    const state = readReport();
    expect(state.id).toBe("KHT-20261105-ABCDEF");
    expect(state.form.customer).toBe("Aiempi asiakas");
    expect(state.form.materials[0].quantity).toBe("2,5");
    expect(state.photos[0].category).toBe("after");
    saveReport(state);
    expect(
      JSON.parse(entries.get("kht-report-draft")!).photoCategories,
    ).toEqual(["after"]);
  });
  it("recovers from corrupted storage and removes a cleared report rather than persisting personal data", () => {
    entries.set("kht-report-draft", "null");
    expect(reportIsEmpty(readReport())).toBe(true);
    entries.set("kht-report-draft", "{broken");
    expect(reportIsEmpty(readReport())).toBe(true);
    saveReport(emptyReport());
    expect(entries.size).toBe(0);
  });
  it("tolerates storage that is unavailable on startup", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(reportIsEmpty(readReport())).toBe(true);
  });
  it("validates core fields, dates and decimal amounts while allowing work across midnight", () => {
    const form = emptyReport().form;
    expect(Object.keys(reportErrors(form))).toEqual([
      "customer",
      "address",
      "worker",
      "description",
    ]);
    Object.assign(form, {
      customer: "Testi",
      address: "Testikatu",
      worker: "Tekijä",
      description: "Liitos korjattu",
      hours: "2,5",
      start: "22:00",
      end: "03:00",
    });
    expect(reportErrors(form)).toEqual({});
    form.date = "2026-02-31";
    form.hours = "-1";
    form.materials = [{ name: "Tiiviste", quantity: "-2", unit: "kpl" }];
    expect(reportErrors(form)).toHaveProperty("date");
    expect(reportErrors(form)).toHaveProperty("hours");
    expect(reportErrors(form)).toHaveProperty("materials");
  });
});
describe("contact channel and size validation", () => {
  const valid = {
    name: "Aino",
    email: "aino@example.test",
    phone: "0401234567",
    location: "Lohja",
    service: "Huolto",
    urgency: "normal",
    method: "phone",
    description: "Hana vuotaa",
    consent: true,
    honey: "",
  };
  it("requires the selected response channel and rejects invalid options", () => {
    expect(contactErrors({ ...valid, phone: "" })).toHaveProperty("phone");
    expect(
      contactErrors({ ...valid, email: "", method: "email" }),
    ).toHaveProperty("email");
    expect(contactErrors({ ...valid, urgency: "fake" })).toHaveProperty(
      "urgency",
    );
    expect(contactErrors({ ...valid, method: "fake" })).toHaveProperty(
      "method",
    );
  });
  it("rejects oversized text and malformed phone numbers", () => {
    expect(
      contactErrors({ ...valid, description: "x".repeat(3001) }),
    ).toHaveProperty("description");
    expect(contactErrors({ ...valid, phone: "abc" })).toHaveProperty("phone");
  });
});
