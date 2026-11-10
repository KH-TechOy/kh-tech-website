import { importPKCS8, SignJWT } from "jose";
import {
  ApiError,
  type Account,
  type Database,
  type Document,
  type Identity,
  type Value,
} from "./types";
export interface GoogleConfig {
  projectId: string;
  serviceAccount: string;
  webApiKey?: string;
}
function encode(value: Value): object {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number")
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(encode) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, encode(v)]),
      ),
    },
  };
}
function decode(value: any): Value {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decode);
  if ("mapValue" in value)
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [
        k,
        decode(v),
      ]),
    );
  return null;
}
export function firestoreDocument(raw: any): Document {
  return Object.fromEntries(
    Object.entries(raw.fields || {}).map(([k, v]) => [k, decode(v)]),
  );
}
export function firestoreFields(data: Document): object {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, encode(v)]),
  );
}
export function googleServices(
  config: GoogleConfig,
  transport: typeof fetch = fetch,
): { db: Database; identity: Identity } {
  let credential: { token: string; expires: number } | null = null;
  let loading: Promise<string> | null = null;
  async function accessToken() {
    if (credential && credential.expires > Date.now() + 60_000)
      return credential.token;
    if (!loading)
      loading = (async () => {
        let account;
        try {
          account = JSON.parse(config.serviceAccount);
        } catch {
          throw new ApiError("configuration", 503);
        }
        if (
          account.project_id !== config.projectId ||
          account.type !== "service_account" ||
          typeof account.client_email !== "string" ||
          !account.client_email.endsWith(".iam.gserviceaccount.com") ||
          typeof account.private_key !== "string"
        )
          throw new ApiError("configuration", 503);
        const key = await importPKCS8(account.private_key, "RS256");
        const assertion = await new SignJWT({
          scope:
            "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit",
        })
          .setProtectedHeader({ alg: "RS256", typ: "JWT" })
          .setIssuer(account.client_email)
          .setAudience("https://oauth2.googleapis.com/token")
          .setIssuedAt()
          .setExpirationTime("55m")
          .sign(key);
        const response = await transport(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            redirect: "manual",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
              assertion,
            }),
            signal: AbortSignal.timeout(10_000),
          },
        );
        if (!response.ok) throw new ApiError("configuration", 503);
        const result = (await response.json()) as any;
        if (
          typeof result.access_token !== "string" ||
          !Number.isFinite(result.expires_in)
        )
          throw new ApiError("configuration", 503);
        credential = {
          token: result.access_token,
          expires: Date.now() + Math.min(result.expires_in, 3300) * 1000,
        };
        return result.access_token;
      })().finally(() => {
        loading = null;
      });
    return loading;
  }
  const root = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
  async function request(
    url: string,
    body?: object,
    method = body ? "POST" : "GET",
  ): Promise<any> {
    const response = await transport(url, {
      method,
      redirect: "manual",
      headers: {
        Authorization: "Bearer " + (await accessToken()),
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12_000),
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as any;
      if (response.status === 409 || result.error?.status === "ABORTED")
        throw new ApiError("retry_transaction", 409);
      if (String(result.error?.message || "").includes("EMAIL_EXISTS"))
        throw new ApiError("email_exists", 409);
      throw new ApiError("provider_unavailable", 503);
    }
    return response.json();
  }
  const db: Database = {
    async get(path, tx) {
      if (tx) {
        const rows = await request(root + ":batchGet", {
          documents: [
            root.replace("https://firestore.googleapis.com/v1/", "") +
              "/" +
              path,
          ],
          transaction: tx,
        });
        const row = Array.isArray(rows) ? rows[0] : rows;
        return row?.found ? firestoreDocument(row.found) : null;
      }
      const raw = await request(root + "/" + path);
      return raw ? firestoreDocument(raw) : null;
    },
    async list(collection, limit, pageToken) {
      const result = await request(
        root +
          "/" +
          collection +
          "?pageSize=" +
          limit +
          (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : ""),
      );
      return {
        documents: (result?.documents || []).map(firestoreDocument),
        ...(result?.nextPageToken
          ? { nextPageToken: result.nextPageToken }
          : {}),
      };
    },
    async transaction(fn) {
      for (let attempt = 0; attempt < 6; attempt++) {
        const { transaction } = await request(root + ":beginTransaction", {
          options: { readWrite: {} },
        });
        const writes: object[] = [];
        try {
          const result = await fn({
            get: (path) => db.get(path, transaction),
            put: (path, data) =>
              writes.push({
                update: {
                  name:
                    root.replace("https://firestore.googleapis.com/v1/", "") +
                    "/" +
                    path,
                  fields: firestoreFields(data),
                },
              }),
          });
          await request(root + ":commit", { transaction, writes });
          return result;
        } catch (error) {
          await request(root + ":rollback", { transaction }).catch(() => {});
          if (
            !(error instanceof ApiError) ||
            error.code !== "retry_transaction" ||
            attempt === 5
          )
            throw error;
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              20 * 2 ** attempt + Math.floor(Math.random() * 30),
            ),
          );
        }
      }
      throw new ApiError("provider_unavailable", 503);
    },
  };
  const authRoot = `https://identitytoolkit.googleapis.com/v1/projects/${config.projectId}/accounts`;
  async function lookup(uid: string): Promise<Account> {
    const result = await request(authRoot + ":lookup", { localId: [uid] });
    const user = result?.users?.[0];
    if (!user || user.localId !== uid || typeof user.email !== "string")
      throw new ApiError("access_disabled");
    return {
      uid,
      email: user.email,
      disabled: user.disabled === true,
      validSince: Number(user.validSince || 0),
      displayName: typeof user.displayName === "string" ? user.displayName : "",
    };
  }
  const identity: Identity = {
    lookup,
    async lookupEmail(email) {
      const result = await request(authRoot + ":lookup", { email: [email] });
      const user = result?.users?.[0];
      return user
        ? {
            uid: String(user.localId),
            email: String(user.email),
            disabled: user.disabled === true,
            validSince: Number(user.validSince || 0),
          }
        : null;
    },
    async create(uid, email, displayName) {
      // Resuming a reservation is safe only for the exact same server-selected UID/email.
      try {
        const existing = await lookup(uid);
        if (existing.email.toLowerCase() === email && !existing.disabled)
          return;
        throw new ApiError("request_conflict", 409);
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== "access_disabled")
          throw error;
      }
      const random = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      const result = await request(authRoot, {
        localId: uid,
        email,
        displayName,
        password: random,
        disabled: false,
      });
      if (result?.localId !== uid)
        throw new ApiError("provider_unavailable", 503);
    },
    async disable(uid) {
      await request(authRoot + ":update", {
        localId: uid,
        disableUser: true,
        validSince: String(Math.floor(Date.now() / 1000) + 1),
      });
    },
    async reset(email, userIp) {
      if (!config.webApiKey) throw new ApiError("email_not_configured", 503);
      let response: Response;
      try {
        response = await transport(
          "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=" +
            encodeURIComponent(config.webApiKey),
          {
            method: "POST",
            redirect: "manual",
            headers: {
              Authorization: "Bearer " + (await accessToken()),
              "Content-Type": "application/json",
              "X-Firebase-Locale": "fi",
            },
            body: JSON.stringify({
              targetProjectId: config.projectId,
              requestType: "PASSWORD_RESET",
              email,
              userIp,
              returnOobLink: false,
              canHandleCodeInApp: false,
            }),
            signal: AbortSignal.timeout(12000),
          },
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError("email_outcome_unknown", 503);
      }
      const result = (await response.json().catch(() => null)) as any;
      if (!response.ok) {
        const message = String(result?.error?.message || "").split(" : ")[0];
        const codes: Record<string, string> = {
          API_KEY_INVALID: "email_api_key_invalid",
          INVALID_API_KEY: "email_api_key_invalid",
          OPERATION_NOT_ALLOWED: "email_provider_disabled",
          TOO_MANY_ATTEMPTS_TRY_LATER: "email_quota",
          QUOTA_EXCEEDED: "email_quota",
          RESET_PASSWORD_EXCEED_LIMIT: "email_quota",
          UNAUTHORIZED_DOMAIN: "email_domain",
          INVALID_CONTINUE_URI: "email_domain",
          INVALID_EMAIL: "email_address_invalid",
          EMAIL_NOT_FOUND: "email_account_missing",
          USER_DISABLED: "access_disabled",
          MISSING_CLIENT_TYPE: "email_recaptcha_required",
          CAPTCHA_CHECK_FAILED: "email_recaptcha_required",
        };
        const code =
          response.status === 403
            ? "email_permission_denied"
            : codes[message] ||
              (response.status >= 500
                ? "email_outcome_unknown"
                : "email_rejected");
        throw new ApiError(
          code,
          response.status === 429 || code === "email_quota" ? 429 : 502,
        );
      }
      if (
        !result ||
        (result.email !== undefined &&
          (typeof result.email !== "string" ||
            result.email.toLowerCase() !== email.toLowerCase())) ||
        result.oobLink ||
        result.oobCode
      )
        throw new ApiError("email_outcome_unknown", 502);
    },
    async rename(uid, displayName) {
      const result = await request(authRoot + ":update", {
        localId: uid,
        displayName,
      });
      if (result?.localId !== uid)
        throw new ApiError("provider_unavailable", 503);
    },
  };
  return { db, identity };
}
