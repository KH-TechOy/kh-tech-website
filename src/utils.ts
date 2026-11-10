import { CONTACT_METHODS, contactRequirements, validContactEmail, validContactPhone } from "../contact/shared";
export type ContactData = {
  name: string;
  email: string;
  phone: string;
  location: string;
  service: string;
  urgency: string;
  method: string;
  description: string;
  honey: string;
};
function secureRandom() {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] % 0x1000000;
}
export function createReportId(date = new Date(), random = secureRandom()) {
  const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `KHT-${day}-${random.toString(16).toUpperCase().padStart(6, "0").slice(-6)}`;
}
export function resolveRoute(pathname: string, basePath: string) {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const cleanBase = basePath.replace(/\/+$/, "");
  return cleanBase && cleanPath.startsWith(cleanBase)
    ? cleanPath.slice(cleanBase.length) || "/"
    : cleanPath;
}
export function contactErrors(
  d: ContactData,
): Partial<Record<keyof ContactData, string>> {
  const errors: Partial<Record<keyof ContactData, string>> = {};
  if (!d.name.trim()) errors.name = "Lisää nimesi.";
  else if (d.name.length > 120)
    errors.name = "Nimi voi olla enintään 120 merkkiä.";
  const required = contactRequirements(d.method);
  if (required.phone && !d.phone.trim())
    errors.phone = "Anna puhelinnumerosi, jotta voimme soittaa sinulle.";
  if (required.email && !d.email.trim())
    errors.email = "Anna sähköpostiosoitteesi, jotta voimme vastata sinulle.";
  if (
    (d.email.trim() && !validContactEmail(d.email.trim())) || d.email.length > 160
  )
    errors.email = "Tarkista sähköpostiosoite.";
  if (
    (d.phone.trim() && !validContactPhone(d.phone.trim())) || d.phone.length > 40
  )
    errors.phone = "Tarkista puhelinnumero.";
  if (d.location.length > 120)
    errors.location = "Sijainti voi olla enintään 120 merkkiä.";
  if (!d.description.trim())
    errors.description = "Kuvaile lyhyesti työn tarvetta.";
  else if (d.description.length > 3000)
    errors.description = "Kuvaus voi olla enintään 3000 merkkiä.";
  if (!["normal", "soon", "urgent"].includes(d.urgency))
    errors.urgency = "Valitse työn ajankohta uudelleen.";
  if (!CONTACT_METHODS.includes(d.method))
    errors.method = "Valitse yhteydenottotapa uudelleen.";
  if (d.honey) errors.honey = "Lomaketta ei voitu käsitellä.";
  return errors;
}
export function validateContact(d: ContactData) {
  return Object.values(contactErrors(d))[0] || "";
}
