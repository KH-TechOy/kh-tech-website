/// <reference types="@cloudflare/workers-types" />
import { googleServices } from "./google";
import { firebaseVerifier } from "./jwt";
import { createService, publicProfile } from "./service";
import { workService } from './work';
import { ApiError, type Dependencies, type Document } from "./types";
export interface Env {
  FIREBASE_PROJECT_ID: string;
  SERVICE_ACCOUNT_JSON: string;
  FIREBASE_WEB_API_KEY?: string;
  ALLOWED_ORIGINS: string;
  REPORT_RATE: DurableObjectNamespace;
}
export function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
async function body(request: Request, max = 4096): Promise<Document> {
  if (
    request.headers.get("Content-Type")?.split(";")[0].trim() !==
      "application/json" ||
    request.headers.has("Content-Encoding")
  )
    throw new ApiError("invalid_request", 415);
  if (Number(request.headers.get("Content-Length")) > max)
    throw new ApiError("invalid_request", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("invalid_request", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new ApiError("invalid_request", 413);
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new ApiError("invalid_request", 400);
  }
}
export function reportHandler(deps: Dependencies, origins: string[]) {
  const service = createService(deps);
  const work = workService(deps.db);
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin") || "";
    if (!origins.includes(origin)) return json({ error: "origin" }, 403);
    const cors = (response: Response) => {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
      return response;
    };
    if (request.method === "OPTIONS") {
      if (
        !["GET", "POST"].includes(
          request.headers.get("Access-Control-Request-Method") || "",
        ) ||
        (request.headers.get("Access-Control-Request-Headers") || "")
          .split(",")
          .some(
            (h) =>
              !["authorization", "content-type", ""].includes(
                h.trim().toLowerCase(),
              ),
          )
      )
        return cors(json({ error: "origin" }, 403));
      const response = json({});
      response.headers.set("Access-Control-Allow-Methods", "GET, POST");
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      response.headers.set("Access-Control-Max-Age", "600");
      return cors(response);
    }
    try {
      const authorization = request.headers.get("Authorization") || "";
      if (!authorization.startsWith("Bearer ") || authorization.length > 8200)
        throw new ApiError("invalid_session", 401);
      const { claims, profile } = await service.authenticate(
        authorization.slice(7),
      );
      const url = new URL(request.url),
        path = url.pathname;
      if (path === "/session" && request.method === "GET")
        return cors(json({ profile }));
      if (path === '/work' && request.method === 'POST') {
        if (!(await deps.rate(claims.uid, 'work'))) throw new ApiError('rate_limited', 429);
        return cors(json(await work(claims, await body(request, 96000))));
      }
      if (profile.role !== "admin") throw new ApiError("admin_required");
      if (!(await deps.rate(claims.uid)))
        throw new ApiError("rate_limited", 429);
      if (path === "/employees" && request.method === "GET") {
        const pageToken = url.searchParams.get("pageToken") || undefined;
        if (pageToken && pageToken.length > 2000)
          throw new ApiError("invalid_request", 400);
        const result = await deps.db.list("users", 50, pageToken);
        return cors(
          json({
            users: result.documents.map(publicProfile),
            ...(result.nextPageToken
              ? { nextPageToken: result.nextPageToken }
              : {}),
          }),
        );
      }
      if (path === "/employees" && request.method === "POST")
        return cors(
          json(
            await service.createEmployee(
              claims,
              await body(request),
              request.headers.get("CF-Connecting-IP") || "",
            ),
          ),
        );
      if (path === "/employees/action" && request.method === "POST")
        return cors(
          json(
            await service.mutate(
              claims,
              await body(request),
              request.headers.get("CF-Connecting-IP") || "",
            ),
          ),
        );
      throw new ApiError("not_found", 404);
    } catch (error) {
      return cors(
        json(
          {
            error:
              error instanceof ApiError ? error.code : "provider_unavailable",
          },
          error instanceof ApiError ? error.status : 503,
        ),
      );
    }
  };
}
let configured: {
  signature: string;
  handler: ReturnType<typeof reportHandler>;
} | null = null;
export default {
  async fetch(request: Request, env: Env) {
    if (
      !/^[a-z][a-z0-9-]{4,62}$/.test(env.FIREBASE_PROJECT_ID || "") ||
      !env.SERVICE_ACCOUNT_JSON ||
      !env.REPORT_RATE
    )
      return json({ error: "configuration" }, 503);
    const origins = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
    if (origins.some((o) => !/^https:\/\/[^/]+$/.test(o)))
      return json({ error: "configuration" }, 503);
    const signature =
      env.FIREBASE_PROJECT_ID +
      env.SERVICE_ACCOUNT_JSON +
      env.ALLOWED_ORIGINS +
      (env.FIREBASE_WEB_API_KEY || "");
    if (!configured || configured.signature !== signature) {
      const services = googleServices({
        projectId: env.FIREBASE_PROJECT_ID,
        serviceAccount: env.SERVICE_ACCOUNT_JSON,
        webApiKey: env.FIREBASE_WEB_API_KEY,
      });
      configured = {
        signature,
        handler: reportHandler(
          {
            ...services,
            verify: firebaseVerifier(env.FIREBASE_PROJECT_ID),
            rate: async (uid, kind) => {
              const response = await env.REPORT_RATE.get(
                env.REPORT_RATE.idFromName((kind ? 'work:' : '') + uid),
              ).fetch("https://rate/", { method: "POST", headers: kind ? { 'X-Report-Rate': 'work' } : {} });
              return response.status === 200;
            },
          },
          origins,
        ),
      };
    }
    return configured.handler(request);
  },
};
export class ReportRate {
  constructor(private ctx: DurableObjectState) {}
  async fetch(request: Request) {
    const accepted = await this.ctx.storage.transaction(async (tx) => {
      let data = await tx.get<{ count: number; until: number }>("limit");
      if (!data || data.until < Date.now())
        data = { count: 0, until: Date.now() + 600000 };
      if (data.count >= (request.headers.get('X-Report-Rate') === 'work' ? 360 : 30)) return false;
      data.count++;
      await tx.put("limit", data);
      await tx.setAlarm(data.until);
      return true;
    });
    return json({}, accepted ? 200 : 429);
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
