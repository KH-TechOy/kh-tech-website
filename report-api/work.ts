import {
  ApiError,
  usable,
  type Claims,
  type Database,
  type Document,
} from "./types";
import {
  emptyReport,
  reportErrors,
  type Material,
  type ReportForm,
} from "../src/reportModel";
import {
  emptyBilling,
  type Billing,
  type WorkReport,
  type WorkStatus,
} from "../src/reportWorkModel";

const idPattern = /^KHT-\d{8}-[A-F0-9]{6}$/;
const uuidPattern = /^[a-f0-9-]{36}$/;
const catalogPattern = /^[A-Za-z0-9_-]{1,128}$/;
function fail(code = "invalid_request", status = 400): never {
  throw new ApiError(code, status);
}
function text(value: unknown, max: number, required = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim()) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    fail();
  return value;
}
function number(value: unknown, max = 100000000): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    fail();
  return value;
}
function cents(value: unknown) {
  const n = number(value);
  if (!Number.isSafeInteger(n)) fail();
  return n;
}
function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  return value as Record<string, any>;
}
function keys(value: object, allowed: string[]) {
  if (Object.keys(value).some((k) => !allowed.includes(k))) fail();
}
const asDocument = (value: unknown) => value as Document;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
function authorized(report: WorkReport, uid: string, admin: boolean) {
  if (!admin && report.ownerUid !== uid && !report.assignedTo.includes(uid))
    fail("report_forbidden", 403);
}
function editable(status: WorkStatus) {
  if (!["NEW", "IN_PROGRESS", "RETURNED"].includes(status))
    fail("report_locked", 409);
}
function billing(value: unknown): Billing {
  const b = object(value);
  keys(b, Object.keys(emptyBilling()));
  return {
    hourRateCents: cents(b.hourRateCents),
    travelKm: number(b.travelKm, 100000),
    travelRateCents: cents(b.travelRateCents),
    otherCents: cents(b.otherCents),
    otherDescription: text(b.otherDescription, 500),
    vatBasisPoints:
      cents(b.vatBasisPoints) <= 10000 ? b.vatBasisPoints : fail(),
  };
}
function form(value: unknown): ReportForm {
  const source = object(value),
    template = emptyReport().form;
  keys(source, Object.keys(template));
  for (const key of Object.keys(template)) {
    if (key !== "materials")
      (template as any)[key] = text(
        source[key],
        ["description", "tasks", "notes", "followup"].includes(key)
          ? 6000
          : key === "worker"
            ? 1500
            : 500,
      );
  }
  if (!Array.isArray(source.materials) || source.materials.length > 50) fail();
  template.materials = source.materials.map((value: unknown) => {
    const row = object(value);
    keys(row, [
      "name",
      "quantity",
      "unit",
      "rowId",
      "catalogId",
      "unitPriceCents",
    ]);
    const quantity = text(row.quantity, 15);
    if (quantity && !/^\d{1,5}(?:[.,]\d{1,3})?$/.test(quantity)) fail();
    return {
      name: text(row.name, 120),
      quantity,
      unit: text(row.unit, 20),
      ...(row.rowId !== undefined ? { rowId: text(row.rowId, 36, true) } : {}),
      ...(row.catalogId !== undefined
        ? { catalogId: text(row.catalogId, 128, true) }
        : {}),
      ...(row.unitPriceCents !== undefined
        ? { unitPriceCents: cents(row.unitPriceCents) }
        : {}),
    };
  });
  const rowIds = template.materials.flatMap((r) => (r.rowId ? [r.rowId] : []));
  if (
    new Set(rowIds).size !== rowIds.length ||
    rowIds.some((id) => !uuidPattern.test(id))
  )
    fail();
  if (template.hours && !/^\d{1,5}(?:[.,]\d{1,2})?$/.test(template.hours))
    fail();
  if (new TextEncoder().encode(JSON.stringify(template)).length > 60000) fail();
  return template;
}
async function priceRows(
  tx: Tx,
  rows: Material[],
  previous: Material[],
  admin: boolean,
) {
  const catalog = new Map<string, Promise<Document | null>>();
  return Promise.all(
    rows.map(async (row) => {
      const old =
        row.rowId &&
        previous.find(
          (p) =>
            p.rowId === row.rowId &&
            p.catalogId === row.catalogId &&
            p.name === row.name &&
            p.unit === row.unit,
        );
      if (old) {
        if (!admin && row.unitPriceCents !== old.unitPriceCents)
          fail("billing_protected", 403);
        return {
          ...row,
          rowId: row.rowId || crypto.randomUUID(),
          unitPriceCents: admin
            ? row.unitPriceCents || 0
            : old.unitPriceCents || 0,
        };
      }
      if (row.catalogId) {
        if (!catalogPattern.test(row.catalogId) || !row.rowId) fail();
        if (!catalog.has(row.catalogId)) {
          if (catalog.size >= 20) fail("too_many_catalog_items", 400);
          catalog.set(
            row.catalogId,
            tx.get("materialCatalog/" + row.catalogId),
          );
        }
        const item = await catalog.get(row.catalogId)!;
        if (
          !item ||
          !item.active ||
          item.name !== row.name ||
          item.unit !== row.unit
        )
          fail("material_changed", 409);
        const sellingCents = Number.isSafeInteger(item.sellingCents)
          ? Number(item.sellingCents)
          : 0;
        return {
          ...row,
          rowId: row.rowId || crypto.randomUUID(),
          unitPriceCents: admin
            ? (row.unitPriceCents ?? sellingCents)
            : sellingCents,
        };
      }
      if (!admin && row.unitPriceCents) fail("billing_protected", 403);
      return {
        ...row,
        rowId: row.rowId || crypto.randomUUID(),
        unitPriceCents: admin ? row.unitPriceCents || 0 : 0,
      };
    }),
  );
}
export function workService(db: Database) {
  return async (claims: Claims, input: Document) => {
    const action = text(input.action, 20, true),
      id = text(input.id, 128, true);
    if (!(action === "material" ? catalogPattern : idPattern).test(id)) fail();
    const allowed: Record<string, string[]> = {
      load: ["action", "id"],
      save: ["action", "id", "revision", "requestId", "form", "billing"],
      createOrder: [
        "action",
        "id",
        "requestId",
        "customer",
        "address",
        "description",
        "schedule",
        "quotationReference",
        "assignedTo",
      ],
      order: [
        "action",
        "id",
        "requestId",
        "revision",
        "customer",
        "address",
        "description",
        "schedule",
        "quotationReference",
        "assignedTo",
      ],
      transition: [
        "action",
        "id",
        "requestId",
        "revision",
        "status",
        "comment",
      ],
      material: [
        "action",
        "id",
        "requestId",
        "revision",
        "name",
        "code",
        "unit",
        "sellingCents",
        "purchaseCents",
        "active",
      ],
    };
    if (!allowed[action]) fail();
    keys(input, allowed[action]);
    if (
      action !== "load" &&
      (typeof input.requestId !== "string" ||
        !uuidPattern.test(input.requestId))
    )
      fail();
    const fingerprint =
      action === "load"
        ? ""
        : Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(JSON.stringify(input)),
              ),
            ),
          )
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("");
    const rawRows =
      input.form && typeof input.form === "object" && !Array.isArray(input.form)
        ? input.form.materials
        : null;
    const catalogReads = Array.isArray(rawRows)
      ? Math.min(
          20,
          new Set(
            rawRows
              .slice(0, 50)
              .flatMap((row) =>
                row &&
                typeof row === "object" &&
                !Array.isArray(row) &&
                typeof row.catalogId === "string"
                  ? [row.catalogId]
                  : [],
              ),
          ).size,
        )
      : 0;
    const assigneeReads = Array.isArray(input.assignedTo)
      ? Math.min(10, input.assignedTo.length)
      : 0;
    // Reserve headroom for authentication, OAuth/JWK lookup and rate limiting.
    // Large catalog batches use one attempt; ordinary text writes can back off and retry.
    const maxAttempts = Math.max(
      1,
      Math.min(
        6,
        Math.floor(
          30 /
            (5 +
              catalogReads +
              assigneeReads +
              (action === "material" ? 1 : 0)),
        ),
      ),
    );
    return db
      .transaction(async (tx) => {
        const actor = await tx.get("users/" + claims.uid);
        if (!usable(actor, claims)) fail("access_disabled", 403);
        const admin = actor.role === "admin",
          now = new Date().toISOString();
        if (["createOrder", "order", "material"].includes(action) && !admin)
          fail("admin_required", 403);
        if (action === "material") {
          const path = "materialCatalog/" + id;
          const [existing, privateCosts] = await Promise.all([
            tx.get(path),
            tx.get("materialCosts/" + id),
          ]);
          if (existing?.lastMutation === input.requestId) {
            if (
              privateCosts?.fingerprint !== fingerprint ||
              privateCosts.lastMutation !== input.requestId
            )
              fail("request_conflict", 409);
            return { completed: true };
          }
          if (input.revision !== (existing?.revision || 0))
            fail("revision_conflict", 409);
          const name = text(input.name, 120, true).trim(),
            code = text(input.code, 40),
            unit = text(input.unit, 20, true).trim();
          if (typeof input.active !== "boolean") fail();
          const sellingCents = cents(input.sellingCents),
            purchaseCents =
              input.purchaseCents === null ? null : cents(input.purchaseCents);
          tx.put(path, {
            id,
            name,
            code,
            unit,
            sellingCents,
            active: input.active,
            revision: Number(existing?.revision || 0) + 1,
            updatedAt: now,
            updatedBy: claims.uid,
            lastMutation: input.requestId,
          });
          // A hash of a low-entropy private price is itself private (it can be guessed).
          tx.put("materialCosts/" + id, {
            id,
            purchaseCents,
            updatedAt: now,
            lastMutation: input.requestId,
            fingerprint,
          });
          tx.put(
            "auditEvents/material-" +
              id +
              "-" +
              (Number(existing?.revision || 0) + 1),
            {
              action: "material",
              targetId: id,
              actorUid: claims.uid,
              createdAt: now,
            },
          );
          return { completed: true };
        }
        const path = "reports/" + id,
          raw = await tx.get(path);
        let previous = raw as unknown as WorkReport | null;
        if (previous) authorized(previous, claims.uid, admin);
        if (action === "load")
          return {
            report: previous?.schemaVersion === 2 ? previous : null,
            legacy: !!previous && previous.schemaVersion !== 2,
          };
        if (raw?.lastMutation === input.requestId) {
          if (raw.fingerprint !== fingerprint) fail("request_conflict", 409);
          return { report: previous };
        }
        if (previous && previous.schemaVersion !== 2) {
          if (action !== "save" || !["draft"].includes(String(previous.status)))
            fail("legacy_locked", 409);
          previous = null; // Migrate editable A metadata only; retain identity/assignments below.
        }
        if (
          action !== "createOrder" &&
          input.revision !== (previous?.revision || 0)
        )
          fail("revision_conflict", 409);
        if (!previous && !["save", "createOrder"].includes(action))
          fail("not_found", 404);
        if (action === "createOrder" && raw) fail("revision_conflict", 409);
        const next: WorkReport = previous
          ? structuredClone(previous)
          : {
              id,
              schemaVersion: 2,
              ownerUid: raw ? String(raw.ownerUid) : claims.uid,
              assignedTo: raw ? (raw.assignedTo as string[]) : [],
              title: "",
              status: "NEW",
              revision: 0,
              form: emptyReport().form,
              billing: emptyBilling(),
              schedule: "",
              quotationReference: "",
              workOrderId: "",
              comment: "",
              createdAt: raw ? String(raw.createdAt) : now,
              updatedAt: now,
              updatedBy: claims.uid,
              lastMutation: "",
            };
        let audit: Document | undefined;
        if (action === "createOrder" || action === "order") {
          editable(next.status);
          if (
            !Array.isArray(input.assignedTo) ||
            !input.assignedTo.length ||
            input.assignedTo.length > 10 ||
            new Set(input.assignedTo).size !== input.assignedTo.length
          )
            fail();
          const names: string[] = [];
          for (const uid of input.assignedTo) {
            if (typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid))
              fail();
            const assigned = await tx.get("users/" + uid);
            if (!assigned || !assigned.active) fail("invalid_assignee", 409);
            names.push(String(assigned.displayName));
          }
          next.assignedTo = input.assignedTo as string[];
          next.form.customer = text(input.customer, 500, true);
          next.form.address = text(input.address, 500, true);
          next.form.description = text(input.description, 6000, true);
          next.schedule = text(input.schedule, 16);
          if (
            next.schedule &&
            !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(next.schedule)
          )
            fail();
          next.quotationReference = text(input.quotationReference, 40);
          if (
            next.quotationReference &&
            !/^KHT-\d{8}-[A-F0-9]{12}$/.test(next.quotationReference)
          )
            fail();
          next.form.reference = next.quotationReference;
          if (action === "createOrder") {
            next.form.worker = names.join(", ");
            if (next.schedule) next.form.date = next.schedule.slice(0, 10);
          }
          next.workOrderId = id;
          audit = {
            action,
            assignedBefore: previous?.assignedTo || [],
            assignedAfter: next.assignedTo,
            schedule: next.schedule,
          };
        } else if (action === "save") {
          if (!admin || next.status !== "PENDING_REVIEW") editable(next.status);
          const parsed = form(input.form);
          parsed.materials = await priceRows(
            tx,
            parsed.materials,
            previous?.form.materials || [],
            admin,
          );
          if (input.billing !== undefined) {
            const b = billing(input.billing);
            if (!admin && JSON.stringify(b) !== JSON.stringify(next.billing))
              fail("billing_protected", 403);
            if (admin) next.billing = b;
          }
          next.form = parsed;
          if (next.status === "NEW") {
            next.status = "IN_PROGRESS";
            audit = { action: "start", before: "NEW", after: next.status };
          }
        } else if (action === "transition") {
          const target = text(input.status, 20) as WorkStatus;
          if (
            ![
              "IN_PROGRESS",
              "PENDING_REVIEW",
              "RETURNED",
              "CANCELLED",
            ].includes(target)
          )
            fail("invalid_transition", 409);
          const allowedTransition =
            target === "IN_PROGRESS"
              ? next.status === "NEW"
              : target === "PENDING_REVIEW"
                ? ["NEW", "IN_PROGRESS", "RETURNED"].includes(next.status)
                : admin &&
                  (target === "RETURNED"
                    ? next.status === "PENDING_REVIEW"
                    : [
                        "NEW",
                        "IN_PROGRESS",
                        "RETURNED",
                        "PENDING_REVIEW",
                      ].includes(next.status));
          if (!allowedTransition) fail("invalid_transition", 409);
          if (
            target === "PENDING_REVIEW" &&
            Object.keys(reportErrors(next.form)).length
          )
            fail("report_incomplete", 400);
          const comment = text(
            input.comment || "",
            2000,
            target === "RETURNED" || target === "CANCELLED",
          );
          if (["RETURNED", "CANCELLED"].includes(target))
            next.comment = comment;
          else if (comment) fail();
          next.status = target;
          audit = {
            action: "transition",
            before: previous!.status,
            after: target,
            comment: next.comment,
          };
        }
        next.title = next.form.customer || "Työraportti";
        next.revision++;
        next.updatedAt = now;
        next.updatedBy = claims.uid;
        next.lastMutation = String(input.requestId);
        tx.put(path, { ...asDocument(next), fingerprint });
        // Lists contain small metadata, not report bodies. All revisions are guarded by the report transaction.
        if (
          !previous ||
          previous.status !== next.status ||
          previous.title !== next.title ||
          previous.form.address !== next.form.address ||
          previous.form.date !== next.form.date ||
          previous.schedule !== next.schedule ||
          JSON.stringify(previous.assignedTo) !==
            JSON.stringify(next.assignedTo)
        ) {
          tx.put("workOrders/" + id, {
            schemaVersion: 2,
            id,
            reportId: id,
            ownerUid: next.ownerUid,
            assignedTo: next.assignedTo,
            title: next.title,
            address: next.form.address,
            workDate: next.form.date,
            schedule: next.schedule,
            quotationReference: next.quotationReference,
            status: next.status,
            createdAt: next.createdAt,
            updatedAt: now,
          });
        }
        if (audit)
          tx.put("auditEvents/work-" + id + "-" + next.revision, {
            ...audit,
            actorUid: claims.uid,
            targetId: id,
            revision: next.revision,
            createdAt: now,
          });
        return { report: next };
      }, maxAttempts)
      .catch((error) => {
        // A fresh client request handles contention; don't multiply material reads past Free subrequest limits.
        if (error instanceof ApiError && error.code === "retry_transaction")
          fail("revision_conflict", 409);
        throw error;
      });
  };
}
