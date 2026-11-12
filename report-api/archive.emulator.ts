import { beforeAll, beforeEach, afterAll, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { dependencies, seed, db, projectId } from "./test/emulators";
import type { Dependencies, Document } from "./types";
import { workService } from "./work";
import { archiveService } from "./archive";
import { makePortable, portableText, sha256 } from "../src/reportArchive";
import { emptyBilling } from "../src/reportWorkModel";
import {
  createRelayHarness,
  fixtureRelaySecret,
  fixtureRelayUrl,
} from "../report-relay/test/harness.mjs";
import sharp from "sharp";
let deps: Dependencies,
  work: ReturnType<typeof workService>,
  archive: ReturnType<typeof archiveService>,
  env: RulesTestEnvironment,
  relay: ReturnType<typeof createRelayHarness>;
const id = "KHT-20261112-ABCDEF",
  copyId = "KHT-20261112-FEDCBA";
const claims = (uid: string) => ({
  uid,
  email: uid + "@example.test",
  authTime: Math.floor(Date.now() / 1000),
});
const w = (uid: string, p: object) =>
  work(claims(uid), p as Document) as Promise<any>;
const a = (uid: string, p: object) =>
  archive(claims(uid), p as Document) as Promise<any>;
const transition = (
  uid: string,
  revision: number,
  status: string,
  extra: object = {},
) =>
  w(uid, {
    action: "transition",
    id,
    revision,
    status,
    requestId: crypto.randomUUID(),
    ...extra,
  });
beforeAll(async () => {
  deps = await dependencies();
  work = workService(deps.db);
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8085,
      rules: readFileSync("firebase/firestore.rules", "utf8"),
    },
  });
});
beforeEach(async () => {
  await seed();
  relay = createRelayHarness();
  archive = archiveService(deps.db, {
    relayUrl: fixtureRelayUrl,
    secret: fixtureRelaySecret,
    fetcher: relay.fetcher,
    deletionEnabled: true,
    retentionDays: 0,
    policyVersion: "test-policy",
  });
});
afterAll(() => env.cleanup());
const client = (uid: string) =>
  env
    .authenticatedContext(uid, { auth_time: Math.floor(Date.now() / 1000) })
    .firestore();
