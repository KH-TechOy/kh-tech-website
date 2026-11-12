import { expect, test } from "vitest";
import { retentionWindow } from "./reportRetention";
test("retention eligibility has an exact boundary, including leap years, without a deletion side effect", () => {
  const approved = "2024-02-29T12:00:00.000Z",
    deadline = Date.parse(approved) + 730 * 86400000;
  expect(retentionWindow(approved, 730, deadline - 1)).toMatchObject({
    eligible: false,
  });
  expect(retentionWindow(approved, 730, deadline)).toEqual({
    minimumDays: 730,
    eligibleAt: new Date(deadline).toISOString(),
    eligible: true,
  });
  expect(retentionWindow(approved, 730, deadline + 86400000)).toMatchObject({
    eligible: true,
  });
});
test("missing or invalid policy durations and unverified approval dates do not produce eligibility", () => {
  for (const days of [null, undefined, -1, 0.5, 36501])
    expect(retentionWindow("2026-11-12T12:00:00.000Z", days)).toBeNull();
  expect(retentionWindow(undefined, 730)).toBeNull();
  expect(retentionWindow("invalid", 730)).toBeNull();
});
