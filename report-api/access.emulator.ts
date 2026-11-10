import { beforeAll, beforeEach, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { dependencies, seed, login, db, auth } from "./test/emulators";
import { reportHandler } from "./worker";
import { createService } from "./service";
import type { Dependencies } from "./types";
let deps: Dependencies, handler: ReturnType<typeof reportHandler>;
const origin = "https://khtechoy.github.io";
beforeAll(async () => {
  deps = await dependencies();
  handler = reportHandler(deps, [origin]);
});
beforeEach(seed);
async function call(
  token: string,
  path = "/session",
  data?: object,
  requestOrigin = origin,
) {
  return handler(
    new Request("https://api.example" + path, {
      method: data ? "POST" : "GET",
      headers: {
        Origin: requestOrigin,
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "CF-Connecting-IP": "127.0.0.1",
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    }),
  );
}
const action = (uid: string, kind: string, role?: string) => ({
  uid,
  action: kind,
  requestId: randomUUID(),
  ...(role ? { role } : {}),
});
test("real Auth emulator rejects invalid credentials; Worker rejects missing, forged and unprovisioned tokens", async () => {
  await expect(login("employee", "wrong")).rejects.toThrow();
  for (const value of ["", "forged", await login("outsider")])
    expect((await call(value)).status).toBeGreaterThanOrEqual(400);
  expect((await call(await login("employee"))).status).toBe(200);
  expect(
    (
      await call(
        await login("admin"),
        "/session",
        undefined,
        "https://evil.example",
      )
    ).status,
  ).toBe(403);
});
test("employee cannot list, create, disable, reset or change roles", async () => {
  const token = await login("employee");
  expect((await call(token, "/employees")).status).toBe(403);
  for (const kind of ["role", "disable", "reset"])
    expect(
      (await call(token, "/employees/action", action("other", kind, "admin")))
        .status,
    ).toBe(403);
  expect(
    (
      await call(token, "/employees", {
        requestId: randomUUID(),
        email: "new@example.test",
        displayName: "New",
      })
    ).status,
  ).toBe(403);
  expect((await db.doc("users/employee").get()).get("role")).toBe("employee");
});
test("admin creation uses random discarded password, audited reset produces real emulator OOB, idempotency works", async () => {
  const requestId = randomUUID(),
    token = await login("admin"),
    input = {
      requestId,
      email: "new-" + requestId + "@example.test",
      displayName: "Uusi työntekijä",
    };
  const created = await call(token, "/employees", input);
  expect(created.status).toBe(200);
  const { uid } = (await created.json()) as any;
  expect((await auth.getUser(uid)).disabled).toBe(false);
  expect((await db.doc("users/" + uid).get()).get("role")).toBe("employee");
  expect((await call(token, "/employees", input)).status).toBe(200);
  expect(
    (await call(token, "/employees", { ...input, role: "admin" })).status,
  ).toBe(400);
  const reset = action(uid, "reset");
  expect((await call(token, "/employees/action", reset)).status).toBe(200);
  expect((await call(token, "/employees/action", reset)).status).toBe(200);
  const codes = (await (
    await fetch(
      "http://127.0.0.1:9099/emulator/v1/projects/demo-kh-tech-report/oobCodes",
    )
  ).json()) as any;
  expect(
    codes.oobCodes.filter(
      (x: any) => x.email === input.email && x.requestType === "PASSWORD_RESET",
    ),
  ).toHaveLength(2);
  expect(
    (await db.doc("auditEvents/" + reset.requestId).get()).get("status"),
  ).toBe("completed");
  const code = codes.oobCodes.filter((x: any) => x.email === input.email).at(-1).oobCode;
  const resetBody = { oobCode: code, newPassword: "Emulator-reset_42!" };
  const resetUrl =
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=emulator";
  expect(
    (
      await fetch(resetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetBody),
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await fetch(resetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetBody),
      })
    ).status,
  ).toBe(400);
  const signedIn = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        password: resetBody.newPassword,
        returnSecureToken: true,
      }),
    },
  );
  expect(signedIn.status).toBe(200);
  expect((await call(((await signedIn.json()) as any).idToken)).status).toBe(
    200,
  );
});
test("grant/revoke uses fresh roles; disabling rejects an already-issued token immediately", async () => {
  const admin = await login("admin"),
    employee = await login("employee");
  expect(
    (
      await call(
        admin,
        "/employees/action",
        action("employee", "role", "admin"),
      )
    ).status,
  ).toBe(200);
  expect((await call(employee, "/employees")).status).toBe(200);
  expect(
    (
      await call(
        admin,
        "/employees/action",
        action("employee", "role", "employee"),
      )
    ).status,
  ).toBe(200);
  expect((await call(employee, "/employees")).status).toBe(403);
  expect(
    (await call(admin, "/employees/action", action("employee", "disable")))
      .status,
  ).toBe(200);
  expect((await auth.getUser("employee")).disabled).toBe(true);
  expect([401, 403]).toContain((await call(employee)).status);
  expect((await db.doc("users/employee").get()).get("active")).toBe(false);
});
test("concurrent attempts cannot remove both active admins (real Firestore transactions)", async () => {
  const token = await login("admin");
  const responses = await Promise.all([
    call(token, "/employees/action", action("admin", "role", "employee")),
    call(token, "/employees/action", action("admin2", "disable")),
  ]);
  expect(responses.filter((r) => r.status === 200),JSON.stringify(await Promise.all(responses.map(r=>r.clone().json())))).toHaveLength(1);
  const admins = await db
    .collection("users")
    .where("role", "==", "admin")
    .where("active", "==", true)
    .get();
  expect(admins.size).toBe(1);
  expect(
    (await db.doc("accessControl/admins").get()).get("activeAdminCount"),
  ).toBe(1);
  const remaining = admins.docs[0].id,
    lastToken = await login(remaining);
  const response = await call(
    lastToken,
    "/employees/action",
    action(remaining, "role", "employee"),
  );
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: "last_admin" });
});
test("provider failure disables profile first; ambiguous reset is never silently sent twice", async () => {
  const actor = (await createService(deps).authenticate(await login("admin")))
    .claims;
  const failing = createService({
    ...deps,
    identity: {
      ...deps.identity,
      disable: async () => {
        throw new Error("provider down");
      },
      reset: async () => {
        throw new Error("ambiguous");
      },
    },
  });
  await expect(
    failing.mutate(actor, action("employee", "disable")),
  ).rejects.toThrow();
  expect((await db.doc("users/employee").get()).get("active")).toBe(false);
  const reset = action("other", "reset");
  await expect(failing.mutate(actor, reset, "127.0.0.1")).rejects.toThrow();
  await expect(failing.mutate(actor, reset, "127.0.0.1")).rejects.toMatchObject(
    { code: "outcome_unknown" },
  );
});
test("revoked sessions, Auth-console disabled accounts, malformed/oversized requests fail closed", async () => {
  const token = await login("employee");
  await auth.updateUser("employee", { disabled: true });
  expect([401, 403]).toContain((await call(token)).status);
  const admin = await login("admin");
  expect(
    (
      await call(admin, "/employees", {
        requestId: randomUUID(),
        email: "x@example.test",
        displayName: "a".repeat(5000),
      })
    ).status,
  ).toBe(413);
  await db
    .doc("users/admin")
    .update({ validAfter: Math.floor(Date.now() / 1000) + 10 });
  expect((await call(admin)).status).toBe(403);
});
