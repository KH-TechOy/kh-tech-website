import {
  ApiError,
  usable,
  type Claims,
  type Database,
  type Document,
} from "./types";
import { readWork, publicReport, type Tx } from "./workStorage";
import { asDoc, type RetentionPolicy } from "./retentionPolicy";
import { emptyReport } from "../src/reportModel";
import { emptyBilling, emptyOperations } from "../src/reportWorkModel";
import { makePortable, sha256, canonical } from "../src/reportArchive";
import { summaryRow } from "../src/reportSummary";
import { helsinkiToday } from "../src/reportLocale";
import { retentionPolicy } from "./retentionPolicy";
import { retentionWindow } from "../src/reportRetention";
import type { ArchiveConfig } from "./archive";
const idPattern = /^KHT-\d{8}-[A-F0-9]{6}$/;
const date = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
function text(
  v: unknown,
  max: number,
  required = false,
  multiline = false,
): string {
  if (
    typeof v !== "string" ||
    v.length > max ||
    (required && !v.trim()) ||
    (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(v)
  )
    throw new ApiError("invalid_request", 400);
  return v.trim();
}
export function managementService(db: Database, config: ArchiveConfig = {}) {
  const authorize = async (tx: Tx, claims: Claims) => {
    const p = await tx.get("users/" + claims.uid);
    if (!usable(p, claims)) throw new ApiError("access_disabled", 403);
    if (p.role !== "admin") throw new ApiError("admin_required", 403);
  };
  return async (claims: Claims, input: Document): Promise<any> => {
    await db.transaction((tx) => authorize(tx, claims), 1);
    const action = String(input.action);
    const allowed: Record<string, string[]> = {
      list: ["action", "collection", "pageToken", "filters"],
      policy: ["action"],
      setPolicy: [
        "action",
        "minimumDays",
        "effectiveFrom",
        "reason",
        "reviewed",
        "revision",
      ],
      restore: ["action", "id", "targetId", "revision", "requestId"],
      remove: [
        "action",
        "id",
        "revision",
        "confirmationId",
        "reason",
        "legalChecked",
      ],
      quoteImport: [
        "action",
        "reference",
        "name",
        "email",
        "phone",
        "address",
        "description",
        "schedule",
      ],
      quoteDecision: ["action", "reference", "decision", "reason", "targetId"],
    };
    if (
      !allowed[action] ||
      Object.keys(input).some((k) => !allowed[action].includes(k))
    )
      throw new ApiError("invalid_request", 400);
    if (action === "list") {
      const collection = text(input.collection, 30);
      if (
        !["reports", "quotationRequests", "archiveMetadata"].includes(
          collection,
        )
      )
        throw new ApiError("invalid_request", 400);
      const token = input.pageToken ? text(input.pageToken, 2000) : undefined;
      const filters = (input.filters || {}) as Record<string, any>;
      if (
        typeof filters !== "object" ||
        Array.isArray(filters) ||
        Object.keys(filters).some(
          (k) =>
            ![
              "from",
              "to",
              "status",
              "employee",
              "search",
              "deletionReview",
            ].includes(k),
        )
      )
        throw new ApiError("invalid_request", 400);
      for (const k of ["from", "to"])
        if (filters[k] && !date(filters[k]))
          throw new ApiError("invalid_request", 400);
      if (filters.from && filters.to && filters.from > filters.to)
        throw new ApiError("invalid_request", 400);
      for (const k of ["status", "employee", "search"])
        if (filters[k] !== undefined) text(filters[k], 200);
      if (
        filters.deletionReview !== undefined &&
        typeof filters.deletionReview !== "boolean"
      )
        throw new ApiError("invalid_request", 400);
      const page = await db.list(collection, 10, token);
      const result = await db.transaction(async (tx) => {
        await authorize(tx, claims);
        const policy = await retentionPolicy(tx, config);
        const rows: any[] = [];
        for (const item of page.documents) {
          let raw = item;
          if (!raw) continue;
          if (collection === "archiveMetadata") {
            if (
              !raw.id ||
              (raw.status !== "ARCHIVE_CONFIRMED" && !raw.removedAt)
            )
              continue;
            const report = await tx.get("reports/" + raw.id),
              form = report?.form as any;
            raw = {
              ...raw,
              name: form?.customer || "",
              address: form?.address || "",
            };
          }
          const f = raw.form as any,
            workDate = String(
              f?.date ||
                raw.createdAt ||
                (raw.receipt as any)?.at ||
                raw.removedAt ||
                "",
            ).slice(0, 10);
          const assigned = (raw.assignedTo || []) as string[];
          if (
            (filters.from && workDate < filters.from) ||
            (filters.to && workDate > filters.to) ||
            (filters.status &&
              (filters.status === "active"
                ? !["NEW", "IN_PROGRESS", "RETURNED"].includes(
                    String(raw.status),
                  )
                : raw.status !== filters.status)) ||
            (filters.employee &&
              !assigned.includes(filters.employee) &&
              !(assigned.length === 0 && raw.ownerUid === filters.employee)) ||
            (filters.search &&
              !canonical(raw)
                .toLocaleLowerCase("fi")
                .includes(filters.search.toLocaleLowerCase("fi")))
          )
            continue;
          if (collection !== "reports") {
            rows.push(raw);
            continue;
          }
          const loaded = await readWork(tx, String(raw.id));
          if (!loaded.report) {
            rows.push({ id: raw.id, unavailable: true });
            continue;
          }
          const r = loaded.report;
          if (
            r.status === "APPROVED" &&
            (await makePortable(r)).integrity.value !==
              loaded.finance?.snapshotHash
          )
            throw new ApiError("archive_integrity", 409);
          const archive = await tx.get("archiveMetadata/" + r.id);
          if (
            filters.deletionReview &&
            (r.status !== "APPROVED" || archive?.status !== "ARCHIVE_CONFIRMED")
          )
            continue;
          rows.push({
            report: publicReport(r),
            archive,
            retention: retentionWindow(r.approval?.at, policy.retentionDays),
            summary: summaryRow(
              r,
              r.billing,
              loaded.finance?.purchaseSnapshot as any,
            ),
          });
        }
        return rows;
      }, 1);
      return {
        rows: result,
        nextPageToken: page.nextPageToken || "",
        scanned: page.documents.length,
      };
    }
    if (action === "policy")
      return db.transaction(async (tx) => {
        await authorize(tx, claims);
        return { settings: await tx.get("settings/retention") };
      }, 1);
    if (action === "setPolicy") {
      if (
        !Number.isInteger(input.minimumDays) ||
        Number(input.minimumDays) < 0 ||
        Number(input.minimumDays) > 36500 ||
        !date(input.effectiveFrom) ||
        String(input.effectiveFrom) < helsinkiToday() ||
        input.reviewed !== true
      )
        throw new ApiError("invalid_request", 400);
      const reason = text(input.reason, 500, true);
      if (reason.length < 10) throw new ApiError("invalid_request", 400);
      return db.transaction(async (tx) => {
        await authorize(tx, claims);
        const prev = await tx.get("settings/retention");
        if ((prev?.revision || 0) !== input.revision)
          throw new ApiError("revision_conflict", 409);
        const policies = (prev?.policies || []) as unknown as RetentionPolicy[];
        if (policies.length >= 20)
          throw new ApiError("policy_history_limit", 409);
        const revision = Number(prev?.revision || 0) + 1,
          version = "policy-" + revision + "-" + crypto.randomUUID();
        const policy = {
          version,
          minimumDays: Number(input.minimumDays),
          effectiveFrom: String(input.effectiveFrom),
          reason,
          byUid: claims.uid,
          at: new Date().toISOString(),
        };
        if (policies.some((p) => p.effectiveFrom > policy.effectiveFrom))
          throw new ApiError("invalid_request", 400);
        const settings = { revision, policies: [...policies, policy] };
        tx.put("settings/retention", asDoc(settings));
        tx.put(
          "auditEvents/" + version,
          asDoc({ action: "retention_policy", ...policy }),
        );
        return { settings };
      }, 2);
    }
    if (action === "quoteImport") {
      const reference = text(input.reference, 30, true);
      if (!/^KHT-\d{8}-[A-F0-9]{12}$/.test(reference))
        throw new ApiError("invalid_request", 400);
      const data = {
        reference,
        name: text(input.name, 160, true),
        email: text(input.email || "", 160),
        phone: text(input.phone || "", 80),
        address: text(input.address || "", 500),
        description: text(input.description, 6000, true, true),
        schedule: text(input.schedule || "", 500),
      };
      if (!data.email && !data.phone)
        throw new ApiError("invalid_request", 400);
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        throw new ApiError("invalid_request", 400);
      const fingerprint = await sha256(canonical(data));
      return db.transaction(async (tx) => {
        await authorize(tx, claims);
        const path = "quotationRequests/" + reference,
          old = await tx.get(path);
        if (old) {
          if (old.fingerprint !== fingerprint)
            throw new ApiError("quotation_conflict", 409);
          return { quotation: old };
        }
        const now = new Date().toISOString();
        const quote = {
          ...data,
          id: reference,
          status: "NEW",
          source: "admin-import",
          fingerprint,
          createdAt: now,
          createdBy: claims.uid,
        };
        tx.put(path, asDoc(quote));
        tx.put(
          "auditEvents/quote-" + reference,
          asDoc({
            action: "quotation_import",
            targetId: reference,
            actorUid: claims.uid,
            createdAt: now,
          }),
        );
        return { quotation: quote };
      }, 2);
    }
    if (action === "quoteDecision") {
      const reference = text(input.reference, 30, true);
      if (
        !/^KHT-\d{8}-[A-F0-9]{12}$/.test(reference) ||
        !["accept", "reject"].includes(String(input.decision))
      )
        throw new ApiError("invalid_request", 400);
      const reason = text(input.reason || "", 500, input.decision === "reject");
      return db.transaction(async (tx) => {
        await authorize(tx, claims);
        const path = "quotationRequests/" + reference,
          quote = await tx.get(path);
        if (!quote) throw new ApiError("not_found", 404);
        if (quote.status !== "NEW") {
          if (
            quote.status ===
            (input.decision === "accept" ? "ACCEPTED" : "REJECTED")
          )
            return { quotation: quote };
          throw new ApiError("revision_conflict", 409);
        }
        const now = new Date().toISOString();
        let reportId = "";
        if (input.decision === "accept") {
          reportId = String(input.targetId);
          if (!idPattern.test(reportId))
            throw new ApiError("invalid_request", 400);
          if (
            (await tx.get("reports/" + reportId)) ||
            (await tx.get("archiveMetadata/" + reportId))
          )
            throw new ApiError("revision_conflict", 409);
          const form = {
            ...emptyReport().form,
            customer: String(quote.name),
            address: String(quote.address),
            description: String(quote.description),
            date: helsinkiToday(),
            reference,
            notes: [
              quote.email ? "Sähköposti: " + quote.email : "",
              quote.phone ? "Puhelin: " + quote.phone : "",
              quote.schedule
                ? "Toivottu ajankohta (ei vahvistettu): " + quote.schedule
                : "",
            ]
              .filter(Boolean)
              .join("\n"),
            worker: "",
          };
          const report = {
            id: reportId,
            schemaVersion: 3,
            ownerUid: claims.uid,
            assignedTo: [],
            title: String(quote.name),
            status: "NEW",
            revision: 1,
            form,
            operations: emptyOperations(),
            signature: null,
            schedule: "",
            quotationReference: reference,
            workOrderId: reportId,
            comment: "",
            createdAt: now,
            updatedAt: now,
            updatedBy: claims.uid,
            lastMutation: crypto.randomUUID(),
          };
          tx.put("reports/" + reportId, asDoc(report));
          tx.put(
            "reportFinances/" + reportId,
            asDoc({
              id: reportId,
              billing: emptyBilling(),
              revision: 1,
              lastMutation: report.lastMutation,
              fingerprint: "",
            }),
          );
          tx.put(
            "workOrders/" + reportId,
            asDoc({
              id: reportId,
              schemaVersion: 3,
              reportId,
              ownerUid: claims.uid,
              assignedTo: [],
              title: report.title,
              address: form.address,
              workDate: form.date,
              schedule: report.schedule,
              quotationReference: reference,
              status: "NEW",
              createdAt: now,
              updatedAt: now,
            }),
          );
        }
        const next = {
          ...quote,
          status: input.decision === "accept" ? "ACCEPTED" : "REJECTED",
          reason,
          reportId,
          decidedAt: now,
          decidedBy: claims.uid,
        };
        tx.put(path, asDoc(next));
        tx.put(
          "auditEvents/quote-decision-" + reference,
          asDoc({
            action: "quotation_" + input.decision,
            targetId: reference,
            reportId,
            actorUid: claims.uid,
            reason,
            createdAt: now,
          }),
        );
        return { quotation: next };
      }, 2);
    }
    const id = String(input.id);
    if (!idPattern.test(id)) throw new ApiError("invalid_request", 400);
    return db.transaction(async (tx) => {
      await authorize(tx, claims);
      const loaded = await readWork(tx, id),
        r = loaded.report;
      if (!r) throw new ApiError("not_found", 404);
      if (action === "restore") {
        const target = String(input.targetId);
        if (
          !idPattern.test(target) ||
          target === id ||
          !/^[-a-f0-9]{36}$/.test(String(input.requestId))
        )
          throw new ApiError("invalid_request", 400);
        const existing = await tx.get("reports/" + target);
        if (
          existing?.lastMutation === input.requestId &&
          (existing.source as any)?.reportId === id
        )
          return { id: target };
        if (
          r.status !== "CANCELLED" ||
          r.revision !== input.revision ||
          existing ||
          (await tx.get("archiveMetadata/" + target))
        )
          throw new ApiError("revision_conflict", 409);
        const now = new Date().toISOString();
        const copy = {
          ...r,
          id: target,
          workOrderId: target,
          ownerUid: claims.uid,
          status: "NEW" as const,
          revision: 1,
          approval: undefined,
          signature: null,
          comment: "",
          source: { reportId: id, revision: r.revision },
          createdAt: now,
          updatedAt: now,
          updatedBy: claims.uid,
          lastMutation: String(input.requestId),
        };
        tx.put("reports/" + target, asDoc(publicReport(copy)));
        tx.put(
          "reportFinances/" + target,
          asDoc({
            id: target,
            billing: r.billing,
            revision: 1,
            lastMutation: input.requestId,
            fingerprint: "",
          }),
        );
        tx.put(
          "workOrders/" + target,
          asDoc({
            id: target,
            schemaVersion: 3,
            reportId: target,
            ownerUid: claims.uid,
            assignedTo: copy.assignedTo,
            title: copy.title,
            address: copy.form.address,
            workDate: copy.form.date,
            schedule: copy.schedule,
            quotationReference: copy.quotationReference,
            status: "NEW",
            createdAt: now,
            updatedAt: now,
          }),
        );
        tx.put(
          "auditEvents/restore-" + target,
          asDoc({
            action: "cancelled_copy",
            sourceId: id,
            sourceRevision: r.revision,
            targetId: target,
            actorUid: claims.uid,
            createdAt: now,
          }),
        );
        return { id: target };
      }
      if (action === "remove") {
        const reason = text(input.reason, 500, true);
        if (
          r.status === "APPROVED" ||
          r.approval ||
          r.status === "PENDING_REVIEW" ||
          r.revision !== input.revision ||
          input.confirmationId !== id ||
          input.legalChecked !== true ||
          reason.length < 10 ||
          (await tx.get("archiveMetadata/" + id))
        )
          throw new ApiError("archive_delete_blocked", 409);
        if (!tx.delete) throw new ApiError("delete_not_supported", 503);
        const now = new Date().toISOString();
        tx.delete("reports/" + id);
        tx.delete("reportFinances/" + id);
        tx.delete("workOrders/" + id);
        // Tombstone keeps references from quotations/copies/audit resolvable and prevents ID reuse.
        tx.put(
          "archiveMetadata/" + id,
          asDoc({
            id,
            revision: r.revision,
            status: "WORK_REMOVED",
            previousStatus: r.status,
            removedAt: now,
            removedBy: claims.uid,
            ownerUid: r.ownerUid,
            assignedTo: r.assignedTo,
            source: r.source || null,
          }),
        );
        tx.put(
          "auditEvents/work-remove-" + id,
          asDoc({
            action: "unapproved_removed",
            targetId: id,
            revision: r.revision,
            actorUid: claims.uid,
            reason,
            legalChecked: true,
            createdAt: now,
          }),
        );
        return { removed: true };
      }
      throw new ApiError("invalid_request", 400);
    }, 2);
  };
}
