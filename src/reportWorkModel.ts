import type { ReportForm } from "./reportModel";

export type WorkStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "RETURNED"
  | "APPROVED"
  | "CANCELLED";
export const statusLabel: Record<WorkStatus, string> = {
  NEW: "Uusi",
  IN_PROGRESS: "Työn alla",
  PENDING_REVIEW: "Tarkastettavana",
  RETURNED: "Palautettu korjattavaksi",
  APPROVED: "Hyväksytty",
  CANCELLED: "Peruttu",
};
export type Billing = {
  hourRateCents: number;
  travelKm: number;
  travelRateCents: number;
  otherCents: number;
  otherDescription: string;
  vatBasisPoints: number;
};
export const emptyBilling = (): Billing => ({
  hourRateCents: 0,
  travelKm: 0,
  travelRateCents: 0,
  otherCents: 0,
  otherDescription: "",
  vatBasisPoints: 0,
});
export type CatalogMaterial = {
  id: string;
  name: string;
  code: string;
  unit: string;
  sellingCents: number;
  active: boolean;
  revision: number;
};
export type WorkReport = {
  id: string;
  schemaVersion: 2;
  ownerUid: string;
  assignedTo: string[];
  title: string;
  status: WorkStatus;
  revision: number;
  form: ReportForm;
  billing: Billing;
  schedule: string;
  quotationReference: string;
  workOrderId: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  lastMutation: string;
};
export function decimal(value: string) {
  return Number(value.replace(",", ".")) || 0;
}
export function billingTotals(form: ReportForm, billing: Billing) {
  const materials = form.materials.map((row) =>
    Math.round(decimal(row.quantity) * (row.unitPriceCents || 0)),
  );
  const work = Math.round(decimal(form.hours) * billing.hourRateCents);
  const travel = Math.round(billing.travelKm * billing.travelRateCents);
  const materialsTotal = materials.reduce((sum, value) => sum + value, 0);
  const net = work + travel + materialsTotal + billing.otherCents;
  const vat = Math.round((net * billing.vatBasisPoints) / 10000);
  return {
    materials,
    materialsTotal,
    work,
    travel,
    other: billing.otherCents,
    net,
    vat,
    gross: net + vat,
  };
}
export const money = (cents: number) =>
  (cents / 100).toLocaleString("fi-FI", { style: "currency", currency: "EUR" });
