export const CONTACT_FIELDS = ["name", "email", "phone", "location", "service", "urgency", "method", "description", "honey"] as const;
export type ContactFields = Record<typeof CONTACT_FIELDS[number], string>;
export const SERVICES = ["", "LVI-huolto", "Putkimuutostyöt", "Verkostojen tasapainotus", "Käyttövesi- ja viemärisaneeraukset", "Muu LVI-työ"];
export const MAX_BODY_BYTES = 16_384;
export const REQUEST_LIFETIME = 48 * 60 * 60 * 1000;
export const REFERENCE = /^KHT-\d{8}-[A-F0-9]{12}$/;
export const CONTACT_METHODS = ["phone", "email", "both"];
export function contactRequirements(method: string) {
  return { phone: method === "phone" || method === "both", email: method === "email" || method === "both" };
}
export function validContactEmail(email: string): boolean {
  return email.length <= 160 && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,63}$/.test(email);
}
export function validContactPhone(phone: string): boolean {
  return /^\+?[\d ()-]{5,40}$/.test(phone) && phone.replace(/\D/g, "").length >= 5;
}
export function validKey(key: unknown, now = Date.now()): key is string {
  if (typeof key !== "string" || !/^v1\.\d{13}\.[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(key)) return false;
  const age = now - Number(key.split(".")[1]);
  return age >= -60_000 && age < REQUEST_LIFETIME;
}
export function normalizeContact(input: unknown): ContactFields | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  if (Object.keys(raw).some(k => !(CONTACT_FIELDS as readonly string[]).includes(k))) return null;
  const data = {} as ContactFields;
  for (const key of CONTACT_FIELDS) {
    const value = raw[key];
    const max = key === "description" ? 3000 : key === "email" ? 160 : key === "phone" ? 40 : key === "urgency" || key === "method" ? 10 : 120;
    if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return null;
    if (key !== "description" && /[\r\n\t]/.test(value)) return null;
    data[key] = value.trim().replace(/\r\n?/g, "\n");
  }
  if (!data.name || !data.description || data.honey || !SERVICES.includes(data.service)) return null;
  if (!["normal", "soon", "urgent"].includes(data.urgency) || !CONTACT_METHODS.includes(data.method)) return null;
  const required = contactRequirements(data.method);
  if ((required.phone && !data.phone) || (required.email && !data.email)) return null;
  if (data.email && !validContactEmail(data.email)) return null;
  if (data.phone && !validContactPhone(data.phone)) return null;
  return data;
}
export function newReference(now = new Date()): string {
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit" }).format(now).replace(/-/g, "");
  const random = crypto.getRandomValues(new Uint8Array(6));
  return `KHT-${day}-${Array.from(random, b => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
export async function sha256(value: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
function hex(value: ArrayBuffer): string { return Array.from(new Uint8Array(value), b => b.toString(16).padStart(2, "0")).join(""); }
export async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}
