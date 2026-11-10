import { beforeEach, expect, test } from "vitest";
import { provisionFirstAdmin } from "../scripts/provision-report-admin.mjs";
import { db, auth, seed, projectId } from "./test/emulators";
beforeEach(seed);
test("bootstrap refuses an existing initialized project", async () => {
  await expect(provisionFirstAdmin(db, auth, "admin")).rejects.toThrow(
    "Already initialized",
  );
});
test("two concurrent operator initializations yield exactly one first admin and one counter", async () => {
  await fetch(
    `http://127.0.0.1:8085/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  const results = await Promise.allSettled([
    provisionFirstAdmin(db, auth, "admin"),
    provisionFirstAdmin(db, auth, "admin2"),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await db.collection("users").get()).size).toBe(1);
  expect(
    (await db.doc("accessControl/admins").get()).get("activeAdminCount"),
  ).toBe(1);
  expect((await db.collection("auditEvents").get()).size).toBe(1);
});
