import { beforeAll, expect, test, vi } from "vitest";
import { generateKeyPair, exportPKCS8 } from "jose";
import { googleServices } from "./google";
let serviceAccount: string;
beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  serviceAccount = JSON.stringify({
    type: "service_account",
    project_id: "demo-kh-tech-report",
    client_email: "local@demo-kh-tech-report.iam.gserviceaccount.com",
    private_key: await exportPKCS8(pair.privateKey),
  });
});
const config = () => ({
  projectId: "demo-kh-tech-report",
  serviceAccount,
  webApiKey: "local-public-api-key",
});
function sender(response: () => Response) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const transport: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return String(url) === "https://oauth2.googleapis.com/token"
      ? Response.json({ access_token: "local-oauth-token", expires_in: 3600 })
      : response();
  };
  return { identity: googleServices(config(), transport).identity, calls };
}
test("uses the canonical Firebase email dispatch with public API key, OAuth project and no returned links", async () => {
  const { identity, calls } = sender(() =>
    Response.json({ email: "new@example.test" }),
  );
  await identity.reset("new@example.test", "127.0.0.1");
  const request = calls.at(-1)!;
  expect(request.url).toBe(
    "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=local-public-api-key",
  );
  expect(JSON.parse(String(request.init?.body))).toEqual({
    targetProjectId: "demo-kh-tech-report",
    requestType: "PASSWORD_RESET",
    email: "new@example.test",
    userIp: "127.0.0.1",
    returnOobLink: false,
    canHandleCodeInApp: false,
  });
  expect(request.init?.redirect).toBe("manual");
  expect(new Headers(request.init?.headers).get("X-Firebase-Locale")).toBe(
    "fi",
  );
});
test("missing configuration fails before any network or mail attempt", async () => {
  const transport = vi.fn<typeof fetch>();
  await expect(
    googleServices({ ...config(), webApiKey: "" }, transport).identity.reset(
      "new@example.test",
      "127.0.0.1",
    ),
  ).rejects.toMatchObject({ code: "email_not_configured" });
  expect(transport).not.toHaveBeenCalled();
});
test.each([
  [403, "PERMISSION_DENIED", "email_permission_denied"],
  [400, "API_KEY_INVALID", "email_api_key_invalid"],
  [429, "RESET_PASSWORD_EXCEED_LIMIT", "email_quota"],
  [400, "OPERATION_NOT_ALLOWED", "email_provider_disabled"],
  [404, "EMAIL_NOT_FOUND", "email_account_missing"],
  [503, "INTERNAL", "email_outcome_unknown"],
])(
  "provider status %s is never treated as accepted",
  async (status, message, code) => {
    const { identity } = sender(() =>
      Response.json({ error: { message } }, { status: Number(status) }),
    );
    await expect(
      identity.reset("new@example.test", "127.0.0.1"),
    ).rejects.toMatchObject({ code });
  },
);
test("malformed response, response token and lost response are ambiguous, never returned to admin", async () => {
  for (const response of [
    () => new Response("not json"),
    () =>
      Response.json({
        oobLink: "https://local.invalid/?oobCode=never-log-this",
      }),
    () => {
      throw new Error("lost response");
    },
  ]) {
    const { identity } = sender(response);
    await expect(
      identity.reset("new@example.test", "127.0.0.1"),
    ).rejects.toMatchObject({ code: "email_outcome_unknown" });
  }
});
test("accepts privacy-preserving HTTP success without echoing email, but does not claim inbox delivery", async () => {
  await expect(
    sender(() => Response.json({})).identity.reset(
      "new@example.test",
      "127.0.0.1",
    ),
  ).resolves.toBeUndefined();
});
