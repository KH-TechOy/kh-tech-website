import { beforeAll, beforeEach, expect, test } from "vitest";
import { dependencies, seed, db, login } from "./test/emulators";
import { workService } from "./work";
import { reportHandler } from "./worker";
import type { Dependencies, Document } from "./types";
import { emptyReport } from "../src/reportModel";
import { emptyBilling } from "../src/reportWorkModel";
let deps: Dependencies, work: ReturnType<typeof workService>;
beforeAll(async () => {
  deps = await dependencies();
  work = workService(deps.db);
});
beforeEach(seed);
const claims = (uid: string) => ({
  uid,
  email: uid + "@example.test",
  authTime: Math.floor(Date.now() / 1000),
});
const id = "KHT-20261111-ABCDEF";
const create = (assignedTo = ["employee"]) => ({
  action: "createOrder",
  id,
  requestId: crypto.randomUUID(),
  customer: "Testiasiakas",
  address: "Testikatu 1",
  description: "Korjaa liitos",
  schedule: "2026-11-12T09:00",
  quotationReference: "",
  assignedTo,
});
const call = async (uid: string, data: object) =>
  work(claims(uid), data as Document) as Promise<any>;
test("Admin creates a prefilled multi-assignee work order including themselves and assignment history", async () => {
  const payload = create(["employee", "admin"]);
  const first = await call("admin", payload);
  expect(first.report.status).toBe("NEW");
  expect(first.report.form.worker).toContain("employee");
  expect(first.report.form.date).toBe("2026-11-12");
  expect((await call("admin", payload)).report.revision).toBe(1);
  expect((await call("employee", { action: "load", id })).report.id).toBe(id);
  await expect(call("other", { action: "load", id })).rejects.toMatchObject({
    code: "report_forbidden",
  });
  const reassigned = await call("admin", {
    ...create(["other"]),
    action: "order",
    revision: 1,
  });
  expect(reassigned.report.assignedTo).toEqual(["other"]);
  await expect(call("employee", { action: "load", id })).rejects.toMatchObject({
    code: "report_forbidden",
  });
  const events = await db.collection("auditEvents").get();
  expect(events.size).toBe(2);
  expect(events.docs[1].data().assignedBefore).toEqual(["employee", "admin"]);
});
test("employees create personal reports but cannot create orders, change assignments, billing or approve", async () => {
  const state = emptyReport();
  state.form.customer = "Oma asiakas";
  const saved = await call("employee", {
    action: "save",
    id,
    requestId: crypto.randomUUID(),
    revision: 0,
    form: state.form,
  });
  expect(saved.report.ownerUid).toBe("employee");
  expect(saved.report.status).toBe("IN_PROGRESS");
  await expect(call("employee", create())).rejects.toMatchObject({
    code: "admin_required",
  });
  await expect(
    call("employee", {
      action: "save",
      id,
      requestId: crypto.randomUUID(),
      revision: 1,
      form: state.form,
      billing: { ...emptyBilling(), hourRateCents: 100 },
    }),
  ).rejects.toMatchObject({ code: "billing_protected" });
  await expect(
    call("employee", {
      action: "transition",
      id,
      requestId: crypto.randomUUID(),
      revision: 1,
      status: "APPROVED",
    }),
  ).rejects.toMatchObject({ code: "invalid_transition" });
  await expect(
    call("employee", { ...create(), action: "order", revision: 1 }),
  ).rejects.toMatchObject({ code: "admin_required" });
});
test("revision transactions prevent lost updates and permit idempotent retries", async () => {
  const initial = await call("admin", create());
  const payload = {
    action: "save",
    id,
    revision: 1,
    requestId: crypto.randomUUID(),
    form: initial.report.form,
  };
  const settled = await Promise.allSettled([
    call("employee", { ...payload, form: { ...payload.form, notes: "A" } }),
    call("employee", {
      ...payload,
      requestId: crypto.randomUUID(),
      form: { ...payload.form, notes: "B" },
    }),
  ]);
  expect(settled.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(settled.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect((await db.doc("reports/" + id).get()).data()?.revision).toBe(2);
  const latest = (await call("employee", { action: "load", id })).report;
  const retry = {
    ...payload,
    revision: 2,
    requestId: crypto.randomUUID(),
    form: latest.form,
  };
  await call("employee", retry);
  expect((await call("employee", retry)).report.revision).toBe(3);
  await expect(
    call("employee", {
      ...retry,
      form: { ...retry.form, notes: "changed payload" },
    }),
  ).rejects.toMatchObject({ code: "request_conflict" });
});
test("submission, return comments, correction and cancellation follow the audited state machine", async () => {
  const initial = await call("admin", create());
  const transition = (
    uid: string,
    revision: number,
    status: string,
    comment = "",
  ) =>
    call(uid, {
      action: "transition",
      id,
      revision,
      status,
      comment,
      requestId: crypto.randomUUID(),
    });
  const submitted = await transition("employee", 1, "PENDING_REVIEW");
  expect(submitted.report.status).toBe("PENDING_REVIEW");
  await expect(
    call("employee", {
      action: "save",
      id,
      revision: 2,
      requestId: crypto.randomUUID(),
      form: initial.report.form,
    }),
  ).rejects.toMatchObject({ code: "report_locked" });
  await expect(
    transition("employee", 2, "RETURNED", "ohita"),
  ).rejects.toMatchObject({ code: "invalid_transition" });
  await expect(transition("admin", 2, "RETURNED")).rejects.toMatchObject({
    code: "invalid_request",
  });
  const returned = await transition(
    "admin",
    2,
    "RETURNED",
    "Täydennä työvaiheet",
  );
  expect(returned.report.comment).toBe("Täydennä työvaiheet");
  const corrected = await call("employee", {
    action: "save",
    id,
    revision: 3,
    requestId: crypto.randomUUID(),
    form: { ...returned.report.form, tasks: "Liitos vaihdettu" },
  });
  expect(corrected.report.status).toBe("RETURNED");
  await transition("employee", 4, "PENDING_REVIEW");
  await transition("admin", 5, "CANCELLED", "Tilaaja perui");
  expect((await db.doc("workOrders/" + id).get()).data()?.status).toBe(
    "CANCELLED",
  );
  expect((await db.collection("auditEvents").get()).size).toBe(5);
});
test("catalog prices are snapshots, purchase prices are separated and employee manual prices are protected", async () => {
  const materialId = crypto.randomUUID();
  const material = {
    action: "material",
    id: materialId,
    requestId: crypto.randomUUID(),
    revision: 0,
    name: "Liitin",
    code: "L-1",
    unit: "kpl",
    sellingCents: 1200,
    purchaseCents: 400,
    active: true,
  };
  await call("admin", material);
  const item = (await db.doc("materialCatalog/" + materialId).get()).data()!;
  expect(item).not.toHaveProperty("purchaseCents");
  expect(item).not.toHaveProperty("fingerprint");
  await call("admin", material); // Idempotency is checked in the private document, not a public price hash.
  expect(
    (await db.doc("materialCosts/" + materialId).get()).data()?.purchaseCents,
  ).toBe(400);
  const initial = (await call("admin", create())).report;
  const row = {
    rowId: crypto.randomUUID(),
    catalogId: materialId,
    name: "Liitin",
    quantity: "2",
    unit: "kpl",
    unitPriceCents: 1200,
  };
  const saved = (
    await call("employee", {
      action: "save",
      id,
      revision: 1,
      requestId: crypto.randomUUID(),
      form: { ...initial.form, materials: [row] },
    })
  ).report;
  await call("admin", {
    ...material,
    revision: 1,
    requestId: crypto.randomUUID(),
    sellingCents: 1700,
    active: false,
  });
  const again = (
    await call("employee", {
      action: "save",
      id,
      revision: 2,
      requestId: crypto.randomUUID(),
      form: { ...saved.form, materials: [{ ...row, quantity: "3" }] },
    })
  ).report;
  expect(again.form.materials[0].unitPriceCents).toBe(1200);
  await expect(
    call("employee", {
      action: "save",
      id,
      revision: 3,
      requestId: crypto.randomUUID(),
      form: { ...again.form, materials: [{ ...row, unitPriceCents: 1 }] },
    }),
  ).rejects.toMatchObject({ code: "billing_protected" });
  const manual = await call("employee", {
    action: "save",
    id,
    revision: 3,
    requestId: crypto.randomUUID(),
    form: {
      ...again.form,
      materials: [
        ...again.form.materials,
        { name: "Oma tarvike", quantity: "1,5", unit: "m" },
      ],
    },
  });
  const priced = await call("admin", {
    action: "save",
    id,
    revision: 4,
    requestId: crypto.randomUUID(),
    form: {
      ...manual.report.form,
      materials: manual.report.form.materials.map((r: object, i: number) =>
        i === 1 ? { ...r, unitPriceCents: 250 } : r,
      ),
    },
  });
  const quantity = await call("employee", {
    action: "save",
    id,
    revision: 5,
    requestId: crypto.randomUUID(),
    form: {
      ...priced.report.form,
      materials: priced.report.form.materials.map((r: object, i: number) =>
        i === 1 ? { ...r, quantity: "2" } : r,
      ),
    },
  });
  expect(quantity.report.form.materials[1].unitPriceCents).toBe(250);
  await expect(call("employee", material)).rejects.toMatchObject({
    code: "admin_required",
  });
});
test("disabled profiles, unknown fields, photos and invalid assignees are rejected without writes", async () => {
  await expect(call("disabled", create())).rejects.toMatchObject({
    code: "access_disabled",
  });
  await expect(call("admin", create(["outsider"]))).rejects.toMatchObject({
    code: "invalid_assignee",
  });
  await expect(
    call("employee", {
      action: "save",
      id,
      revision: 0,
      requestId: crypto.randomUUID(),
      form: { ...emptyReport().form, photos: ["data:image"] },
    }),
  ).rejects.toMatchObject({ code: "invalid_request" });
  expect((await db.doc("reports/" + id).get()).exists).toBe(false);
});
test("real authenticated Worker route allows employee autosave and reports backend rejections accurately", async () => {
  const handler = reportHandler(deps, ["http://localhost"]);
  const token = await login("employee");
  const send = (data: object) =>
    handler(
      new Request("https://worker/work", {
        method: "POST",
        headers: {
          Origin: "http://localhost",
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }),
    );
  const response = await send({
    action: "save",
    id,
    revision: 0,
    requestId: crypto.randomUUID(),
    form: emptyReport().form,
  });
  expect(response.status).toBe(200);
  const bad = await send(create());
  expect(bad.status).toBe(403);
  expect(await bad.json()).toEqual({ error: "admin_required" });
});
