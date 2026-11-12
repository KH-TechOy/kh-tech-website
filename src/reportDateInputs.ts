import { finnishDate, isoDate } from "./reportLocale";
// Mobile numeric keyboards need no punctuation keys: 12112026 / 0930 work too.
export function dateEntry(raw: string) {
  const iso = isoDate(raw);
  if (iso) return finnishDate(iso);
  if (!/^[\d.]*$/.test(raw)) return raw;
  const digits = raw.replace(/\./g, "");
  if (digits.length > 8) return raw;
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
    .filter(Boolean)
    .join(".");
}
export function timeEntry(raw: string) {
  if (!/^[\d:]*$/.test(raw)) return raw;
  const digits = raw.replace(/:/g, "");
  return digits.length > 4
    ? raw
    : digits.length > 2
      ? digits.slice(0, 2) + ":" + digits.slice(2)
      : digits;
}
