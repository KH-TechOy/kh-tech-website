// Stored work schedules are Helsinki wall-clock strings, NOT UTC instants.
// Never pass these through new Date(localString) or toISOString().
export function isoDate(value: string) {
  const parts = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  const iso = parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number),
    check = new Date(Date.UTC(y, m - 1, d));
  return y >= 1000 && check.toISOString().slice(0, 10) === iso ? iso : null;
}
export function finnishDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").reverse().join(".")
    : value;
}
export const timeValid = (value: string) =>
  /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const helsinki = new Intl.DateTimeFormat("fi-FI", {
  timeZone: "Europe/Helsinki",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function finnishTimestamp(value: string) {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return value;
  const p = Object.fromEntries(
    helsinki.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
}
export const helsinkiToday = (date = new Date()) =>
  isoDate(finnishTimestamp(date.toISOString()).split(" ")[0])!;
export function scheduleLabel(value: string) {
  if (!value) return "Ajankohta avoin";
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return finnishTimestamp(value);
  const [date, time] = value.split("T");
  return finnishDate(date) + (time ? " " + time : "");
}
export function workSchedule(date: string, time: string) {
  if (!date.trim() && !time.trim()) return "";
  const iso = isoDate(date);
  if (!iso || (time && !timeValid(time)))
    throw new Error(
      "Anna päivämäärä muodossa pp.kk.vvvv ja kellonaika muodossa HH:mm. Kellonaika tarvitsee päivämäärän.",
    );
  if (time) {
    const utc = Date.parse(iso + "T" + time + ":00Z");
    const expected = `${finnishDate(iso)} ${time}`;
    // Test possible local offsets without converting the stored wall-clock value.
    if (
      ![2, 3].some(
        (offset) =>
          finnishTimestamp(new Date(utc - offset * 3600000).toISOString()) ===
          expected,
      )
    )
      throw new Error(
        "Tätä kellonaikaa ei ole Suomen kesäaikaan siirtymispäivänä. Valitse toinen kellonaika.",
      );
  }
  return iso + (time ? "T" + time : "");
}
export function priceCents(
  value: string,
  optional = false,
  maximum = 100000000,
): number | null {
  const input = value.trim();
  if (!input && optional) return null;
  if (!/^\d+(?:[.,]\d{0,4})?$/.test(input))
    throw new Error("Anna nolla tai positiivinen hinta, esimerkiksi 12,50.");
  const [whole, decimals = ""] = input.replace(",", ".").split(".");
  const fraction = decimals.padEnd(3, "0");
  const cents =
    Number(whole) * 100 +
    Number(fraction.slice(0, 2)) +
    (Number(fraction[2]) >= 5 ? 1 : 0);
  if (!Number.isSafeInteger(cents) || cents > maximum)
    throw new Error("Hinta on liian suuri.");
  return cents;
}
export const priceText = (cents: number | null) =>
  cents === null ? "" : String(cents / 100).replace(".", ",");
