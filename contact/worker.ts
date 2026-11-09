/// <reference types="@cloudflare/workers-types" />
import { MAX_BODY_BYTES, REQUEST_LIFETIME, REFERENCE, normalizeContact, newReference, validKey, sha256, hmac, type ContactFields } from "./shared";

export interface Env {
  CONTACT_GUARD: DurableObjectNamespace;
  ALLOWED_ORIGINS: string;
  TURNSTILE_HOSTNAMES: string;
  TURNSTILE_SECRET: string;
  GAS_URL: string;
  RELAY_SECRET: string;
  RATE_SECRET: string;
}
type DeliveryState = "pending" | "sent" | "unknown" | "not_sent";
type RecordState = { hash: string; reference: string; submittedAt: string; state: DeliveryState; expires: number };
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...(status === 429 ? { "Retry-After": "600" } : {}) } });
}
async function boundedText(response: Request | Response, limit: number): Promise<string> {
  if (Number(response.headers.get("Content-Length")) > limit) throw new Error("size");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("size");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const out = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(out);
}
function gasURL(url: string): boolean { return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url); }
function configured(env: Env): boolean {
  return !!env.CONTACT_GUARD && gasURL(env.GAS_URL || "") && [env.RELAY_SECRET, env.RATE_SECRET].every(s => typeof s === "string" && /^[a-f0-9]{64}$/.test(s)) && !!env.TURNSTILE_SECRET && !!env.TURNSTILE_HOSTNAMES;
}
async function internal(env: Env, name: string, path: string, body: unknown): Promise<Response> {
  return env.CONTACT_GUARD.get(env.CONTACT_GUARD.idFromName(name)).fetch("https://guard/" + path, { method: "POST", body: JSON.stringify(body) });
}
async function limit(env: Env, name: string, count: number, windowMs: number): Promise<boolean> {
  const response = await internal(env, name, "limit", { count, windowMs });
  return response.status === 200;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim());
    const path = new URL(request.url).pathname;
    if (!allowed.includes(origin) || !/^https:\/\/[^/]+$/.test(origin)) return json({ error: "origin" }, 403);
    const cors = (response: Response) => {
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", origin); headers.set("Vary", "Origin");
      return new Response(response.body, { status: response.status, headers });
    };
    if (path !== "/contact" && path !== "/contact/status") return cors(json({ error: "not_found" }, 404));
    if (request.method === "OPTIONS") {
      if (request.headers.get("Access-Control-Request-Method") !== "POST" || (request.headers.get("Access-Control-Request-Headers") || "").split(",").some(h => h.trim() && h.trim().toLowerCase() !== "content-type")) return cors(json({ error: "preflight" }, 403));
      const response = json(null, 200);
      response.headers.set("Access-Control-Allow-Methods", "POST"); response.headers.set("Access-Control-Allow-Headers", "Content-Type"); response.headers.set("Access-Control-Max-Age", "600");
      return cors(response);
    }
    if (request.method !== "POST") return cors(json({ error: "method" }, 405));
    if (!configured(env)) return cors(json({ error: "unavailable" }, 503));
    if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json" || request.headers.has("Content-Encoding")) return cors(json({ error: "content_type" }, 415));
    try {
      // Cloudflare supplies this header; never trust X-Forwarded-For or client JSON for limits.
      const ip = request.headers.get("CF-Connecting-IP");
      if (!ip) return cors(json({ error: "unavailable" }, 503));
      const ipHash = await hmac(env.RATE_SECRET, `${Math.floor(Date.now() / 600_000)}:${ip}`);
      if (!await limit(env, "ip:" + ipHash, 5, 600_000)) return cors(json({ error: "rate_limited", retryAfter: 600 }, 429));
      let body;
      try { body = JSON.parse(await boundedText(request, MAX_BODY_BYTES)); }
      catch { return cors(json({ error: "invalid_request" }, 400)); }
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(k => !["requestKey", "token", "data"].includes(k))) return cors(json({ error: "invalid_request" }, 400));
      if (!validKey(body.requestKey)) return cors(json({ error: "expired_request" }, 410));
      const data = path === "/contact" ? normalizeContact(body.data) : null;
      if (path === "/contact" && !data) return cors(json({ error: "validation" }, 422));
      if (typeof body.token !== "string" || !body.token || body.token.length > 2048) return cors(json({ error: "challenge" }, 403));
      let verified;
      try {
        const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: body.token, remoteip: ip }), signal: AbortSignal.timeout(8000) });
        if (!verification.ok) throw new Error("turnstile");
        verified = JSON.parse(await boundedText(verification, 8192));
      } catch { return cors(json({ error: "challenge_unavailable" }, 503)); }
      if (verified.success !== true || verified.action !== "contact" || !env.TURNSTILE_HOSTNAMES.split(",").map(s => s.trim()).includes(verified.hostname)) return cors(json({ error: "challenge" }, 403));
      const keyHash = await sha256(body.requestKey);
      const response = await internal(env, "request:" + keyHash, path === "/contact" ? "submit" : "status", { keyHash, data, expires: Number(body.requestKey.split(".")[1]) + REQUEST_LIFETIME });
      return cors(response);
    } catch {
      // No request bodies, provider errors, secrets or customer data in logs/responses.
      return cors(json({ error: "unknown" }, 503));
    }
  },
};

