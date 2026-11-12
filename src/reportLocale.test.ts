import { describe, expect, test } from "vitest";
import {
  finnishDate,
  isoDate,
  finnishTimestamp,
  helsinkiToday,
  priceCents,
  priceText,
  scheduleLabel,
  workSchedule,
} from "./reportLocale";
import { dateEntry, timeEntry } from './reportDateInputs';
test('mobile numeric-keyboard entry needs no dot or colon key and preserves incomplete text', () => {
  expect(dateEntry('12112026')).toBe('12.11.2026');
  expect(dateEntry('2026-11-12')).toBe('12.11.2026');
  expect(dateEntry('12112')).toBe('12.11.2');
  expect(timeEntry('0930')).toBe('09:30');
  expect(timeEntry('09:30')).toBe('09:30');
  expect(timeEntry('09')).toBe('09');
});
describe("Finnish date/time presentation without stored-value conversion", () => {
  test("keeps Helsinki wall-clock schedules identical, including repeated autumn hours", () => {
    for (const schedule of [
      "2026-01-15T09:05",
      "2026-07-15T09:05",
      "2026-10-25T03:30",
    ]) {
      const [date, time] = schedule.split("T");
      expect(workSchedule(finnishDate(date), time)).toBe(schedule);
      expect(scheduleLabel(schedule)).toBe(finnishDate(date) + " " + time);
    }
  });
  test("rejects missing spring hours, impossible calendar dates and incomplete schedules", () => {
    expect(() => workSchedule("29.03.2026", "03:30")).toThrow("kesäaikaan");
    expect(() => workSchedule("31.02.2026", "10:00")).toThrow();
    expect(() => workSchedule("", "09:00")).toThrow();
    expect(() => workSchedule("12.11.2026", "9:00 PM")).toThrow();
    expect(isoDate("29.02.2028")).toBe("2028-02-29");
    expect(isoDate("29.02.2026")).toBeNull();
  });
  test("allows empty and date-only schedules", () => {
    expect(workSchedule("", "")).toBe("");
    expect(scheduleLabel("")).toBe("Ajankohta avoin");
    expect(workSchedule("12.11.2026", "")).toBe("2026-11-12");
    expect(scheduleLabel("2026-11-12")).toBe("12.11.2026");
  });
  test("formats actual UTC timestamps and new report dates in Helsinki, with zero padding and 24-hour time", () => {
    expect(finnishTimestamp("2026-01-02T22:05:00Z")).toBe("03.01.2026 00:05");
    expect(finnishTimestamp("2026-07-02T21:05:00Z")).toBe("03.07.2026 00:05");
    expect(helsinkiToday(new Date("2026-07-02T21:05:00Z"))).toBe("2026-07-03");
    expect(scheduleLabel("2026-01-02T22:05:00Z")).toBe("03.01.2026 00:05");
  });
});
describe("money commit validation", () => {
  test("normalizes Finnish and dot decimals, leading zeros and exact half-cent rounding", () => {
    expect(priceCents("50")).toBe(5000);
    expect(priceCents("050")).toBe(5000);
    expect(priceCents("12,34")).toBe(1234);
    expect(priceCents("12.34")).toBe(1234);
    expect(priceCents("1,005")).toBe(101);
    expect(priceCents("0")).toBe(0);
    expect(priceText(1234)).toBe("12,34");
    expect(priceText(null)).toBe("");
  });
  test("rejects negative, invalid, infinite and excessive amounts; optional empty is not zero", () => {
    for (const value of ["", "-1", "1e3", "Infinity", "1,2,3", "1000000,01"])
      expect(() => priceCents(value)).toThrow();
    expect(priceCents("", true)).toBeNull();
    expect(priceCents("1000000")).toBe(100000000);
  });
});
