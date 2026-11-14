import { emptyReport, reportErrors, type ReportForm } from "./reportModel";
import {
  billingTotals,
  emptyBilling,
  emptyOperations,
  type Approval,
  type Billing,
  type Operations,
  type WorkReport,
} from "./reportWorkModel";
import { signatureValid, type ReportSignature } from "./reportSignature";
export const ARCHIVE_MAX_BYTES = 150000;
export type ArchiveStatus =
  | "ARCHIVE_PENDING"
  | "ARCHIVE_SENDING"
  | "ARCHIVE_SENT_UNVERIFIED"
  | "ARCHIVE_CONFIRMED"
  | "ARCHIVE_FAILED"
  | "ARCHIVE_OUTCOME_UNKNOWN";
export const archiveLabel: Record<ArchiveStatus, string> = {
  ARCHIVE_PENDING: "Arkisto odottaa lähetystä",
  ARCHIVE_SENDING: "Arkistoa käsitellään",
  ARCHIVE_SENT_UNVERIFIED: "Hyväksytty lähetykseen – vastaanotto varmistamatta",
  ARCHIVE_CONFIRMED: "Arkiston vastaanotto varmennettu",
  ARCHIVE_FAILED: "Lähetystä ei aloitettu – voidaan uusia",
  ARCHIVE_OUTCOME_UNKNOWN: "Lähetyksen tulos epäselvä – älä lähetä uudelleen",
};
export type PortableReport = {
  format: "KH-Tech Report";
  version: 1;
  report: {
    id: string;
    revision: number;
    quotationReference: string;
    schedule: string;
    form: ReportForm;
    operations: Operations;
    billing: Billing;
    signature: ReportSignature | null;
    approval: Approval;
    comment: string;
    source?: { reportId: string; revision: number };
  };
  totals: ReturnType<typeof billingTotals>;
  integrity: { algorithm: "SHA-256"; value: string };
};
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .filter((k) => (value as any)[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical((value as any)[k]))
      .join(",") +
    "}"
  );
}
export async function sha256(value: string | Uint8Array) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        typeof value === "string" ? new TextEncoder().encode(value) : value,
      ),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
const record = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const only = (v: object, keys: string[]) =>
  Object.keys(v).every((k) => keys.includes(k));
