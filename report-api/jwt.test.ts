import { beforeAll, expect, test } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { firebaseVerifier } from "./jwt";
let pair: Awaited<ReturnType<typeof generateKeyPair>>,
  verify: ReturnType<typeof firebaseVerifier>;
beforeAll(async () => {
  pair = await generateKeyPair("RS256");
  verify = firebaseVerifier(
    "demo-kh-tech-report",
    createLocalJWKSet({
      keys: [
        { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "RS256" },
      ],
    }),
  );
});
async function token(extra: object = {}, header: object = {}) {
  return new SignJWT({
    sub: "employee",
    email: "employee@example.test",
    auth_time: Math.floor(Date.now() / 1000),
    firebase: { sign_in_provider: "password" },
    ...extra,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key", ...header })
    .setIssuer("https://securetoken.google.com/demo-kh-tech-report")
    .setAudience("demo-kh-tech-report")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(pair.privateKey);
}
test("accepts a correctly signed Firebase password token", async () => {
  expect(await verify(await token())).toMatchObject({
    uid: "employee",
    email: "employee@example.test",
  });
});
test("rejects unsigned, malformed, unknown key and wrong algorithm tokens", async () => {
  for (const value of [
    "bad",
    "eyJhbGciOiJub25lIn0.eyJzdWIiOiJhIn0.",
    await token({}, { kid: "unknown" }),
  ])
    await expect(verify(value)).rejects.toMatchObject({
      code: "invalid_session",
    });
  const hmac = await new SignJWT({ sub: "employee" })
    .setProtectedHeader({ alg: "HS256", kid: "test-key" })
    .sign(new Uint8Array(32));
  await expect(verify(hmac)).rejects.toMatchObject({ code: "invalid_session" });
});
test("rejects another project, expired token, future auth, missing email and other providers", async () => {
  for (const extra of [
    { auth_time: 9999999999 },
    { email: null },
    { firebase: { sign_in_provider: "anonymous" } },
    { sub: "../bad" },
  ])
    await expect(verify(await token(extra))).rejects.toMatchObject({
      code: "invalid_session",
    });
  for (const [issuer, audience, expiration] of [
    ["https://securetoken.google.com/other", "demo-kh-tech-report", "5m"],
    ["https://securetoken.google.com/demo-kh-tech-report", "other", "5m"],
    [
      "https://securetoken.google.com/demo-kh-tech-report",
      "demo-kh-tech-report",
      "-1s",
    ],
  ]) {
    const value = await new SignJWT({
      sub: "employee",
      email: "employee@example.test",
      auth_time: 1,
      firebase: { sign_in_provider: "password" },
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(expiration)
      .sign(pair.privateKey);
    await expect(verify(value)).rejects.toMatchObject({
      code: "invalid_session",
    });
  }
});