async function ready() {
  const created = await w("admin", {
    action: "createOrder",
    id,
    requestId: crypto.randomUUID(),
    customer: "Testiasiakas",
    address: "Testikatu 1",
    description: "Koeponnistus",
    schedule: "",
    quotationReference: "",
    assignedTo: ["employee"],
  });
  const updated = await w("admin", {
    action: "save",
    id,
    revision: created.report.revision,
    requestId: crypto.randomUUID(),
    form: {
      ...created.report.form,
      hours: "2",
      materials: [
        { name: "Liitin", quantity: "2", unit: "kpl", unitPriceCents: 2500 },
      ],
    },
    billing: {
      ...emptyBilling(),
      hourRateCents: 10000,
      travelRateCents: 100,
      vatBasisPoints: 2550,
    },
    operations: {
      travelKm: 10,
      otherCents: 1600,
      otherDescription: "Testikulut",
    },
  });
  return (
    await transition("employee", updated.report.revision, "PENDING_REVIEW")
  ).report;
}
async function approved() {
  const pending = await ready();
  return (
    await transition("admin", pending.revision, "APPROVED", {
      confirmedApproval: true,
    })
  ).report;
}
test("schema-2 finance migrates atomically, Employee API/Firestore/cache boundaries contain only operational values", async () => {
  const pending = await ready();
  const legacy = await w("admin", { action: "load", id });
  await db
    .doc("reports/" + id)
    .set({
      ...legacy.report,
      schemaVersion: 2,
      fingerprint: "protected-financial-fingerprint",
    });
  await db.doc("reportFinances/" + id).delete();
  await assertFails(getDoc(doc(client("employee"), "reports", id)));
  const employee = (await w("employee", { action: "load", id })).report;
  expect(employee).not.toHaveProperty("billing");
  expect(employee).not.toHaveProperty("fingerprint");
  expect(employee.operations).toMatchObject({ travelKm: 10, otherCents: 1600 });
  const shared = (await db.doc("reports/" + id).get()).data()!;
  expect(shared.schemaVersion).toBe(3);
  expect(shared).not.toHaveProperty("billing");
  expect(shared).not.toHaveProperty("fingerprint");
  await assertSucceeds(getDoc(doc(client("employee"), "reports", id)));
  await assertFails(getDoc(doc(client("employee"), "reportFinances", id)));
  await assertFails(getDoc(doc(client("employee"), "archiveMetadata", id)));
  await expect(
    w("employee", {
      action: "save",
      id,
      revision: pending.revision,
      requestId: crypto.randomUUID(),
      form: employee.form,
      billing: emptyBilling(),
    }),
  ).rejects.toMatchObject({ code: "report_locked" });
  await transition("admin", pending.revision, "RETURNED", {
    comment: "Täydennä",
  });
  const r = (await w("employee", { action: "load", id })).report;
  await w("employee", {
    action: "save",
    id,
    revision: r.revision,
    requestId: crypto.randomUUID(),
    form: r.form,
    operations: {
      travelKm: 12.5,
      otherCents: 500,
      otherDescription: "Pysäköinti",
    },
  });
  const admin = (await w("admin", { action: "load", id })).report;
  expect(admin.billing.hourRateCents).toBe(10000);
  expect(admin.operations.travelKm).toBe(12.5);
  await expect(
    w("employee", { action: "loadMaterial", id: "private-cost" }),
  ).rejects.toMatchObject({ code: "admin_required" });
});
test("only active Admin explicitly approves pending exact revision; approved body, signature and financial snapshot lock", async () => {
  const pending = await ready();
  await expect(
    transition("employee", pending.revision, "APPROVED", {
      confirmedApproval: true,
    }),
  ).rejects.toMatchObject({ code: "admin_required" });
  await expect(
    transition("admin", pending.revision, "APPROVED"),
  ).rejects.toMatchObject({ code: "approval_confirmation_required" });
  await expect(
    transition("admin", pending.revision - 1, "APPROVED", {
      confirmedApproval: true,
    }),
  ).rejects.toMatchObject({ code: "revision_conflict" });
  const payload = {
    action: "transition",
    id,
    revision: pending.revision,
    status: "APPROVED",
    confirmedApproval: true,
    requestId: crypto.randomUUID(),
  };
  const result = (await w("admin", payload)).report;
  expect(result.status).toBe("APPROVED");
  expect(result.approval.revision).toBe(result.revision);
  expect((await w("admin", payload)).report.revision).toBe(result.revision);
  await expect(
    w("admin", {
      action: "save",
      id,
      revision: result.revision,
      requestId: crypto.randomUUID(),
      form: result.form,
    }),
  ).rejects.toMatchObject({ code: "report_locked" });
  await assertFails(
    updateDoc(doc(client("admin"), "reports", id), { status: "IN_PROGRESS" }),
  );
  await assertFails(
    setDoc(doc(client("employee"), "reportFinances", id), { billing: {} }),
  );
  const portable = await makePortable(result),
    privateDoc = (await db.doc("reportFinances/" + id).get()).data()!;
  expect(privateDoc.snapshotHash).toBe(portable.integrity.value);
  expect(portable.totals).toMatchObject({
    net: 27600,
    vat: 7038,
    gross: 34638,
  });
  const before = (await db.doc("reports/" + id).get()).data();
  await a("admin", {
    action: "copy",
    id,
    targetId: copyId,
    requestId: crypto.randomUUID(),
  });
  expect((await db.doc("reports/" + id).get()).data()).toEqual(before);
  const copy = (await w("admin", { action: "load", id: copyId })).report;
  expect(copy.status).toBe("NEW");
  expect(copy.signature).toBeNull();
  expect(copy.approval).toBeUndefined();
});
test("archive sends once, service acceptance is unverified, and exact file receipt gates active-data deletion and id reuse", async () => {
  const r = await approved();
  await expect(a("employee", { action: "snapshot", id })).rejects.toMatchObject(
    { code: "admin_required" },
  );
  const sent = await Promise.all([
    a("admin", { action: "send", id, revision: r.revision }),
    a("admin", { action: "send", id, revision: r.revision }),
  ]);
  expect(relay.state.mailbox).toHaveLength(1);
  expect(sent.some((s) => s.archive.status === "ARCHIVE_SENT_UNVERIFIED")).toBe(
    true,
  );
  const meta = (await db.doc("archiveMetadata/" + id).get()).data()!;
  expect(meta.status).not.toBe("ARCHIVE_CONFIRMED");
  await expect(
    a("admin", {
      action: "delete",
      id,
      revision: r.revision,
      confirmationId: id,
      recoverable: true,
      policyVersion: "test-policy",
    }),
  ).rejects.toMatchObject({ code: "archive_delete_blocked" });
  const pdf = relay.state.mailbox[0].attachments[0],
    portableBlob = relay.state.mailbox[0].attachments[1];
  const receipt = {
    action: "confirm",
    id,
    revision: r.revision,
    confirmationId: id,
    recoverable: true,
    receiptMethod: "mailbox",
    pdfSha256: await sha256(new Uint8Array(pdf.getBytes())),
    portableSha256: await sha256(portableBlob.getDataAsString()),
  };
  await expect(
    a("admin", { ...receipt, pdfSha256: "0".repeat(64) }),
  ).rejects.toMatchObject({ code: "archive_receipt_invalid" });
  expect((await a("admin", receipt)).archive.status).toBe("ARCHIVE_CONFIRMED");
  expect(
    (
      await a("admin", {
        action: "delete",
        id,
        revision: r.revision,
        confirmationId: id,
        recoverable: true,
        policyVersion: "test-policy",
      })
    ).removed,
  ).toBe(true);
  expect((await db.doc("reports/" + id).get()).exists).toBe(false);
  expect((await db.doc("reportFinances/" + id).get()).exists).toBe(false);
  expect((await db.doc("workOrders/" + id).get()).exists).toBe(false);
  const retained = (await db.doc("archiveMetadata/" + id).get()).data()!;
  expect(retained).not.toHaveProperty("customer");
  expect(retained).not.toHaveProperty("form");
  await expect(
    w("admin", {
      action: "save",
      id,
      revision: 0,
      requestId: crypto.randomUUID(),
      form: r.form,
    }),
  ).rejects.toMatchObject({ code: "report_archived" });
  await a("admin", {
    action: "import",
    id,
    targetId: copyId,
    requestId: crypto.randomUUID(),
    portable: portableBlob.getDataAsString(),
  });
  expect(
    (await w("admin", { action: "load", id: copyId })).report.form.materials[0]
      .unitPriceCents,
  ).toBe(2500);
});
test("unknown MailApp outcome cannot resend; verified downloaded files and sealed operation resolve recovery without claiming inbox delivery", async () => {
  const r = await approved();
  relay.state.throwAfterSend = true;
  expect(
    (await a("admin", { action: "send", id, revision: r.revision })).archive
      .status,
  ).toBe("ARCHIVE_OUTCOME_UNKNOWN");
  expect(relay.state.mailbox).toHaveLength(1);
  relay.state.throwAfterSend = false;
  await a("admin", { action: "send", id, revision: r.revision });
  expect(relay.state.mailbox).toHaveLength(1);
  await a("admin", { action: "prepare", id, revision: r.revision });
  const m = (await db.doc("archiveMetadata/" + id).get()).data()!;
  const receipt = await a("admin", {
    action: "confirm",
    id,
    revision: r.revision,
    pdfSha256: m.pdfSha256,
    portableSha256: m.portableSha256,
    receiptMethod: "download",
    confirmationId: id,
    recoverable: true,
  });
  expect(receipt.archive.deliveryResolved).toBe(true);
  expect(relay.state.mailbox).toHaveLength(1);
});
test("known pre-send quota failure retries safely, missing relay and unapproved retention never pretend to work", async () => {
  const r = await approved();
  relay.state.quota = 0;
  expect(
    (await a("admin", { action: "send", id, revision: r.revision })).archive
      .status,
  ).toBe("ARCHIVE_FAILED");
  expect(relay.state.mailbox).toHaveLength(0);
  relay.state.quota = 100;
  expect(
    (await a("admin", { action: "send", id, revision: r.revision })).archive
      .status,
  ).toBe("ARCHIVE_SENT_UNVERIFIED");
  expect(relay.state.mailbox).toHaveLength(1);
  const unconfigured = archiveService(deps.db);
  await expect(
    unconfigured(claims("admin"), {
      action: "prepare",
      id,
      revision: r.revision,
    }),
  ).rejects.toMatchObject({ code: "archive_not_configured" });
  await expect(
    unconfigured(claims("admin"), {
      action: "delete",
      id,
      revision: r.revision,
      confirmationId: id,
      recoverable: true,
      policyVersion: "none",
    }),
  ).rejects.toMatchObject({ code: "retention_not_configured" });
});
test("bounded vector signature survives cloud and approval; wrong context and unconfirmed ink cannot be approved", async () => {
  const p = await ready();
  await transition("admin", p.revision, "RETURNED", {
    comment: "Allekirjoitus",
  });
  let r = (await w("employee", { action: "load", id })).report;
  const signature = {
    version: 1,
    strokes: [{ points: [100, 100, 1200, 2500] }],
    confirmedAt: "",
    context: { reportId: id, customer: r.form.customer, date: r.form.date },
  };
  r = (
    await w("employee", {
      action: "save",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      form: r.form,
      signature,
    })
  ).report;
  r = (await transition("employee", r.revision, "PENDING_REVIEW")).report;
  await expect(
    transition("admin", r.revision, "APPROVED", { confirmedApproval: true }),
  ).rejects.toMatchObject({ code: "signature_confirmation_required" });
  await transition("admin", r.revision, "RETURNED", { comment: "Vahvista" });
  r = (await w("employee", { action: "load", id })).report;
  r = (
    await w("employee", {
      action: "save",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      form: r.form,
      signature: { ...signature, confirmedAt: new Date().toISOString() },
    })
  ).report;
  expect(r.signature.recordedAt).toBeTruthy();
  r = (await transition("employee", r.revision, "PENDING_REVIEW")).report;
  r = (
    await transition("admin", r.revision, "APPROVED", {
      confirmedApproval: true,
    })
  ).report;
  const portable = (await a("admin", { action: "snapshot", id })).portable;
  expect(portable.report.signature).toEqual(r.signature);
  await expect(
    w("employee", {
      action: "save",
      id,
      revision: p.revision,
      requestId: crypto.randomUUID(),
      form: r.form,
      signature,
    }),
  ).rejects.toMatchObject({ code: "revision_conflict" });
});

