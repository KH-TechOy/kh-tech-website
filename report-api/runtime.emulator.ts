import { beforeAll, beforeEach, afterAll, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { generateKeyPair, exportJWK, exportPKCS8, SignJWT } from "jose";
import { seed, projectId, db, auth } from "./test/emulators";
import { emptyReport } from '../src/reportModel';
let mf: Miniflare, pair: Awaited<ReturnType<typeof generateKeyPair>>;
const origin = "https://khtechoy.github.io";
beforeAll(async () => {
  pair = await generateKeyPair("RS256", { extractable: true });
  const jwk = {
    ...(await exportJWK(pair.publicKey)),
    kid: "local-runtime-key",
    alg: "RS256",
    use: "sig",
  };
  execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "deploy",
      "--dry-run",
      "--config",
      "report-api/wrangler.jsonc",
      "--outdir",
      "../.playwright-artifacts/report/worker",
    ],
    { stdio: "pipe", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } },
  );
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: ".playwright-artifacts/report/worker/worker.js",
      compatibilityDate: "2026-11-01",
      durableObjects: {
        REPORT_RATE: { className: "ReportRate", useSQLite: true },
      },
      bindings: {
        FIREBASE_PROJECT_ID: projectId,
        ALLOWED_ORIGINS: origin,
        FIREBASE_WEB_API_KEY: "emulator",
        SERVICE_ACCOUNT_JSON: JSON.stringify({
          type: "service_account",
          project_id: projectId,
          client_email: "runtime@demo-kh-tech-report.iam.gserviceaccount.com",
          private_key: await exportPKCS8(pair.privateKey),
        }),
      },
      outboundService: async (request) => {
        const url = new URL(request.url);
        if (
          url.hostname === "www.googleapis.com" &&
          url.pathname.startsWith("/service_accounts/v1/jwk/")
        )
          return Response.json(
            { keys: [jwk] },
            { headers: { "Cache-Control": "public,max-age=3600" } },
          );
        if (url.href === "https://oauth2.googleapis.com/token")
          return Response.json({
            access_token: "emulator-runtime-only",
            expires_in: 3600,
          });
        const local =
          url.hostname === "identitytoolkit.googleapis.com"
            ? "http://127.0.0.1:9099/identitytoolkit.googleapis.com" +
              url.pathname +
              url.search
            : url.hostname === "firestore.googleapis.com"
              ? "http://127.0.0.1:8085" + url.pathname + url.search
              : null;
        if (!local) throw new Error("Non-emulator network forbidden");
        const headers = new Headers(request.headers);
        headers.set("Authorization", "Bearer owner");
        return fetch(local, {
          method: request.method,
          headers,
          ...(request.method === "POST" ? { body: await request.text() } : {}),
        });
      },
    }),
  );
});
beforeEach(seed);
afterAll(async () => mf?.dispose());
async function token(uid: string, audience = projectId) {
  return new SignJWT({
    email: uid + "@example.test",
    auth_time: Math.floor(Date.now() / 1000),
    firebase: { sign_in_provider: "password" },
  })
    .setSubject(uid)
    .setProtectedHeader({ alg: "RS256", kid: "local-runtime-key" })
    .setAudience(audience)
    .setIssuer("https://securetoken.google.com/" + projectId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(pair.privateKey);
}
async function call(value: string, path = "/session", data?: object) {
  return mf.dispatchFetch("https://worker.example" + path, {
    method: data ? "POST" : "GET",
    headers: {
      Origin: origin,
      Authorization: "Bearer " + value,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "127.0.0.1",
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
test("production Worker runtime verifies real RSA signatures, live profiles and employee permissions", async () => {
  expect((await call("eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.")).status).toBe(
    401,
  );
  expect((await call(await token("admin", "another-project"))).status).toBe(
    401,
  );
  const session = await call(await token("employee"));
  expect(session.status, await session.clone().text()).toBe(200);
  expect((await call(await token("employee"), "/employees")).status).toBe(403);
  const admin = await token("admin");
  expect(
    (
      await call(admin, "/employees/action", {
        requestId: crypto.randomUUID(),
        action: "role",
        uid: "employee",
        role: "admin",
      })
    ).status,
  ).toBe(200);
  expect((await db.doc("users/employee").get()).get("role")).toBe("admin");
  await db.doc("users/admin").update({ active: false });
  expect((await call(admin)).status).toBe(403);
  const disabledToken = await token("employee");
  await auth.updateUser("employee", { disabled: true });
  expect((await call(disabledToken)).status).toBe(403);
});
test("SQLite Durable Object actually enforces the admin rate cap in workerd", async () => {
  const value = await token("admin2");
  for (let i = 0; i < 30; i++)
    expect((await call(value, "/employees")).status).toBe(200);
  expect((await call(value, "/employees")).status).toBe(429);
  expect((await call(value, '/work', { action: 'load', id: 'KHT-20261111-AAAAAA' })).status).toBe(200);
  expect((await call(value)).status).toBe(200); // rate limiting never fabricates an authenticated session
});

test('production workerd accepts bounded text autosaves, protects revisions and rejects employee billing changes', async () => {
  const value = await token('employee'), id = 'KHT-20261111-CCCCCC';
  const state = emptyReport(); state.form.description = 'T'.repeat(5000); state.form.notes = 'N'.repeat(3000);
  const payload = { action: 'save', id, revision: 0, requestId: crypto.randomUUID(), form: state.form };
  const response = await call(value, '/work', payload);
  expect(response.status, await response.clone().text()).toBe(200);
  const report = (await response.json() as any).report;
  expect(report.revision).toBe(1); expect(report.form.description.length).toBe(5000);
  expect((await call(value, '/work', payload)).status).toBe(200);
  const stale = await call(value, '/work', { ...payload, requestId: crypto.randomUUID() }); expect(stale.status).toBe(409);
  const forbidden = await call(value, '/work', { ...payload, revision: 1, requestId: crypto.randomUUID(), billing: { ...report.billing, hourRateCents: 100 } }); expect(forbidden.status).toBe(403);
  expect((await db.doc('reports/' + id).get()).data()?.revision).toBe(1);
});
test("production workerd automatically sends setup email and synchronizes a display name", async () => {
  const value = await token("admin");
  const response = await call(value, "/employees", {
    requestId: crypto.randomUUID(),
    email: crypto.randomUUID() + "@example.test",
    displayName: "Kutsuttu",
  });
  expect(response.status, await response.clone().text()).toBe(200);
  const created = (await response.json()) as any;
  expect(created).toMatchObject({
    completed: true,
    setupEmail: { status: "accepted" },
  });
  expect(
    (
      await call(value, "/employees/action", {
        uid: created.uid,
        action: "name",
        displayName: "Uusi nimi",
        requestId: crypto.randomUUID(),
      })
    ).status,
  ).toBe(200);
  expect((await auth.getUser(created.uid)).displayName).toBe("Uusi nimi");
});
