import { describe, expect, it } from "vitest";
import { normalizeContact } from "./shared";
import { contactErrors } from "../src/utils";
import { gasHarness } from "./gasHarness";
const base = { name: "Aino Testaaja", email: "aino@example.test", phone: "0401234567", location: "Lohja", service: "LVI-huolto", urgency: "normal", method: "both", description: "Synteettinen testipyyntö.", honey: "" };
const gas = gasHarness();
describe("preferred contact method: same browser, Worker and independent GAS validation", () => {
  it.each([
    ["phone only", { ...base, method: "phone", email: "" }],
    ["email only", { ...base, method: "email", phone: "" }],
    ["both", base],
    ["optional phone and email also supplied", { ...base, method: "phone" }],
  ])("accepts %s without changing notification values", (_, data) => {
    expect(contactErrors(data)).toEqual({}); expect(normalizeContact(data)).toEqual(data);
    expect(gas.context.contactValidate_(data)).toEqual(data);
  });
  it.each([
    ["phone missing", { ...base, method: "phone", phone: "" }],
    ["email missing", { ...base, method: "email", email: "" }],
    ["both phone missing", { ...base, phone: "" }],
    ["both email missing", { ...base, email: "" }],
    ["both missing", { ...base, phone: "", email: "" }],
    ["malformed phone", { ...base, phone: "abc12345" }],
    ["punctuation only", { ...base, phone: "-----" }],
    ["malformed email", { ...base, email: "not-an-email" }],
    ["invalid optional email", { ...base, method: "phone", email: "bad" }],
    ["invalid optional phone", { ...base, method: "email", phone: "bad" }],
    ["too long phone", { ...base, phone: "1".repeat(41) }],
    ["too long email", { ...base, email: "a".repeat(150) + "@example.test" }],
    ["unknown method", { ...base, method: "sms" }],
  ])("rejects %s on all three layers", (_, data) => {
    expect(Object.keys(contactErrors(data)).length).toBeGreaterThan(0);
    expect(normalizeContact(data)).toBeNull(); expect(() => gas.context.contactValidate_(data)).toThrow();
  });
  it("gives separate accessible Finnish errors when both channels are missing", () => {
    expect(contactErrors({ ...base, phone: "", email: "" })).toMatchObject({
      phone: "Anna puhelinnumerosi, jotta voimme soittaa sinulle.",
      email: "Anna sähköpostiosoitteesi, jotta voimme vastata sinulle.",
    });
  });
});