test("photos use bounded, revision-bound permits; exact independent photo receipt seals ambiguous sends without duplication", async () => {
  await approved();
  const bytes = readFileSync("e2e/fixtures/before.jpg"),
    dimensions = await sharp(bytes).metadata();
  const manifest = [
    {
      sha256: await sha256(bytes),
      bytes: bytes.length,
      width: dimensions.width,
      height: dimensions.height,
      mime: "image/jpeg",
      category: "before",
    },
  ];
  await expect(
    a("other", { action: "photoPermit", id, manifest }),
  ).rejects.toMatchObject({ code: "report_forbidden" });
  await expect(
    a("employee", {
      action: "photoPermit",
      id,
      manifest: [{ ...manifest[0], bytes: 1200001 }],
    }),
  ).rejects.toMatchObject({ code: "photo_limits" });
  const permit = await a("employee", { action: "photoPermit", id, manifest });
  relay.state.throwAfterSend = true;
  relay.post({ ...permit.packet, photos: [bytes.toString("base64")] });
  expect(relay.state.mailbox).toHaveLength(1);
  expect((await a("employee", { action: "photoStatus", id })).status).toBe(
    "ARCHIVE_OUTCOME_UNKNOWN",
  );
  await expect(
    a("employee", { action: "photoPermit", id, manifest }),
  ).rejects.toMatchObject({ code: "photo_outcome_requires_check" });
  await expect(
    a("employee", {
      action: "confirmPhotos",
      id,
      photoHashes: [manifest[0].sha256],
      confirmationId: id,
      recoverable: true,
    }),
  ).rejects.toMatchObject({ code: "admin_required" });
  await expect(
    a("admin", {
      action: "confirmPhotos",
      id,
      photoHashes: ["0".repeat(64)],
      confirmationId: id,
      recoverable: true,
    }),
  ).rejects.toMatchObject({ code: "archive_receipt_invalid" });
  expect(
    (
      await a("admin", {
        action: "confirmPhotos",
        id,
        photoHashes: [manifest[0].sha256],
        confirmationId: id,
        recoverable: true,
      })
    ).archive.photo.status,
  ).toBe("ARCHIVE_CONFIRMED");
  relay.state.throwAfterSend = false;
  relay.post({ ...permit.packet, photos: [bytes.toString("base64")] });
  expect(relay.state.mailbox).toHaveLength(1);
  expect((await a("employee", { action: "photoStatus", id })).status).toBe(
    "ARCHIVE_CONFIRMED",
  );
});
