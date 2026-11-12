// Isolated local test service. Never imported by production Worker/frontend.
import vm from "node:vm";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
export const fixtureRelayUrl =
  "https://script.google.com/macros/s/local-report-relay-fixture/exec";
export const fixtureRelaySecret =
  "isolated-report-relay-secret-not-production-0123456789";
const bytes = (value) =>
  Buffer.from(
    typeof value === "string" ? value : Array.from(value || [], (n) => n & 255),
  );
export function createRelayHarness() {
  if (!existsSync(".playwright-artifacts/report-relay/PdfLibrary.gs"))
    execFileSync(process.execPath, ["scripts/build-report-relay.mjs"], {
      stdio: "pipe",
    });
  const props = new Map([
    ["REPORT_RELAY_SECRET", fixtureRelaySecret],
    ["ARCHIVE_RECIPIENT", "khtech.site@gmail.com"],
  ]);
  const state = {
    quota: 100,
    mailbox: [],
    throwAfterSend: false,
    failAcceptedRecord: false,
    busy: false,
  };
  function blob(value, type = "application/octet-stream", name = "") {
    const data = bytes(value);
    return {
      getBytes: () => Array.from(data, (n) => (n > 127 ? n - 256 : n)),
      getDataAsString: () => data.toString("utf8"),
      getName: () => name,
      getContentType: () => type,
    };
  }
  const context = vm.createContext({
    // Fail if the shared PDF accidentally starts depending on browser/Node APIs or Intl formatting.
    Intl: undefined,
    fetch: undefined,
    window: undefined,
    navigator: undefined,
    process: undefined,
    performance: undefined,
    Utilities: {
      newBlob: blob,
      base64Decode: (s) => Array.from(Buffer.from(s, "base64"),n=>n>127?n-256:n),
      base64Encode: (a) => {if(Array.from(a).some(n=>!Number.isInteger(n)||n < -128||n>127))throw Error('GAS requires signed Byte[]');return bytes(a).toString("base64")},
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeDigest: (_algorithm, v) =>
        Array.from(createHash("sha256").update(bytes(v)).digest()),
      computeHmacSha256Signature: (v, key) =>
        Array.from(createHmac("sha256", key).update(v, "utf8").digest()),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => props.get(k) ?? null,
        getProperties: () => Object.fromEntries(props),
        deleteProperty: (k) => props.delete(k),
        setProperty: (k, v) => {
          if (
            state.failAcceptedRecord &&
            k.startsWith("op:") &&
            JSON.parse(v).status === "SENT_UNVERIFIED"
          )
            throw Error("journal failure");
          props.set(k, String(v));
        },
      }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => !state.busy,
        releaseLock: () => {},
      }),
    },
    MailApp: {
      getRemainingDailyQuota: () => state.quota,
      sendEmail: (message) => {
        state.mailbox.push(message);
        state.quota--;
        if (state.throwAfterSend) throw Error("ambiguous MailApp failure");
      },
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (text) => ({
        text,
        setMimeType() {
          return this;
        },
      }),
    },
  });
  vm.runInContext(
    readFileSync(".playwright-artifacts/report-relay/PdfLibrary.gs", "utf8"),
    context,
    { timeout: 15000 },
  );
  vm.runInContext(readFileSync("report-relay/Code.gs", "utf8"), context);
  const post = (packet) =>
    JSON.parse(
      context.doPost({ postData: { contents: JSON.stringify(packet) } }).text,
    );
  return {
    state,
    props,
    context,
    post,
    fetcher: async (url, init) => {
      if (url !== fixtureRelayUrl)
        throw Error("Real network forbidden in relay harness");
      return new Response(JSON.stringify(post(JSON.parse(init.body))), {
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}
