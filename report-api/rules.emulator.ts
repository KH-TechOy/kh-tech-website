import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { seed, projectId, db as adminDb } from "./test/emulators";
let env: RulesTestEnvironment;
beforeAll(async () => {
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
  for (const [id, owner, assigned] of [
    ["own", "employee", []],
    ["assigned", "other", ["employee"]],
    ["unrelated", "other", []],
  ] as const)
    await adminDb
      .doc("reports/" + id)
      .set({
        schemaVersion: 1,
        ownerUid: owner,
        assignedTo: assigned,
        title: "Työ",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
});
afterAll(async () => env.cleanup());
const client = (uid: string, authTime = Math.floor(Date.now() / 1000)) =>
  env
    .authenticatedContext(uid, {
      email: uid + "@example.test",
      auth_time: authTime,
    })
    .firestore();
const metadata = (ownerUid = "employee") => ({
  schemaVersion: 1,
  ownerUid,
  assignedTo: [],
  title: "Uusi työ",
  status: "draft",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
test("unauthenticated/unprovisioned/disabled/revoked users cannot access company data", async () => {
  for (const store of [
    env.unauthenticatedContext().firestore(),
    client("outsider"),
    client("disabled"),
    client("employee", -1),
  ])
    await assertFails(getDoc(doc(store, "reports/own")));
  await assertSucceeds(getDoc(doc(client("disabled"), "users/disabled"))); // own revocation state only
  await assertFails(getDoc(doc(client("disabled"), "users/admin")));
});
test("employees read own/assigned only and cannot run an unfiltered list", async () => {
  const store = client("employee");
  await assertSucceeds(getDoc(doc(store, "reports/own")));
  await assertSucceeds(getDoc(doc(store, "reports/assigned")));
  await assertFails(getDoc(doc(store, "reports/unrelated")));
  await assertFails(getDocs(query(collection(store, "reports"), limit(50))));
  await assertFails(getDocs(query(collection(store, "reports"), where("ownerUid", "==", "employee"), limit(50))));
  await assertFails(getDocs(query(collection(store, "reports"), where("assignedTo", "array-contains", "employee"), limit(50))));
  await assertFails(
    getDocs(
      query(collection(store, "reports"), where("ownerUid", "==", "employee")),
    ),
  );
  expect(
    (
      await assertSucceeds(
        getDocs(query(collection(client("admin"), "reports"), limit(50))),
      )
    ).size,
  ).toBe(3);
});
test("no client can write profiles, roles, admin counter, audit or archive metadata", async () => {
  for (const uid of ["admin", "employee"])
    for (const path of [
      "users/employee",
      "accessControl/admins",
      "auditEvents/forged",
      "archiveMetadata/fake",
    ])
      await assertFails(
        setDoc(doc(client(uid), path), {
          role: "admin",
          active: true,
          activeAdminCount: 999,
        }),
      );
  await assertFails(
    getDocs(query(collection(client("employee"), "users"), limit(50))),
  );
  await assertSucceeds(
    getDocs(query(collection(client("admin"), "users"), limit(50))),
  );
});
test("report creation/updates enforce ownership, assignment, state, small schema and timestamps", async () => {
  const store = client("employee");
  await assertSucceeds(setDoc(doc(store, "reports/new"), metadata()));
  await assertFails(setDoc(doc(store, "reports/forged"), metadata("other")));
  for (const extra of [
    { assignedTo: ["other"] },
    { title: "x".repeat(201) },
    { photos: ["private"] },
    { status: "completed" },
    { updatedAt: Timestamp.fromMillis(1) },
  ])
    await assertFails(
      setDoc(doc(store, "reports/bad"), { ...metadata(), ...extra }),
    );
  await assertFails(
    updateDoc(doc(store, "reports/own"), {
      ownerUid: "other",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(store, "reports/own"), {
      assignedTo: ["other"],
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(store, "reports/own"), {
      status: "submitted",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(client("admin"), "reports/own"), {
      status: "completed",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(store, "reports/own"), {
      status: "draft",
      updatedAt: serverTimestamp(),
    }),
  );
});
test("work orders/materials are admin writable only; audit is admin readable only", async () => {
  await assertFails(
    setDoc(doc(client("employee"), "workOrders/new"), metadata()),
  );
  await assertSucceeds(
    setDoc(doc(client("admin"), "workOrders/new"), metadata("admin")),
  );
  const material = {
    name: "Liitin",
    unit: "kpl",
    code: "L1",
    active: true,
    updatedAt: serverTimestamp(),
  };
  await assertFails(
    setDoc(doc(client("employee"), "materialCatalog/item"), material),
  );
  await assertSucceeds(
    setDoc(doc(client("admin"), "materialCatalog/item"), material),
  );
  await assertSucceeds(getDoc(doc(client("employee"), "materialCatalog/item")));
  await assertFails(
    getDocs(query(collection(client("employee"), "auditEvents"), limit(50))),
  );
  await assertSucceeds(
    getDocs(query(collection(client("admin"), "auditEvents"), limit(50))),
  );
});
test('B bodies cannot be downgraded or written directly and purchase prices cannot be read by employees', async () => {
  await adminDb.doc('reports/body').set({ schemaVersion: 2, ownerUid: 'employee', assignedTo: [], status: 'IN_PROGRESS', form: { customer: 'Asiakas' }, revision: 1 });
  await adminDb.doc('materialCosts/item').set({ purchaseCents: 123 });
  await adminDb.doc('materialCatalog/production').set({ id: 'production', revision: 1, active: true, name: 'Tuote', sellingCents: 500 });
  for (const uid of ['admin', 'employee']) {
    await (uid === 'admin' ? assertSucceeds : assertFails)(getDoc(doc(client(uid), 'reports/body')));
    await assertFails(setDoc(doc(client(uid), 'reports/body'), metadata(uid)));
    await assertFails(updateDoc(doc(client(uid), 'reports/body'), { 'form.notes': 'ohitus' }));
    await assertFails(updateDoc(doc(client(uid), 'reports/body'), { status: 'APPROVED' }));
    await assertFails(setDoc(doc(client(uid), 'materialCatalog/production'), { name: 'Korvattu', unit: 'kpl', code: '', active: true, updatedAt: serverTimestamp() }));
  }
  await assertFails(getDoc(doc(client('employee'), 'materialCosts/item')));
  await assertSucceeds(getDoc(doc(client('admin'), 'materialCosts/item')));
});
