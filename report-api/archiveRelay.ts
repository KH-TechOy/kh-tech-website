import { canonical } from "../src/reportArchive";
import { ApiError } from "./types";
export type RelayResult = {
  operationId: string;
  status: "PREPARED" | "SENT_UNVERIFIED" | "FAILED" | "OUTCOME_UNKNOWN";
  pdfSha256?: string;
  portableSha256?: string;
  snapshotHash?: string;
  error?: string;
  photoHashes?: string[];
};
export type RelayConfig = {
  relayUrl?: string;
  secret?: string;
  fetcher?: typeof fetch;
};
export const relayReady = (c: RelayConfig) =>
  !!c.secret &&
  c.secret.length >= 32 &&
  /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,}\/exec$/.test(
    c.relayUrl || "",
  );
export async function signRelay(
  secret: string,
  payload: unknown,
  domain = "request",
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(domain + "\n" + canonical(payload)),
      ),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function relayPacket(c: RelayConfig, payload: object) {
  if (!relayReady(c)) throw new ApiError("archive_not_configured", 503);
  const issuedAt = Date.now();
  const data = { ...payload, issuedAt, expiresAt: issuedAt + 300000 };
  return {
    version: 1,
    payload: data,
    signature: await signRelay(c.secret!, data),
  };
}
export async function callRelay(
  c: RelayConfig,
  payload: object,
): Promise<RelayResult> {
  const packet = await relayPacket(c, payload),
    fetcher = c.fetcher || fetch;
  let response = await fetcher(c.relayUrl!, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(packet),
    redirect: "manual",
    signal: AbortSignal.timeout(25000),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location") || "";
    if (!/^https:\/\/script\.googleusercontent\.com\//.test(location))
      throw new Error("relay_redirect");
    response = await fetcher(location, {
      redirect: "error",
      signal: AbortSignal.timeout(25000),
    });
  }
  const raw = await response.text();
  if (raw.length > 8000) throw new Error("relay_response");
  const data = JSON.parse(raw);
  if (!response.ok || !data.payload || typeof data.signature !== "string")
    throw new Error("relay_response");
  const signature = await signRelay(c.secret!, data.payload, "response");
  let difference = signature.length ^ data.signature.length;
  for (let i = 0; i < signature.length; i++)
    difference |= signature.charCodeAt(i) ^ data.signature.charCodeAt(i);
  if (
    difference ||
    !["PREPARED", "SENT_UNVERIFIED", "FAILED", "OUTCOME_UNKNOWN"].includes(
      data.payload.status,
    ) ||
    data.payload.operationId !== (payload as any).operationId
  )
    throw new Error("relay_auth");
  return data.payload;
}
