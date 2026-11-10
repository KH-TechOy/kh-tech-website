import { createReportId } from "./utils";
export type Material = { name: string; quantity: string; unit: string };
export type ReportForm = {
  customer: string;
  address: string;
  city: string;
  reference: string;
  date: string;
  worker: string;
  start: string;
  end: string;
  service: string;
  hours: string;
  description: string;
  tasks: string;
  notes: string;
  followup: string;
  acknowledgement: string;
  materials: Material[];
};
export type ReportPhoto = { id: string; data: string; category: string };
export type ReportState = {
  id: string;
  form: ReportForm;
  photos: ReportPhoto[];
};
export type ReportFieldName = Exclude<keyof ReportForm, "materials">;
export const requiredReportFields: ReportFieldName[] = [
  "customer",
  "address",
  "worker",
  "description",
];
export const fieldLabels: Partial<Record<ReportFieldName, string>> = {
  customer: "Asiakas / yritys",
  address: "Kohteen osoite",
  worker: "Työntekijä",
  description: "Työn kuvaus",
};
export function emptyReport(): ReportState {
  const now = new Date(),
    date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  return {
    id: createReportId(),
    form: {
      customer: "",
      address: "",
      city: "",
      reference: "",
      date,
      worker: "",
      start: "",
      end: "",
      service: "",
      hours: "",
      description: "",
      tasks: "",
      notes: "",
      followup: "",
      acknowledgement: "",
      materials: [{ name: "", quantity: "", unit: "kpl" }],
    },
    photos: [],
  };
}
export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function readReport(store?: DraftStorage): ReportState {
  const state = emptyReport();
  try {
    const storage = store || localStorage;
    const parsed: unknown = JSON.parse(
      storage.getItem("kht-report-draft") || "{}",
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return state;
    const stored = parsed as Record<string, unknown>;
    for (const key of Object.keys(state.form) as Array<keyof ReportForm>) {
      if (key !== "materials" && typeof stored[key] === "string")
        state.form[key] = stored[key] as string;
    }
    if (Array.isArray(stored.materials))
      state.form.materials = stored.materials
        .filter((m) => m && typeof m === "object")
        .slice(0, 100)
        .map((m) => ({
          name: typeof m.name === "string" ? m.name : "",
          quantity: typeof m.quantity === "string" ? m.quantity : "",
          unit: typeof m.unit === "string" ? m.unit : "",
        }));
    const categories = Array.isArray(stored.photoCategories)
      ? stored.photoCategories
      : [];
    if (Array.isArray(stored.photos))
      state.photos = stored.photos
        .flatMap((data, index) =>
          typeof data === "string" &&
          /^data:image\/(jpeg|png|webp);base64,/.test(data)
            ? [
                {
                  id: crypto.randomUUID(),
                  data,
                  category: ["before", "during", "after"].includes(
                    categories[index],
                  )
                    ? categories[index]
                    : "before",
                },
              ]
            : [],
        )
        .slice(0, 6);
    const id = storage.getItem("kht-report-id");
    if (id && /^KHT-\d{8}-[A-F0-9]{6}$/.test(id)) state.id = id;
  } catch {
    /* Storage is optional; the editable report and local PDF still work. */
  }
  return state;
}
export function reportIsEmpty(state: ReportState) {
  return (
    !state.photos.length &&
    Object.entries(state.form).every(([key, value]) =>
      key === "date" || key === "materials"
        ? key === "date" ||
          state.form.materials.every((row) => !row.name && !row.quantity)
        : !value,
    )
  );
}
export function saveReport(state: ReportState, store?: DraftStorage) {
  const storage = store || localStorage;
  if (reportIsEmpty(state)) {
    storage.removeItem("kht-report-draft");
    storage.removeItem("kht-report-id");
    return;
  }
  storage.setItem(
    "kht-report-draft",
    JSON.stringify({
      ...state.form,
      photos: state.photos.map((photo) => photo.data),
      photoCategories: state.photos.map((photo) => photo.category),
    }),
  );
  storage.setItem("kht-report-id", state.id);
}
export function reportErrors(
  form: ReportForm,
): Partial<Record<ReportFieldName | "materials", string>> {
  const errors: Partial<Record<ReportFieldName | "materials", string>> = {};
  for (const key of requiredReportFields)
    if (!form[key].trim())
      errors[key] =
        "Täydennä " + fieldLabels[key]?.toLocaleLowerCase("fi-FI") + ".";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
    Number.isNaN(new Date(form.date).getTime()) ||
    new Date(form.date).toISOString().slice(0, 10) !== form.date
  )
    errors.date = "Valitse työn päivämäärä.";
  if (
    form.hours &&
    (!/^\d+(?:[.,]\d{1,2})?$/.test(form.hours) ||
      Number(form.hours.replace(",", ".")) > 10000)
  )
    errors.hours = "Kirjoita työtunnit numerona, esimerkiksi 2,5.";
  if (
    form.materials.some(
      (row) => row.quantity && !/^\d+(?:[.,]\d+)?$/.test(row.quantity),
    )
  )
    errors.materials =
      "Tarkista materiaalien määrät. Käytä nollaa tai positiivista lukua.";
  return errors;
}
export function photoLabel(category: string) {
  return category === "before"
    ? "Ennen työtä"
    : category === "after"
      ? "Työn jälkeen"
      : "Työn aikana";
}
