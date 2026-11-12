import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { readWork } from "../report-api/workStorage";
import type { Document } from "../report-api/types";
const project = process.argv.find((v) => v.startsWith("--project="))?.slice(10);
const apply = process.argv.includes("--apply");
if (
  !project ||
  !/^[a-z][a-z0-9-]{4,29}$/.test(project) ||
  process.argv
    .slice(2)
    .some(
      (v) =>
        ![
          "--apply",
          `--project=${project}`,
          `--confirm-project=${project}`,
        ].includes(v),
    )
)
  throw Error(
    "Usage: node scripts/migrate-report-finances.mjs --project=PROJECT [--apply --confirm-project=PROJECT]",
  );
if (apply && !process.argv.includes(`--confirm-project=${project}`))
  throw Error("Explicit project confirmation required for writes.");
const app = initializeApp({
  projectId: project,
  ...(!process.env.FIRESTORE_EMULATOR_HOST
    ? { credential: applicationDefault() }
    : {}),
});
const store = getFirestore(app);
let cursor: string | undefined,
  count = 0;
for (;;) {
  let query = store
    .collection("reports")
    .where("schemaVersion", "==", 2)
    .orderBy(FieldPath.documentId())
    .limit(25);
  if (cursor) query = query.startAfter(cursor);
  const page = await query.get();
  if (page.empty) break;
  for (const document of page.docs) {
    await store.runTransaction(async (tx) => {
      const writes: Array<{ path: string; value: Document }> = [];
      const read = await readWork(
        {
          get: async (path) =>
            ((await tx.get(store.doc(path))).data() as Document) || null,
          put: (path, value) => {
            writes.push({ path, value });
          },
        },
        document.id,
      );
      if (!read.report)
        throw Error("Unexpected report schema; stopped without replacing it.");
      if (apply) for (const w of writes) tx.set(store.doc(w.path), w.value);
    });
    count++;
  }
  cursor = page.docs.at(-1)!.id;
}
console.log(
  JSON.stringify({
    project,
    mode: apply ? "applied" : "dry-run",
    validatedReports: count,
  }),
);
// No report content, financial values or credentials are printed.
