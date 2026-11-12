import { ApiError, type Database, type Document } from "./types";
import {
  emptyBilling,
  emptyOperations,
  type WorkReport,
} from "../src/reportWorkModel";
import { validBilling, validOperations } from "../src/reportArchive";
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type FullReport = WorkReport & {
  billing: ReturnType<typeof emptyBilling>;
};
export function publicReport(r: WorkReport): WorkReport {
  return {
    id: r.id,
    schemaVersion: 3,
    ownerUid: r.ownerUid,
    assignedTo: r.assignedTo,
    title: r.title,
    status: r.status,
    revision: r.revision,
    form: r.form,
    operations: r.operations || emptyOperations(),
    signature: r.signature || null,
    ...(r.approval ? { approval: r.approval } : {}),
    ...(r.source ? { source: r.source } : {}),
    schedule: r.schedule,
    quotationReference: r.quotationReference,
    workOrderId: r.workOrderId,
    comment: r.comment,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    updatedBy: r.updatedBy,
    lastMutation: r.lastMutation,
  };
}
export function opsFromBilling(b: ReturnType<typeof emptyBilling>) {
  return {
    travelKm: b.travelKm,
    otherCents: b.otherCents,
    otherDescription: b.otherDescription,
  };
}
export async function readWork(tx: Tx, id: string) {
  const raw = await tx.get("reports/" + id);
  if (!raw || ![2, 3].includes(Number(raw.schemaVersion)))
    return { raw, report: null, finance: null };
  const r = raw as unknown as WorkReport;
  const finance = await tx.get("reportFinances/" + id);
  const b = r.schemaVersion === 2 ? raw.billing : finance?.billing;
  if (!validBilling(b)) throw new ApiError("finance_migration_required", 409);
  const operations = r.schemaVersion === 2 ? opsFromBilling(b) : r.operations;
  if (!validOperations(operations))
    throw new ApiError("finance_migration_required", 409);
  const full: FullReport = {
    ...r,
    schemaVersion: 3,
    billing: { ...b, ...operations },
    operations,
    signature: r.signature || null,
  };
  const privateDoc: Document =
    r.schemaVersion === 2
      ? {
          ...finance,
          id,
          billing: b as unknown as Document,
          revision: r.revision,
          fingerprint: raw.fingerprint || "",
          lastMutation: r.lastMutation,
        }
      : finance!;
  if (r.schemaVersion === 2) {
    // Full replacement, not a merge: removes legacy billing and price-bearing fingerprint.
    tx.put("reports/" + id, publicReport(full) as unknown as Document);
    tx.put("reportFinances/" + id, privateDoc);
  }
  return { raw, report: full, finance: privateDoc };
}
export function viewerReport(report: FullReport, admin: boolean) {
  return admin ? report : publicReport(report);
}
