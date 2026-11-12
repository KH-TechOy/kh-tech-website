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
export type Operations = Pick<Billing, 'travelKm' | 'otherCents' | 'otherDescription'>;
export const emptyOperations = (): Operations => ({ travelKm: 0, otherCents: 0, otherDescription: '' });
export type Approval = { at: string; byName: string; revision: number; displayAt: string };
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
  schemaVersion: 2 | 3;
  ownerUid: string;
  assignedTo: string[];
  title: string;
  status: WorkStatus;
  revision: number;
  form: ReportForm;
  billing?: Billing;
  operations?: Operations;
  signature?: import('./reportSignature').ReportSignature | null;
  approval?: Approval;
  source?: { reportId: string; revision: number };
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
// Exact decimal multiplication: avoid binary half-cent rounding in billing snapshots.
export function scaledAmount(value: string, rate: number) {
  const [whole, fraction = ''] = String(value).replace(',', '.').split('.');
  if (!/^\d*$/.test(whole) || !/^\d{0,4}$/.test(fraction)) return 0;
  const divisor = 10n ** BigInt(fraction.length), units = BigInt(whole || '0') * divisor + BigInt(fraction || '0');
  return Number((units * BigInt(rate) + divisor / 2n) / divisor);
}
export function billingTotals(form: ReportForm, billing: Billing) {
  const materials = form.materials.map((row) =>
    scaledAmount(row.quantity, row.unitPriceCents || 0),
  );
  const work = scaledAmount(form.hours, billing.hourRateCents);
  const travel = scaledAmount(String(billing.travelKm), billing.travelRateCents);
  const materialsTotal = materials.reduce((sum, value) => sum + value, 0);
  const net = work + travel + materialsTotal + billing.otherCents;
  const vat = Number((BigInt(net) * BigInt(billing.vatBasisPoints) + 5000n) / 10000n);
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
export const money = (cents: number) => {
  const value = Math.abs(Math.round(cents));
  return (cents < 0 ? '-' : '') + String(Math.floor(value / 100)).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0') + ',' + String(value % 100).padStart(2,'0') + '\u00a0€';
};
