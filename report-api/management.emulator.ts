import { beforeAll, beforeEach, expect, test } from "vitest";
import { dependencies, seed, db,login } from "./test/emulators";
import {reportHandler} from './worker';
import { managementService } from "./management";
import { workService } from "./work";
import { archiveService } from "./archive";
import type { Document } from "./types";
import { helsinkiToday } from "../src/reportLocale";
let manage: ReturnType<typeof managementService>,
  work: ReturnType<typeof workService>;
const claims = (uid = "admin") => ({
  uid,
  email: uid + "@example.test",
  authTime: Math.floor(Date.now() / 1000),
});
const m = (p: object, uid = "admin") => manage(claims(uid), p as Document);
const w = (p: object) => work(claims(), p as Document) as Promise<any>;
const id = "KHT-20261114-ABCDEF",
  target = "KHT-20261114-FEDCBA",
  reference = "KHT-20261114-AABBCCDDEEFF";
beforeAll(async () => {
  const deps = await dependencies();
  manage = managementService(deps.db);
  work = workService(deps.db);
});
beforeEach(seed);
test('authenticated manual import accepts a valid Finnish UTF-8 description above 12 KiB and rejects an oversized HTTP body',async()=>{
  const deps=await dependencies(),handler=reportHandler(deps,['https://example.test']),token=await login('admin');
  const quote={action:'quoteImport',reference,name:'Testiasiakas',email:'test@example.test',address:'ä'.repeat(500),description:'ä'.repeat(6000),schedule:''};
  const send=(data:object)=>handler(new Request('https://report-api.test/management',{method:'POST',headers:{Origin:'https://example.test',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data)}));
  expect(new TextEncoder().encode(JSON.stringify(quote)).length).toBeGreaterThan(12000);
  const accepted=await send(quote);expect(accepted.status).toBe(200);expect((await accepted.json() as any).quotation.description.length).toBe(6000);
  const rejected=await send({...quote,description:'ä'.repeat(18000)});expect(rejected.status).toBe(413);expect((await db.doc('quotationRequests/'+reference).get()).data()?.description.length).toBe(6000);
});
async function order() {
  return (
    await w({
      action: "createOrder",
      id,
      requestId: crypto.randomUUID(),
      customer: "Testiasiakas",
      address: "Testikatu",
      description: "Testityö",
      assignedTo: ["employee"],
      schedule: "",
      quotationReference: "",
    })
  ).report;
}
test("management actions are denied to employees, disabled users and outsiders without modifying data", async () => {
  for (const uid of ["employee", "disabled", "outsider"])
    await expect(
      m(
        {
          action: "setPolicy",
          minimumDays: 0,
          effectiveFrom: "2026-11-14",
          reason: "Testipolitiikka",
          reviewed: true,
          revision: 0,
        },
        uid,
      ),
    ).rejects.toMatchObject({
      code: uid === "employee" ? "admin_required" : "access_disabled",
    });
  expect((await db.doc("settings/retention").get()).exists).toBe(false);
});
test("cancelled originals remain immutable; restore creates an idempotent editable copy; deletion leaves linked tombstone and audit", async () => {
  let r = await order();
  r = (
    await w({
      action: "transition",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      status: "CANCELLED",
      comment: "Asiakas perui työn",
    })
  ).report;
  const input = {
    action: "restore",
    id,
    revision: r.revision,
    targetId: target,
    requestId: crypto.randomUUID(),
  };
  expect((await m(input)).id).toBe(target);
  expect((await m(input)).id).toBe(target);
  expect((await db.doc("reports/" + id).get()).data()?.status).toBe(
    "CANCELLED",
  );
  expect((await db.doc("reports/" + target).get()).data()).toMatchObject({
    status: "NEW",
    source: { reportId: id },
    signature: null,
  });
  await expect(
    m({
      action: "remove",
      id,
      revision: r.revision,
      confirmationId: id,
      reason: "Tarpeeton testityö",
      legalChecked: false,
    }),
  ).rejects.toMatchObject({ code: "archive_delete_blocked" });
  await m({
    action: "remove",
    id,
    revision: r.revision,
    confirmationId: id,
    reason: "Tarpeeton testityö",
    legalChecked: true,
  });
  expect((await db.doc("reports/" + id).get()).exists).toBe(false);
  expect((await db.doc("workOrders/" + id).get()).exists).toBe(false);
  expect((await db.doc("reportFinances/" + id).get()).exists).toBe(false);
  expect(
    (await db.doc("archiveMetadata/" + id).get()).data()?.previousStatus,
  ).toBe("CANCELLED");
  expect((await db.doc("auditEvents/work-remove-" + id).get()).exists).toBe(
    true,
  );
  expect(
    (await db.doc("reports/" + target).get()).data()?.source.reportId,
  ).toBe(id);
});
test("retention defaults to none, creates versioned future-effective policies, rejects stale edits and never schedules deletion", async () => {
  const deps = await dependencies(),
    archive = archiveService(deps.db, { deletionEnabled: true });
  expect((await archive(claims(), { action: "capabilities" })).canDelete).toBe(
    false,
  );
  const today = helsinkiToday(),
    policy = {
      action: "setPolicy",
      revision: 0,
      minimumDays: 3650,
      effectiveFrom: today,
      reason: "Omistajan vahvistama testikäytäntö",
      reviewed: true,
    };
  const first = await m(policy);
  expect(first.settings.policies[0].minimumDays).toBe(3650);
  expect(
    (await archive(claims(), { action: "capabilities" })).retentionDays,
  ).toBe(3650);
  await expect(m(policy)).rejects.toMatchObject({ code: "revision_conflict" });
  const second = await m({ ...policy, revision: 1, minimumDays: 7300 });
  expect(second.settings.policies).toHaveLength(2);
  expect(second.settings.policies[0]).toEqual(first.settings.policies[0]);
  expect((await db.collection("auditEvents").get()).size).toBe(2);
});
test("manual CONTACT import is idempotent; acceptance creates one unassigned order; conflict and reverse decisions cannot overwrite", async () => {
  const quote = {
    action: "quoteImport",
    reference,
    name: "Testiasiakas",
    email: "test@example.test",
    phone: "",
    address: "Testikatu 1",
    description: "Testityö",
    schedule: "Ensi viikko",
  };
  expect((await m(quote)).quotation.status).toBe("NEW");
  await m(quote);
  expect((await db.collection("quotationRequests").get()).size).toBe(1);
  await expect(m({ ...quote, name: "Eri asiakas" })).rejects.toMatchObject({
    code: "quotation_conflict",
  });
  await m({
    action: "quoteDecision",
    reference,
    decision: "accept",
    targetId: target,
  });
  await m({
    action: "quoteDecision",
    reference,
    decision: "accept",
    targetId: id,
  });
  expect((await db.collection("reports").get()).size).toBe(1);
  expect((await db.doc("reports/" + target).get()).data()?.assignedTo).toEqual(
    [],
  );
  expect(
    (await db.doc("reports/" + target).get()).data()?.quotationReference,
  ).toBe(reference);
  await expect(
    m({
      action: "quoteDecision",
      reference,
      decision: "reject",
      reason: "Virheellinen pyyntö",
    }),
  ).rejects.toMatchObject({ code: "revision_conflict" });
});
test("bounded server pages and filters include each report once and exclude outside date/employee/status", async () => {
  await order();
  const result = await m({
    action: "list",
    collection: "reports",
    filters: { status: "NEW", employee: "employee", search: "Testiasiakas" },
  });
  expect(result.scanned).toBeLessThanOrEqual(10);
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].summary.id).toBe(id);
  expect(
    (
      await m({
        action: "list",
        collection: "reports",
        filters: { employee: "other" },
      })
    ).rows,
  ).toHaveLength(0);
  await expect(
    m({ action: "list", collection: "users", filters: {} }),
  ).rejects.toMatchObject({ code: "invalid_request" });
  await expect(
    m({
      action: "list",
      collection: "reports",
      filters: { from: "2026-02-31" },
    }),
  ).rejects.toMatchObject({ code: "invalid_request" });
});
test("approved financial and purchase snapshots survive later catalog price changes and paginated retrieval never double-counts", async () => {
  await w({
    action: "material",
    id: "fitting",
    requestId: crypto.randomUUID(),
    revision: 0,
    name: "Liitin",
    code: "L1",
    unit: "kpl",
    sellingCents: 1500,
    purchaseCents: 1000,
    active: true,
  });
  let r = await order();
  r = (
    await w({
      action: "save",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      form: {
        ...r.form,
        hours: "2",
        materials: [
          {
            name: "Liitin",
            catalogId: "fitting",
            rowId: crypto.randomUUID(),
            unit: "kpl",
            quantity: "2",
            unitPriceCents: 1500,
          },
        ],
      },
    })
  ).report;
  r = (
    await w({
      action: "transition",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      status: "PENDING_REVIEW",
    })
  ).report;
  r = (
    await w({
      action: "transition",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      status: "APPROVED",
      confirmedApproval: true,
    })
  ).report;
  await w({
    action: "material",
    id: "fitting",
    requestId: crypto.randomUUID(),
    revision: 1,
    name: "Liitin",
    code: "L1",
    unit: "kpl",
    sellingCents: 2500,
    purchaseCents: 2000,
    active: true,
  });
  const result = await m({
    action: "list",
    collection: "reports",
    filters: { status: "APPROVED" },
  });
  expect(result.rows[0].summary.purchaseCents).toBe(2000);
  expect(result.rows[0].summary.totals.materialsTotal).toBe(3000);
  expect(result.rows[0].summary.finalized).toBe(true);
  await expect(
    m({
      action: "remove",
      id,
      revision: r.revision,
      confirmationId: id,
      reason: "Hyväksyttyä työtä ei saa poistaa näin",
      legalChecked: true,
    }),
  ).rejects.toMatchObject({ code: "archive_delete_blocked" });
  for (let n = 0; n < 11; n++) {
    const copy = {
      ...(await db.doc("reports/" + id).get()).data()!,
      id: "KHT-20261114-" + n.toString(16).padStart(6, "0").toUpperCase(),
    };
    await db.doc("reports/" + copy.id).set(copy);
    const finance = (await db.doc("reportFinances/" + id).get()).data()!; // Use unapproved copies: their approval hashes belong only to the original.
    await db
      .doc("reports/" + copy.id)
      .update({ status: "IN_PROGRESS", approval: null });
    await db.doc("reportFinances/" + copy.id).set({ ...finance, id: copy.id });
  }
  const first = await m({ action: "list", collection: "reports", filters: {} });
  expect(first.scanned).toBe(10);
  expect(first.nextPageToken).toBeTruthy();
  const second = await m({
    action: "list",
    collection: "reports",
    pageToken: first.nextPageToken,
    filters: {},
  });
  expect(second.scanned).toBe(2);
  expect(
    new Set([...first.rows, ...second.rows].map((row) => row.summary.id)).size,
  ).toBe(12);
});
