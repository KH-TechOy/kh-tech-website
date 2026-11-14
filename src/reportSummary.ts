import {
  billingTotals,
  decimal,
  scaledAmount,
  type Billing,
  type WorkReport,
} from "./reportWorkModel";
export type SummaryRow = {
  id: string;
  customer: string;
  workDate: string;
  status: string;
  assignedTo: string[];
  hours: number;
  km: number;
  totals: ReturnType<typeof billingTotals>;
  vatBasisPoints: number;
  materials: {
    name: string;
    unit: string;
    quantity: number;
    salesCents: number;
  }[];
  purchaseCents: number | null;
  missingCosts: number;
  finalized: boolean;
  missing: string[];
};
export function summaryRow(
  r: WorkReport,
  billing: Billing,
  purchase?: { materialsCents: number; missingRows: number },
): SummaryRow {
  return {
    id: r.id,
    customer: r.form.customer,
    workDate: r.form.date,
    status: r.status,
    assignedTo: r.assignedTo.length ? [...new Set(r.assignedTo)] : [r.ownerUid],
    hours: decimal(r.form.hours),
    km: r.operations?.travelKm ?? billing.travelKm,
    totals: billingTotals(r.form, billing),
    vatBasisPoints: billing.vatBasisPoints,
    materials: r.form.materials
      .filter((m) => m.name)
      .map((m) => ({
        name: m.name,
        unit: m.unit,
        quantity: decimal(m.quantity),
        salesCents: scaledAmount(m.quantity, m.unitPriceCents || 0),
      })),
    purchaseCents: purchase?.materialsCents ?? null,
    missingCosts:
      purchase?.missingRows ?? r.form.materials.filter((m) => m.name).length,
    finalized: r.status === "APPROVED",
    missing: [
      ...(!r.form.hours ? ["Työtunnit"] : []),
      ...(!r.form.date ? ["Päivämäärä"] : []),
      ...(!r.form.worker ? ["Työntekijä"] : []),
      ...(r.form.materials.some((m) => m.name && m.unitPriceCents === undefined)
        ? ["Materiaalihintoja"]
        : []),
    ],
  };
}
export function summarize(rows: SummaryRow[]) {
  const unique = [...new Map(rows.map((r) => [r.id, r])).values()];
  const totals = {
    count: unique.length,
    hours: 0,
    km: 0,
    work: 0,
    travel: 0,
    materialsTotal: 0,
    other: 0,
    net: 0,
    vat: 0,
    gross: 0,
    purchase: 0,
    missingCosts: 0,
    estimates: 0,
  };
  const vat: Record<string, { net: number; vat: number; gross: number }> =
      Object.create(null),
    employees: Record<string, { count: number; hours: number; km: number }> =
      Object.create(null),
    materials: Record<
      string,
      { name: string; unit: string; quantity: number; salesCents: number }
    > = {};
  for (const r of unique) {
    totals.hours = Math.round((totals.hours + r.hours) * 100) / 100;
    totals.km = Math.round((totals.km + r.km) * 10000) / 10000;
    for (const k of [
      "work",
      "travel",
      "materialsTotal",
      "other",
      "net",
      "vat",
      "gross",
    ] as const)
      totals[k] += r.totals[k];
    totals.purchase += r.purchaseCents || 0;
    totals.missingCosts += r.missingCosts;
    totals.estimates += r.finalized ? 0 : 1;
    const v = (vat[r.vatBasisPoints] ??= { net: 0, vat: 0, gross: 0 });
    v.net += r.totals.net;
    v.vat += r.totals.vat;
    v.gross += r.totals.gross;
    // Shared jobs appear once in company totals. Employee effort is an explicit equal
    // allocation, not an invented measurement of each employee's actual attendance.
    for (const uid of r.assignedTo) {
      const e = (employees[uid] ??= { count: 0, hours: 0, km: 0 });
      e.count++;
      e.hours += r.hours / r.assignedTo.length;
      e.km += r.km / r.assignedTo.length;
    }
    for (const m of r.materials) {
      const key = JSON.stringify([m.name, m.unit]);
      const v = (materials[key] ??= {
        name: m.name,
        unit: m.unit,
        quantity: 0,
        salesCents: 0,
      });
      v.quantity = Math.round((v.quantity + m.quantity) * 1000) / 1000;
      v.salesCents += m.salesCents;
    }
  }
  return {
    overflow: [
      "work",
      "travel",
      "materialsTotal",
      "other",
      "net",
      "vat",
      "gross",
      "purchase",
    ].some((k) => !Number.isSafeInteger(totals[k as keyof typeof totals])),
    totals,
    vat,
    employees,
    materials: Object.values(materials),
    rows: unique,
  };
}
// Excel formula injection protection applies even inside quoted CSV cells.
export const csvCell = (v: unknown) =>
  '"' +
  String(v ?? "")
    .replace(/^[\s]*[=+@-]/, "'$&")
    .replace(/"/g, '""') +
  '"';
export function summaryCsv(rows: SummaryRow[]) {
  const data = summarize(rows);
  if (data.overflow) throw new Error("summary_total_limit");
  const euro = (v: number) => (v / 100).toFixed(2).replace(".", ",");
  const lines: unknown[][] = [
    [
      "Raportti",
      "Asiakas",
      "Päivä",
      "Tila",
      "Tunnit",
      "Km",
      "Työ alv 0",
      "Materiaalit alv 0",
      "Matka alv 0",
      "Muut alv 0",
      "Yhteensä alv 0",
      "ALV %",
      "ALV",
      "Sis. ALV",
      "Ostot (saatavilla)",
      "Puuttuvat ostohinnat",
      "Arvio",
      "Puuttuvat tiedot",
    ],
  ];
  for (const r of data.rows)
    lines.push([
      r.id,
      r.customer,
      r.workDate,
      r.status,
      String(r.hours).replace(".", ","),
      String(r.km).replace(".", ","),
      euro(r.totals.work),
      euro(r.totals.materialsTotal),
      euro(r.totals.travel),
      euro(r.totals.other),
      euro(r.totals.net),
      String(r.vatBasisPoints / 100).replace(".", ","),
      euro(r.totals.vat),
      euro(r.totals.gross),
      r.purchaseCents === null ? "puuttuu" : euro(r.purchaseCents),
      r.missingCosts,
      r.finalized ? "Hyväksytty" : "Alustava",
      r.missing?.join(", ") || "",
    ]);
  lines.push([
    "YHTEENSÄ",
    "",
    "",
    "",
    String(data.totals.hours).replace(".", ","),
    String(data.totals.km).replace(".", ","),
    ...(["work", "materialsTotal", "travel", "other", "net"] as const).map(
      (k) => euro(data.totals[k]),
    ),
    "",
    euro(data.totals.vat),
    euro(data.totals.gross),
    euro(data.totals.purchase),
    data.totals.missingCosts,
  ]);
  return (
    "\ufeff" +
    lines.map((row) => row.map(csvCell).join(";")).join("\r\n") +
    "\r\n"
  );
}
