import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { mkdirSync, writeFileSync } from "node:fs";
import { normalizeContact, newReference, validKey, sha256, REQUEST_LIFETIME } from "./shared";
import { gasHarness, testSecret } from "./gasHarness";

const data = { name: "Aino Testaaja", email: "aino@example.test", phone: "", location: "Lohja", service: "LVI-huolto", urgency: "urgent", method: "email", description: 'Vuotava hana. <script>alert("x")</script>\nToinen rivi.', honey: "" };
const key = () => `v1.${Date.now()}.${crypto.randomUUID()}`;
const origin = "https://kh-techoy.github.io";
const fixture = gasHarness();
let mf: Miniflare;
let mode = "ok", verifyMode = "ok", relayCalls = 0, unexpected = 0;
let verifyCalls = 0;
const outbound: string[] = [];
const expectedKey = "b2".repeat(32);
beforeAll(async () => {
  execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "deploy", "--dry-run", "--config", "contact/wrangler.jsonc", "--outdir", "../.playwright-artifacts/contact30-worker"], { env: { ...process.env, WRANGLER_SEND_METRICS: "false" }, stdio: "pipe" });
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, scriptPath: ".playwright-artifacts/contact30-worker/worker.js", compatibilityDate: "2026-11-01", durableObjects: { CONTACT_GUARD: { className: "ContactGuard", useSQLite: true } }, bindings: { ALLOWED_ORIGINS: origin, TURNSTILE_HOSTNAMES: "kh-techoy.github.io", GAS_URL: "https://script.google.com/macros/s/local-test/exec", RELAY_SECRET: testSecret, RATE_SECRET: expectedKey, TURNSTILE_SECRET: "server-only-test-secret" },
    outboundService: async request => {
      const url = new URL(request.url);
      outbound.push(url.hostname);
      if (url.hostname === "challenges.cloudflare.com") {
        verifyCalls++;
        if (verifyMode === "network") throw new Error("offline");
        return Response.json({ success: verifyMode !== "invalid", action: verifyMode === "action" ? "other" : "contact", hostname: verifyMode === "hostname" ? "evil.test" : "kh-techoy.github.io" });
      }
      if (url.hostname === "script.google.com") {
        relayCalls++;
        const raw = await request.text();
        if (mode === "network") throw new Error("offline");
        if (mode === "evilRedirect") return new Response(null, { status: 302, headers: { Location: "https://evil.test/collect" } });
        const result = fixture.post(raw);
        if (mode === "loseReceipt") throw new Error("lost response after MailApp");
        if (mode === "redirect") { redirected = JSON.stringify(result); return new Response(null, { status: 302, headers: { Location: "https://script.googleusercontent.com/macros/echo?test=1" } }); }
        if (mode === "badSignature") result.signature = "0".repeat(64);
        return Response.json(result);
      }
      if (url.hostname === "script.googleusercontent.com") {
        expect(request.method).toBe("GET"); expect(await request.text()).toBe(""); return new Response(redirected, { headers: { "Content-Type": "application/json" } });
      }
      unexpected++; throw new Error("unexpected network");
    },
  }));
}, 60_000);
let redirected = "";
afterAll(async () => { await mf?.dispose(); expect(unexpected).toBe(0); });
let ip = 1;
async function submit(body: unknown, path = "/contact", extra: Record<string, string> = {}) {
  return mf.dispatchFetch("https://api.example.test" + path, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": `192.0.2.${ip++}`, ...extra }, body: typeof body === "string" ? body : JSON.stringify(body) });
}

describe("contact validation and reference", () => {
  it("accepts original fields, rejects injection headers, relay fields and invalid enums", () => {
    expect(normalizeContact(data)).toEqual(data);
    for (const invalid of [{ ...data, email: "victim@example.test\r\nBcc: evil@example.test" }, { ...data, to: "evil@example.test" }, { ...data, method: "post" }, { ...data, urgency: "emergency" }, { ...data, service: "made up" }, { ...data, honey: "bot" }, { ...data, name: null }, { ...data, description: "x".repeat(3001) }, { ...data, email: "", method: "email" }]) expect(normalizeContact(invalid)).toBeNull();
  });
  it("creates 10,000 cryptographic references and uses Finnish calendar date", () => {
    const refs = new Set(Array.from({ length: 10000 }, () => newReference(new Date("2026-11-08T23:30:00Z"))));
    expect(refs.size).toBe(10000); expect([...refs].every(r => /^KHT-20261109-[A-F0-9]{12}$/.test(r))).toBe(true);
    expect(validKey(key())).toBe(true); expect(validKey(`v1.${Date.now() - REQUEST_LIFETIME - 1}.${crypto.randomUUID()}`)).toBe(false);
  });
});
describe("real workerd + SQLite Durable Object + Apps Script protocol (all external services substituted)", () => {
  it("allows only exact origins, JSON, POST and bounded bodies; rejects arbitrary recipient", async () => {
    expect((await submit({}, "/contact", { Origin: "https://evil.test" })).status).toBe(403);
    expect((await submit({}, "/contact", { "Content-Type": "text/plain" })).status).toBe(415);
    expect((await submit("x".repeat(16385))).status).toBe(400);
    expect((await submit({ requestKey: key(), data: { ...data, to: "evil@example.test" }, token: "ok" })).status).toBe(422);
    const preflight = await mf.dispatchFetch("https://api.example.test/contact", { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect((await mf.dispatchFetch("https://api.example.test/contact", { headers: { Origin: origin } })).status).toBe(405);
  });
  it("verifies Turnstile success, action and hostname before calling Google", async () => {
    const before = relayCalls;
    for (const value of ["invalid", "action", "hostname", "network"]) { verifyMode = value; expect((await submit({ requestKey: key(), token: "token", data })).status).toBe(value === "network" ? 503 : 403); }
    verifyMode = "ok"; expect(relayCalls).toBe(before); expect(verifyCalls).toBeGreaterThan(0);
  });
  it("sends one plain Finnish email and authenticates the receipt; deduplicates concurrent retries", async () => {
    mode = "redirect"; const requestKey = key(), before = fixture.sent.length;
    const responses = await Promise.all(Array.from({ length: 4 }, () => submit({ requestKey, token: "fresh-test-token", data })));
    const results = await Promise.all(responses.map(r => r.json())) as any[];
    const sent = results.find(r => r.state === "sent");
    expect(sent, JSON.stringify({ results, outbound, emails: fixture.sent.length })).toBeDefined();
    expect(sent.reference).toMatch(/^KHT-\d{8}-[A-F0-9]{12}$/); expect(fixture.sent.length).toBe(before + 1);
    expect(new Set(results.map(r => r.reference)).size).toBe(1);
    const email = fixture.sent.at(-1)!;
    expect(email.to).toBe("notification@example.test"); expect(email.replyTo).toBe(data.email);
    expect(email.subject).toContain(`[TARJOUSPYYNTÖ][${sent.reference}][KIIREELLINEN]`);
    for (const text of [data.name, data.email, data.location, data.service, data.description, sent.reference, "Vastaanotettu", "ei takaa"]) expect(email.body).toContain(text);
    expect(email.htmlBody).toBeUndefined();
    expect(JSON.stringify(results)).not.toContain("notification@");
    const conflict = await submit({ requestKey, token: "fresh", data: { ...data, name: "Different" } }); expect(conflict.status).toBe(409);
    mode = "ok";
  });
  it("rejects expired replay keys instead of silently sending a new request", async () => {
    const before = fixture.sent.length;
    expect((await submit({ requestKey: `v1.${Date.now() - REQUEST_LIFETIME - 1}.${crypto.randomUUID()}`, token: "ok", data })).status).toBe(410);
    expect(fixture.sent.length).toBe(before);
  });
  it("recovers a lost Google response with status-only lookup and never resends", async () => {
    const requestKey = key(), before = fixture.sent.length; mode = "loseReceipt";
    const first: any = await (await submit({ requestKey, token: "ok", data })).json();
    expect(first.state).toBe("unknown"); mode = "ok";
    const status: any = await (await submit({ requestKey, token: "fresh" }, "/contact/status")).json();
    expect(status.state).toBe("sent"); expect(status.reference).toBe(first.reference); expect(fixture.sent.length).toBe(before + 1);
  });
  it.each(["phone", "email", "both"])("enforces %s through the Worker and sends the matching MailApp notification", async method => {
    const fields = { ...data, method, phone: method === "email" ? "" : "0401234567", email: method === "phone" ? "" : data.email };
    const before = fixture.sent.length;
    const response = await submit({ requestKey: key(), token: "valid-fixture", data: fields });
    expect(response.status).toBe(200);
    const result: any = await response.json(); expect(result.state).toBe("sent");
    expect(fixture.sent.length).toBe(before + 1);
    const mail = fixture.sent.at(-1)!;
    expect(mail.body).toContain(({ phone: "Soitto puhelimeen", email: "Vastaus sähköpostilla", both: "Puhelin ja sähköposti" })[method]);
    expect(mail.replyTo).toBe(method === "phone" ? undefined : data.email);
    for (const field of method === "both" ? ["phone", "email"] : [method]) {
      expect((await submit({ requestKey: key(), token: "valid-fixture", data: { ...fields, [field]: "" } })).status).toBe(422);
    }
    expect(fixture.sent.length).toBe(before + 1);
  });
  it("does not treat redirect attacks, invalid receipts or network failures as success", async () => {
    for (const value of ["evilRedirect", "badSignature", "network"]) {
      mode = value; const result: any = await (await submit({ requestKey: key(), token: "ok", data })).json(); expect(result.state).toBe("unknown");
    }
    mode = "ok";
  });
  it("rate limits by Cloudflare IP; client-supplied forwarded IP does not bypass it", async () => {
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await submit({ requestKey: key(), token: "bad", data }, "/contact", { "CF-Connecting-IP": "198.51.100.1", "X-Forwarded-For": `203.0.113.${i}` })).status);
    expect(codes.at(-1)).toBe(429);
  });
  it("caps new sends globally without counting status retries as sends", async () => {
    const namespace = await mf.getDurableObjectNamespace("CONTACT_GUARD");
    const stub = namespace.get(namespace.idFromName("hour:" + Math.floor(Date.now() / 3600000)));
    for (let i = 0; i < 20; i++) await stub.fetch("https://guard/limit", { method: "POST", body: JSON.stringify({ count: 20, windowMs: 3600000 }) });
    const before = fixture.sent.length;
    const result: any = await (await submit({ requestKey: key(), token: "ok", data })).json();
    expect(result.state).toBe("not_sent"); expect(fixture.sent.length).toBe(before);
    const checks = process.env.CONTACT_CHECKS || "docs/contact31-checks";
    mkdirSync(checks, { recursive: true });
    writeFileSync(checks + "/local-runtime.json", JSON.stringify({ environment: "local workerd + SQLite Durable Objects, Google/Turnstile/MailApp substituted, no real email", outboundEndpointsRestricted: unexpected === 0, relayCalls, simulatedEmails: fixture.sent.length, actualDeliveryTested: false }, null, 2));
  });
});
describe("Apps Script independent security boundary", () => {
  it("rejects forged signatures, stale envelopes, oversized UTF-8 and malformed fields", async () => {
    const gas = gasHarness();
    expect(gas.post(JSON.stringify({ message: "{}", signature: "fake" })).error).toBe("rejected");
    expect(gas.decoded({ timestamp: 0, keyHash: "f".repeat(64), operation: "status" }).error).toBe("rejected");
    expect(gas.post("ä".repeat(20000)).error).toBe("rejected");
    const payload = { operation: "send", keyHash: "f".repeat(64), reference: newReference(), submittedAt: new Date().toISOString(), expires: Date.now() + REQUEST_LIFETIME - 1000, hash: await sha256(JSON.stringify(data)), data };
    expect(gas.decoded({ ...payload, data: { ...data, to: "evil@example.test" } }).error).toBe("rejected"); expect(gas.sent).toHaveLength(0);
  });
  it("keeps uncertain MailApp attempts terminal and does not duplicate after lost ledger update", async () => {
    const gas = gasHarness(); gas.controls.failSentWrite = true;
    const payload = { operation: "send", keyHash: "f".repeat(64), reference: newReference(), submittedAt: new Date().toISOString(), expires: Date.now() + REQUEST_LIFETIME - 1000, hash: await sha256(JSON.stringify(data)), data };
    expect(gas.decoded(payload).error).toBe("rejected");
    gas.controls.failSentWrite = false;
    expect(gas.decoded(payload).state).toBe("unknown"); expect(gas.sent).toHaveLength(1);
    expect(gas.decoded({ ...payload, data: { ...data, name: "changed" } }).error).toBe("rejected");
  });
  it("checks quota before MailApp and purges only expired technical records", async () => {
    const gas = gasHarness(); gas.controls.quota = 0;
    const payload = { operation: "send", keyHash: "f".repeat(64), reference: newReference(), submittedAt: new Date().toISOString(), expires: Date.now() + REQUEST_LIFETIME - 1000, hash: await sha256(JSON.stringify(data)), data };
    expect(gas.decoded(payload).state).toBe("not_sent"); expect(gas.sent).toHaveLength(0);
    gas.props.set("contact:old", JSON.stringify({ expires: 0 })); gas.props.set("reference:old", "0"); gas.context.cleanupContactLedger();
    expect(gas.props.has("contact:old")).toBe(false); expect(gas.props.get("RELAY_SECRET")).toBe(testSecret);
    expect(createHmac("sha256", testSecret).update("test").digest("hex")).toHaveLength(64);
  });
  it("treats a MailApp exception as uncertain and does not retry it", async () => {
    const gas = gasHarness(); gas.controls.throwMail = true;
    const payload = { operation: "send", keyHash: "f".repeat(64), reference: newReference(), submittedAt: new Date().toISOString(), expires: Date.now() + REQUEST_LIFETIME - 1000, hash: await sha256(JSON.stringify(data)), data };
    expect(gas.decoded(payload).state).toBe("unknown");
    gas.controls.throwMail = false;
    expect(gas.decoded(payload).state).toBe("unknown"); expect(gas.sent).toHaveLength(1);
  });
});
