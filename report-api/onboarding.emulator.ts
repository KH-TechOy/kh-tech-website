import { beforeAll, beforeEach, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import {
  dependencies,
  seed,
  login,
  db,
  auth,
  projectId,
} from "./test/emulators";
import { createService } from "./service";
import { reportHandler } from "./worker";
import { ApiError, type Dependencies } from "./types";
let deps: Dependencies;
beforeAll(async () => {
  deps = await dependencies();
});
beforeEach(seed);
async function actor() {
  return (await createService(deps).authenticate(await login("admin"))).claims;
}
const input = () => ({
  requestId: randomUUID(),
  email: randomUUID() + "@example.test",
  displayName: "Uusi asentaja",
});
async function codes(email: string) {
  const result = (await (
    await fetch(
      `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/oobCodes`,
    )
  ).json()) as any;
  return result.oobCodes.filter((v: any) => v.email === email);
}
test("creation automatically sends one setup action, preserves idempotency and employee can choose password then log in", async () => {
  const service = createService(deps),
    claims = await actor(),
    data = input();
  const result = await service.createEmployee(claims, data, "127.0.0.1");
  expect(result).toMatchObject({
    completed: true,
    setupEmail: { status: "accepted" },
  });
  expect(JSON.stringify(result)).not.toMatch(/oobCode|oobLink|password/i);
  expect(
    (await db.doc("users/" + result.uid).get()).get("passwordSetupRequired"),
  ).toBe(true);
  await service.createEmployee(claims, data, "127.0.0.1");
  expect(await codes(data.email)).toHaveLength(1);
  const code = (await codes(data.email))[0].oobCode;
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=emulator",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oobCode: code,
        newPassword: "New-emulator-password_42!",
      }),
    },
  );
  expect(response.status).toBe(200);
  const signed = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        password: "New-emulator-password_42!",
        returnSecureToken: true,
      }),
    },
  );
  expect(signed.status).toBe(200);
  const token = ((await signed.json()) as any).idToken;
  expect((await service.authenticate(token)).profile).toMatchObject({
    role: "employee",
    passwordSetupRequired: false,
  });
  await expect(
    service.mutate((await service.authenticate(token)).claims, {
      action: "role",
      uid: result.uid,
      role: "admin",
      requestId: randomUUID(),
    }),
  ).rejects.toMatchObject({ code: "admin_required" });
});
test("definitive email failure preserves a single account; explicit resend succeeds without recreating it", async () => {
  const claims = await actor(),
    data = input();
  let deliveries = 0;
  const service = createService({
    ...deps,
    identity: {
      ...deps.identity,
      reset: async () => {
        deliveries++;
        throw new ApiError("email_quota", 429);
      },
    },
  });
  const result = await service.createEmployee(claims, data, "127.0.0.1");
  expect(result).toMatchObject({
    completed: true,
    setupEmail: { status: "failed", error: "email_quota" },
  });
  expect((await auth.getUser(result.uid)).email).toBe(data.email);
  expect((await db.doc("users/" + result.uid).get()).get("active")).toBe(true);
  await service.createEmployee(claims, data, "127.0.0.1");
  expect(deliveries).toBe(1);
  const action = { uid: result.uid, requestId: randomUUID(), action: "reset" };
  await createService(deps).mutate(claims, action, "127.0.0.1");
  await createService(deps).mutate(claims, action, "127.0.0.1");
  expect(await codes(data.email)).toHaveLength(1);
  await expect(
    createService(deps).createEmployee(
      claims,
      { ...data, requestId: randomUUID() },
      "127.0.0.1",
    ),
  ).rejects.toMatchObject({ code: "email_exists" });
  expect(
    (await db.collection("users").where("email", "==", data.email).get()).size,
  ).toBe(1);
});
test("rejected reset can retry the same operation safely; ambiguous delivery cannot auto retry", async () => {
  const claims = await actor(),
    request = { uid: "employee", requestId: randomUUID(), action: "reset" };
  const reject = createService({
    ...deps,
    identity: {
      ...deps.identity,
      reset: async () => {
        throw new ApiError("email_permission_denied", 502);
      },
    },
  });
  await expect(
    reject.mutate(claims, request, "127.0.0.1"),
  ).rejects.toMatchObject({ code: "email_permission_denied" });
  await expect(
    createService(deps).mutate(claims, request, "127.0.0.1"),
  ).resolves.toMatchObject({ completed: true });
  const ambiguous = createService({
      ...deps,
      identity: {
        ...deps.identity,
        reset: async () => {
          throw new ApiError("email_outcome_unknown", 503);
        },
      },
    }),
    uncertain = { ...request, requestId: randomUUID() };
  await expect(
    ambiguous.mutate(claims, uncertain, "127.0.0.1"),
  ).rejects.toMatchObject({ code: "email_outcome_unknown" });
  await expect(
    createService(deps).mutate(claims, uncertain, "127.0.0.1"),
  ).rejects.toMatchObject({ code: "outcome_unknown" });
});
test("admin renames own and employee profiles without changing identity, roles or status; Auth agrees", async () => {
  const claims = await actor(),
    service = createService(deps);
  for (const [uid, displayName] of [
    ["admin", "Tomi"],
    ["employee", "Jari Asentaja"],
  ]) {
    await service.mutate(claims, {
      uid,
      displayName,
      action: "name",
      requestId: randomUUID(),
    });
    expect((await auth.getUser(uid)).displayName).toBe(displayName);
    expect((await db.doc("users/" + uid).get()).data()).toMatchObject({
      uid,
      displayName,
      active: true,
      role: uid === "admin" ? "admin" : "employee",
      email: uid + "@example.test",
    });
  }
  expect(
    (await db.doc("accessControl/admins").get()).get("activeAdminCount"),
  ).toBe(2);
});
test("names reject empty/long/control values, client role injection and employee name writes", async () => {
  const claims = await actor(),
    service = createService(deps);
  for (const displayName of ["", "   ", "x".repeat(121), "Bad\nName"])
    await expect(
      service.mutate(claims, {
        uid: "admin",
        displayName,
        action: "name",
        requestId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "invalid_name" });
  await expect(
    service.mutate(claims, {
      uid: "admin",
      displayName: "Tomi",
      role: "employee",
      action: "name",
      requestId: randomUUID(),
    }),
  ).rejects.toMatchObject({ code: "invalid_request" });
  const employee = (await service.authenticate(await login("employee"))).claims;
  await expect(
    service.mutate(employee, {
      uid: "employee",
      displayName: "Other",
      action: "name",
      requestId: randomUUID(),
    }),
  ).rejects.toMatchObject({ code: "admin_required" });
});
test("Auth name failure is reported as pending while authoritative Firestore name remains recoverable", async () => {
  const claims = await actor(),
    data = {
      uid: "admin",
      displayName: "Tomi",
      action: "name",
      requestId: randomUUID(),
    };
  const failing = createService({
    ...deps,
    identity: {
      ...deps.identity,
      rename: async () => {
        throw new Error("provider down");
      },
    },
  });
  await expect(failing.mutate(claims, data)).rejects.toMatchObject({
    code: "name_auth_pending",
  });
  expect((await db.doc("users/admin").get()).get("displayName")).toBe("Tomi");
  await createService(deps).mutate(claims, data);
  expect((await auth.getUser("admin")).displayName).toBe("Tomi");
});
test("backend exposes sanitized email errors with correct HTTP status, never a success or token", async () => {
  const handler = reportHandler(
    {
      ...deps,
      identity: {
        ...deps.identity,
        reset: async () => {
          throw new ApiError("email_quota", 429);
        },
      },
    },
    ["https://khtechoy.github.io"],
  );
  const response = await handler(
    new Request("https://api.example/employees/action", {
      method: "POST",
      headers: {
        Origin: "https://khtechoy.github.io",
        Authorization: "Bearer " + (await login("admin")),
        "Content-Type": "application/json",
        "CF-Connecting-IP": "127.0.0.1",
      },
      body: JSON.stringify({
        uid: "employee",
        requestId: randomUUID(),
        action: "reset",
      }),
    }),
  );
  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({ error: "email_quota" });
});