async function google(env: Env, payload: object): Promise<{ state: DeliveryState | "not_found"; reference?: string }> {
  const message = JSON.stringify({ v: 1, timestamp: Date.now(), ...payload });
  const signature = await hmac(env.RELAY_SECRET, "request\n" + message);
  const signal = AbortSignal.timeout(20_000);
  let response = await fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, signature }), redirect: "manual", signal });
  // ContentService returns an output-only redirect. Never forward the signed body to it.
  if ([301, 302, 303].includes(response.status)) {
    const target = new URL(response.headers.get("Location") || "");
    if (target.protocol !== "https:" || target.hostname !== "script.googleusercontent.com" || target.username || target.password || target.port) throw new Error("redirect");
    await response.body?.cancel();
    response = await fetch(target.href, { method: "GET", redirect: "manual", signal });
  }
  if (!response.ok) throw new Error("google");
  const result = JSON.parse(await boundedText(response, 8192));
  if (typeof result.message !== "string" || typeof result.signature !== "string" || result.signature !== await hmac(env.RELAY_SECRET, "response\n" + result.message)) throw new Error("receipt");
  const receipt = JSON.parse(result.message);
  const sent = payload as { keyHash: string; reference?: string };
  if (receipt.keyHash !== sent.keyHash || (sent.reference && receipt.reference !== sent.reference) || !["sent", "unknown", "not_sent", "not_found"].includes(receipt.state)) throw new Error("receipt");
  return receipt;
}

/** SQLite-backed namespace. Only hashes, reference, timestamps and delivery state persist. */
export class ContactGuard {
  constructor(private ctx: DurableObjectState, private env: Env) {}
  async alarm(): Promise<void> { await this.ctx.storage.deleteAll(); }
  async fetch(request: Request): Promise<Response> {
    const body = await request.json() as { count: number; windowMs: number; keyHash: string; data: ContactFields | null; expires: number };
    const path = new URL(request.url).pathname;
    if (path === "/limit") {
      const accepted = await this.ctx.storage.transaction(async tx => {
        const now = Date.now();
        let bucket = await tx.get<{ count: number; until: number }>("bucket");
        if (!bucket || bucket.until <= now) bucket = { count: 0, until: now + body.windowMs };
        if (bucket.count >= body.count) return false;
        bucket.count++; await tx.put("bucket", bucket); await tx.setAlarm(bucket.until); return true;
      });
      return json({}, accepted ? 200 : 429);
    }
    const hash = body.data ? await sha256(JSON.stringify(body.data)) : "";
    const claim = await this.ctx.storage.transaction(async tx => {
      const existing = await tx.get<RecordState>("request");
      if (existing) return { record: existing, fresh: false };
      if (path !== "/submit" || !body.data) return null;
      const record: RecordState = { hash, reference: newReference(), submittedAt: new Date().toISOString(), state: "pending", expires: body.expires };
      await tx.put("request", record); await tx.setAlarm(record.expires);
      return { record, fresh: true };
    });
    if (!claim) return json({ error: "not_found" }, 404);
    const { record, fresh } = claim;
    if (path === "/submit" && record.hash !== hash) return json({ error: "idempotency_conflict", reference: record.reference }, 409);
    if (fresh) {
      // Budgets are durable and apply only to new email attempts, never status lookups.
      const hour = Math.floor(Date.now() / 3_600_000), day = Math.floor(Date.now() / 86_400_000);
      if (!await limit(this.env, "hour:" + hour, 20, 3_600_000) || !await limit(this.env, "day:" + day, 80, 86_400_000)) {
        record.state = "not_sent";
      } else {
        try {
          const receipt = await google(this.env, { operation: "send", keyHash: body.keyHash, hash, reference: record.reference, submittedAt: record.submittedAt, expires: record.expires, data: body.data });
          record.state = receipt.state === "sent" ? "sent" : receipt.state === "not_sent" ? "not_sent" : "unknown";
        } catch { record.state = "unknown"; }
      }
      await this.ctx.storage.put("request", record);
    } else if ((record.state === "pending" && Date.now() - Date.parse(record.submittedAt) > 30_000) || record.state === "unknown") {
      // Recovery only reads Google's ledger. An ambiguous MailApp side effect is never retried.
      try {
        const receipt = await google(this.env, { operation: "status", keyHash: body.keyHash, reference: record.reference });
        if (receipt.state === "sent") record.state = "sent";
        else if (receipt.state === "not_sent") record.state = "not_sent";
        else record.state = "unknown";
        await this.ctx.storage.put("request", record);
      } catch { record.state = "unknown"; }
    }
    const status = record.state === "sent" ? 200 : record.state === "not_sent" ? 503 : 202;
    return json({ state: record.state, reference: record.reference, submittedAt: record.submittedAt, expires: record.expires }, status);
  }
}