const amount = (v: unknown, max = 100000000) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
export function validOperations(v: unknown): v is Operations {
  return (
    record(v) &&
    only(v, Object.keys(emptyOperations())) &&
    amount(v.travelKm, 100000) &&
    /^\d+(?:\.\d{1,4})?$/.test(String(v.travelKm)) &&
    amount(v.otherCents) &&
    Number.isInteger(v.otherCents) &&
    typeof v.otherDescription === "string" &&
    v.otherDescription.length <= 500
  );
}
export function validBilling(v: unknown): v is Billing {
  return (
    record(v) &&
    only(v, Object.keys(emptyBilling())) &&
    validOperations({
      travelKm: v.travelKm,
      otherCents: v.otherCents,
      otherDescription: v.otherDescription,
    }) &&
    ["hourRateCents", "travelRateCents", "vatBasisPoints"].every(
      (k) =>
        amount(v[k], k === "vatBasisPoints" ? 10000 : 100000000) &&
        Number.isInteger(v[k]),
    )
  );
}
export function validReportForm(v: unknown): v is ReportForm {
  if (!record(v) || !only(v, Object.keys(emptyReport().form))) return false;
  for (const key of Object.keys(emptyReport().form))
    if (
      key !== "materials" &&
      (typeof v[key] !== "string" ||
        v[key].length >
          (["description", "tasks", "notes", "followup"].includes(key)
            ? 6000
            : key === "worker"
              ? 1500
              : 500))
    )
      return false;
  return (
    Array.isArray(v.materials) &&
    v.materials.length <= 50 &&
    v.materials.every(
      (m: unknown) =>
        record(m) &&
        only(m, [
          "name",
          "quantity",
          "unit",
          "catalogId",
          "rowId",
          "unitPriceCents",
        ]) &&
        typeof m.name === "string" &&
        m.name.length <= 120 &&
        typeof m.quantity === "string" &&
        (!m.quantity || /^\d{1,5}(?:[.,]\d{1,3})?$/.test(m.quantity)) &&
        typeof m.unit === "string" &&
        m.unit.length <= 20 &&
        (m.unitPriceCents === undefined ||
          (amount(m.unitPriceCents) && Number.isInteger(m.unitPriceCents))) &&
        (m.rowId === undefined ||
          (typeof m.rowId === "string" && /^[a-f0-9-]{36}$/.test(m.rowId))) &&
        (m.catalogId === undefined ||
          (typeof m.catalogId === "string" &&
            /^[A-Za-z0-9_-]{1,128}$/.test(m.catalogId))),
    )
  );
}
export function approvalProblems(
  report: Pick<WorkReport, "id" | "form" | "signature">,
) {
  const problems = Object.values(reportErrors(report.form)) as string[];
  const s = report.signature;
  if (
    s &&
    (!signatureValid(s) ||
      !s.confirmedAt ||
      s.context.reportId !== report.id ||
      s.context.customer !== report.form.customer ||
      s.context.date !== report.form.date)
  )
    problems.push(
      "Vahvista allekirjoitus nykyiselle asiakkaalle ja päivämäärälle tai poista se nimenomaisesti.",
    );
  return problems;
}
export async function makePortable(
  report: WorkReport,
): Promise<PortableReport> {
  if (
    report.status !== "APPROVED" ||
    !report.approval ||
    !validBilling(report.billing) ||
    approvalProblems(report).length
  )
    throw new Error("approved_snapshot_required");
  const payload = {
    format: "KH-Tech Report" as const,
    version: 1 as const,
    report: {
      id: report.id,
      revision: report.revision,
      quotationReference: report.quotationReference,
      schedule: report.schedule,
      form: report.form,
      operations: report.operations || emptyOperations(),
      billing: report.billing,
      signature: report.signature || null,
      approval: report.approval,
      comment: report.comment,
      ...(report.source ? { source: report.source } : {}),
    },
    totals: billingTotals(report.form, report.billing),
  };
  return {
    ...payload,
    integrity: {
      algorithm: "SHA-256",
      value: await sha256(canonical(payload)),
    },
  };
}
export function validatePortableShape(v: unknown): asserts v is PortableReport {
  if (
    !record(v) ||
    !only(v, ["format", "version", "report", "totals", "integrity"]) ||
    v.format !== "KH-Tech Report" ||
    v.version !== 1 ||
    !record(v.report) ||
    !only(v.report, [
      "id",
      "revision",
      "quotationReference",
      "schedule",
      "form",
      "operations",
      "billing",
      "signature",
      "approval",
      "comment",
      "source",
    ])
  )
    throw new Error("archive_format");
  const r = v.report,
    a = r.approval;
  if (
    !/^KHT-\d{8}-[A-F0-9]{6}$/.test(r.id) ||
    !Number.isSafeInteger(r.revision) ||
    r.revision < 1 ||
    !validReportForm(r.form) ||
    !validOperations(r.operations) ||
    !validBilling(r.billing) ||
    !record(a) ||
    !only(a, ["at", "byName", "revision", "displayAt", "pdfLayout"]) ||
    (a.pdfLayout !== undefined && a.pdfLayout !== 2) ||
    a.revision !== r.revision ||
    typeof a.byName !== "string" ||
    a.byName.length > 120 ||
    typeof a.at !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(a.at) ||
    typeof a.displayAt !== "string" ||
    a.displayAt.length > 40 ||
    typeof r.comment !== "string" ||
    r.comment.length > 2000 ||
    typeof r.schedule !== "string" ||
    r.schedule.length > 16 ||
    typeof r.quotationReference !== "string" ||
    r.quotationReference.length > 40 ||
    (r.signature !== null && !signatureValid(r.signature)) ||
    (r.source &&
      (!record(r.source) ||
        !only(r.source, ["reportId", "revision"]) ||
        !/^KHT-\d{8}-[A-F0-9]{6}$/.test(r.source.reportId) ||
        !Number.isSafeInteger(r.source.revision)))
  )
    throw new Error("archive_format");
  if (
    approvalProblems({ id: r.id, form: r.form, signature: r.signature })
      .length ||
    canonical(v.totals) !== canonical(billingTotals(r.form, r.billing)) ||
    canonical(r.operations) !==
      canonical({
        travelKm: r.billing.travelKm,
        otherCents: r.billing.otherCents,
        otherDescription: r.billing.otherDescription,
      }) ||
    !record(v.integrity) ||
    !only(v.integrity, ["algorithm", "value"]) ||
    v.integrity.algorithm !== "SHA-256" ||
    !/^[a-f0-9]{64}$/.test(v.integrity.value)
  )
    throw new Error("archive_integrity");
}
export async function parsePortable(text: string) {
  if (new TextEncoder().encode(text).length > ARCHIVE_MAX_BYTES)
    throw new Error("archive_too_large");
  const data: unknown = JSON.parse(text);
  validatePortableShape(data);
  const { integrity, ...payload } = data;
  if ((await sha256(canonical(payload))) !== integrity.value)
    throw new Error("archive_integrity");
  return data;
}
export const portableText = (value: PortableReport) => canonical(value) + "\n";
