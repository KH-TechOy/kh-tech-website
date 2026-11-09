import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createHash, createHmac } from "node:crypto";
export const testSecret = "a1".repeat(32);
/** Tests only: no Google services, credentials or outbound delivery. */
export function gasHarness() {
  const props = new Map<string, string>([["RELAY_SECRET", testSecret], ["RECIPIENT_EMAIL", "notification@example.test"]]);
  const sent: Array<Record<string, string>> = [];
  const controls = { throwMail: false, quota: 100, failSentWrite: false };
  const api = {
    getProperty: (k: string) => props.get(k) || null,
    setProperty: (k: string, v: string) => { if (controls.failSentWrite && v.includes('"state":"sent"')) throw new Error("storage"); props.set(k, v); },
    setProperties: (values: Record<string, string>) => { Object.entries(values).forEach(([k, v]) => props.set(k, v)); },
    getProperties: () => Object.fromEntries(props), deleteProperty: (k: string) => props.delete(k),
  };
  const context: any = {
    PropertiesService: { getScriptProperties: () => api },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    Utilities: {
      Charset: { UTF_8: "utf8" }, DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (_: string, value: string) => Array.from(createHash("sha256").update(value).digest()),
      computeHmacSha256Signature: (value: string, key: string) => Array.from(createHmac("sha256", key).update(value).digest()),
      newBlob: (value: string) => ({ getBytes: () => Buffer.from(value, "utf8") }),
      formatDate: (date: Date) => date.toISOString(),
    },
    MailApp: { getRemainingDailyQuota: () => controls.quota, sendEmail: (mail: Record<string, string>) => { sent.push(mail); if (controls.throwMail) throw new Error("unconfirmed"); } },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (text: string) => ({ text, setMimeType() { return this; } }) },
  };
  runInNewContext(readFileSync("apps-script/contact/Code.gs", "utf8"), context);
  function signed(payload: object) {
    const message = JSON.stringify({ v: 1, timestamp: Date.now(), ...payload });
    return JSON.stringify({ message, signature: createHmac("sha256", testSecret).update("request\n" + message).digest("hex") });
  }
  function post(raw: string) { return JSON.parse(context.doPost({ contentLength: Buffer.byteLength(raw), postData: { type: "application/json", contents: raw } }).text); }
  function decoded(payload: object) { const result = post(signed(payload)); return result.message ? JSON.parse(result.message) : result; }
  return { props, sent, controls, context, signed, post, decoded };
}
