export type ReportSignature = {
  version: 1;
  strokes: { points: number[] }[];
  confirmedAt: string;
  recordedAt?: string;
  context: { reportId: string; customer: string; date: string };
};
export const SIGNATURE_POINTS = 1024;
export function signatureValid(value: unknown): value is ReportSignature {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as ReportSignature;
  if (
    Object.keys(s).some(
      (k) =>
        ![
          "version",
          "strokes",
          "confirmedAt",
          "recordedAt",
          "context",
        ].includes(k),
    ) ||
    s.version !== 1 ||
    !Array.isArray(s.strokes) ||
    s.strokes.length > 40
  )
    return false;
  let points = 0;
  for (const item of s.strokes) {
    if (!item || Object.keys(item).some((k) => k !== "points")) return false;
    const stroke = item.points;
    if (
      !Array.isArray(stroke) ||
      stroke.length < 2 ||
      stroke.length % 2 ||
      stroke.some((n) => !Number.isInteger(n) || n < 0 || n > 10000)
    )
      return false;
    points += stroke.length / 2;
  }
  const c = s.context;
  return (
    points <= SIGNATURE_POINTS &&
    typeof s.confirmedAt === "string" &&
    (!s.confirmedAt ||
      (/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s.confirmedAt) &&
        !!points)) &&
    (s.recordedAt === undefined ||
      (typeof s.recordedAt === "string" &&
        /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s.recordedAt))) &&
    !!c &&
    Object.keys(c).every((k) => ["reportId", "customer", "date"].includes(k)) &&
    /^KHT-\d{8}-[A-F0-9]{6}$/.test(c.reportId) &&
    typeof c.customer === "string" &&
    c.customer.length <= 500 &&
    typeof c.date === "string" &&
    c.date.length <= 10
  );
}
export function signaturePath(stroke: number[]) {
  if (!stroke.length) return "";
  let path = `M${stroke[0]} ${stroke[1]}`;
  for (let i = 2; i < stroke.length; i += 2) {
    const nx =
        i + 2 < stroke.length ? (stroke[i] + stroke[i + 2]) / 2 : stroke[i],
      ny =
        i + 3 < stroke.length
          ? (stroke[i + 1] + stroke[i + 3]) / 2
          : stroke[i + 1];
    path += ` Q${stroke[i]} ${stroke[i + 1]} ${nx} ${ny}`;
  }
  return stroke.length === 2 ? path + ` l1 1` : path;
}
