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
// Only installation-safe codes cross the API boundary; never return provider bodies/URLs.
export function relayError(error: unknown): string {
  return error instanceof ApiError ? error.code : "relay_network";
}
export function relayDiagnostic(code: unknown): string {
  const codes: Record<string, string> = {
    quota: "relay_quota",
    busy: "relay_busy",
    journal_full: "relay_journal_full",
    recipient_configuration: "relay_configuration",
    quota_configuration: "relay_configuration",
    unauthorized: "relay_unauthorized",
    record_not_found: "relay_record_missing",
    mail_outcome_unknown: "relay_outcome_unknown",
    archive_integrity: "archive_integrity",
  };
  return codes[String(code)] || (code ? "relay_rejected" : "");
}
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
  const safeFetch: typeof fetch = async (url, init) => {
    try {
      return await fetcher(url, init);
    } catch (e) {
      throw new ApiError(
        e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name)
          ? "relay_timeout"
          : "relay_network",
        503,
      );
    }
  };
  let response = await safeFetch(c.relayUrl!, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(packet),
    redirect: "manual",
    signal: AbortSignal.timeout(25000),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location") || "";
    if (!/^https:\/\/script\.googleusercontent\.com\//.test(location))
      throw new ApiError("relay_configuration", 503);
    response = await safeFetch(location, {
      redirect: "error",
      signal: AbortSignal.timeout(25000),
    });
  }
  if ([401, 403].includes(response.status))
    throw new ApiError("relay_unauthorized", 503);
  if (response.status === 429) throw new ApiError("relay_rate_limit", 429);
  const raw = await response.text();
  if (raw.length > 8000) throw new ApiError("relay_response", 503);
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ApiError("relay_response", 503);
  }
  if (data?.error === "unauthorized")
    throw new ApiError("relay_unauthorized", 503);
  if (!response.ok || !data?.payload || typeof data.signature !== "string")
    throw new ApiError("relay_response", 503);
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
    throw new ApiError("relay_auth", 503);
  return {
    ...data.payload,
    ...(data.payload.error
      ? { error: relayDiagnostic(data.payload.error) }
      : {}),
  };
}
