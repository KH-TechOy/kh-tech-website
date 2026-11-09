import { REFERENCE, validKey } from "../contact/shared";
import type { ContactData } from "./utils";
const endpoint = (import.meta.env.VITE_CONTACT_API_URL || "").trim();
export const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();
export const contactConfigured = /^https:\/\/[^/@?#]+\/contact$/.test(endpoint) && /^[a-zA-Z0-9_-]{10,100}$/.test(turnstileSiteKey);
export const PENDING_KEY = "kht-contact-pending";
export type ContactPending = { key: string; reference?: string };
export function readPending(): ContactPending | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
    // Keep an expired recovery marker visible: never silently start another email after expiry.
    if (value && typeof value.key === "string" && /^v1\.\d{13}\.[a-f0-9-]{36}$/.test(value.key)) return { key: value.key, reference: REFERENCE.test(value.reference) ? value.reference : undefined };
  } catch { /* unavailable storage is handled in the submit UI */ }
  return null;
}
export function savePending(value: ContactPending | null): boolean {
  try { if (value) sessionStorage.setItem(PENDING_KEY, JSON.stringify(value)); else sessionStorage.removeItem(PENDING_KEY); return true; }
  catch { return false; }
}
export type DeliveryResult = { state: "sent" | "pending" | "unknown" | "not_sent"; reference: string };
export class DeliveryError extends Error { constructor(public code: string) { super(code); } }
export async function contactRequest(pending: ContactPending, token: string, data?: ContactData): Promise<DeliveryResult> {
  if (!contactConfigured) throw new DeliveryError("unavailable");
  if (!validKey(pending.key)) throw new DeliveryError("expired_request");
  let response: Response;
  try {
    response = await fetch(endpoint + (data ? "" : "/status"), { method: "POST", mode: "cors", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestKey: pending.key, token, ...(data ? { data } : {}) }), signal: AbortSignal.timeout(35_000) });
  } catch { throw new DeliveryError("unknown"); }
  let result;
  try { result = await response.json(); } catch { throw new DeliveryError("unknown"); }
  if (REFERENCE.test(result.reference) && ["sent", "pending", "unknown", "not_sent"].includes(result.state)) {
    if (result.state === "sent" && response.status !== 200) throw new DeliveryError("unknown");
    return { state: result.state, reference: result.reference };
  }
  // Explicit gateway errors happen before the email attempt. Other errors remain ambiguous.
  const known = ["validation", "challenge", "challenge_unavailable", "rate_limited", "expired_request", "not_found", "idempotency_conflict", "origin", "unavailable"];
  throw new DeliveryError(known.includes(result.error) ? result.error : "unknown");
}
export function deliveryErrorText(code: string): string {
  if (code === "challenge" || code === "challenge_unavailable") return "Turvatarkistus ei onnistunut. Tee tarkistus uudelleen tai ota yhteyttä puhelimitse.";
  if (code === "rate_limited") return "Pyyntöjä on tehty liian monta. Odota vähintään 10 minuuttia ennen uutta yritystä tai soita yritykselle.";
  if (code === "validation") return "Palvelin hylkäsi lomakkeen tiedot. Tarkista kentät ja yhteystietojen muoto.";
  if (code === "expired_request") return "Lähetyksen tarkistusaika on päättynyt. Älä lähetä samaa pyyntöä uudelleen varmistamatta asiaa puhelimitse. Kerro mahdollinen pyyntötunnus.";
  if (code === "not_found") return "Lähetyksestä ei löytynyt vahvistusta. Tämä ei takaa, ettei viesti olisi lähtenyt. Varmista tilanne puhelimitse ennen uutta pyyntöä.";
  if (code === "unavailable" || code === "origin") return "Lähetyspalvelu ei ole käytettävissä. Ota yhteyttä puhelimitse tai sähköpostilla.";
  return "Lähetystä ei voitu vahvistaa. Älä lähetä samaa pyyntöä uudelleen. Tarkista lähetyksen tila tai soita yritykselle.";
}
