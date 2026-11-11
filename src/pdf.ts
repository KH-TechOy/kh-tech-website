import { jsPDF } from "jspdf";
import { brandLogoData } from "./brand-logo-data";
import { billingTotals, money, type Billing } from './reportWorkModel';
import type { ReportForm } from './reportModel';
type ReportPhoto = string | { data: string; category?: string };
export type PdfInput = {
  id: string;
  form: Record<string, any>;
  photos: ReportPhoto[];
  billing?: Billing;
};

export function buildPdf({ id, form, photos, billing }: PdfInput) {
  const doc = new jsPDF({ format: "a4", unit: "mm" }),
    left = 16,
    right = 194,
    bottom = 268,
    lineHeight = 4.8;
  const ink = "#1e2529",
    muted = "#626b71",
    accent = "#315e75";
  let y = 66;
  const date =
    typeof form.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(form.date)
      ? form.date.split("-").reverse().join(".")
      : new Date().toLocaleDateString("fi-FI");
  function header(title = "Työraportti") {
    doc.setFillColor("#ffffff");
    doc.rect(0, 0, 210, 297, "F");
    doc.addImage(
      brandLogoData,
      "PNG",
      left,
      13,
      53,
      (53 * 424) / 1340,
      "official-kh-tech",
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(muted);
    doc.text("KH-TECH OY / TYÖN DOKUMENTOINTI", right, 17, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(id, right, 24, { align: "right" });
    doc.setDrawColor("#d7dcde");
    doc.setLineWidth(0.3);
    doc.line(left, 36, right, 36);
    doc.setTextColor(ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(title, left, 49);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(muted);
    doc.text("Raporttitunnus: " + id, left, 58);
    doc.text("Työn päivämäärä: " + date, right, 58, { align: "right" });
    y = 70;
  }
  function nextPage(title = "Työraportti – jatkuu") {
    doc.addPage();
    header(title);
  }
  function ensure(space: number) {
    if (y + space > bottom) {
      nextPage();
      return true;
    }
    return false;
  }
  function label(text: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(accent);
    doc.text(text.toLocaleUpperCase("fi-FI"), left, y);
    y += 7;
  }
  function section(title: string, content: unknown) {
    const text =
      typeof content === "string" && content.trim() ? content : "Ei merkintää";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, right - left) as string[];
    ensure(17);
    label(title);
    for (const line of lines) {
      if (ensure(lineHeight)) {
        label(title + " (jatkuu)");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(ink);
      doc.text(line, left, y);
      y += lineHeight;
    }
    y += 7;
  }
  header();
  section(
    "Asiakas ja kohde",
    [
      form.customer,
      form.address,
      form.city,
      form.reference ? "Viite: " + form.reference : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  section(
    "Työntekijä ja työaika",
    [
      form.worker,
      form.start || form.end
        ? "Työaika: " + (form.start || "—") + "–" + (form.end || "—")
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  section(
    "Palvelu ja työtunnit",
    [form.service, form.hours ? "Työtunnit: " + form.hours : ""]
      .filter(Boolean)
      .join("\n"),
  );
  section("Työn kuvaus", form.description);
  section("Tehdyt työvaiheet", form.tasks);
  const materials = (
    Array.isArray(form.materials) ? form.materials : []
  ).filter((m) => m && typeof m === "object" && (m.name || m.quantity));
  ensure(26);
  label("Materiaalit ja määrät");
  function tableHeader() {
    doc.setFillColor("#f0f2f3");
    doc.rect(left, y - 4, right - left, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(muted);
    doc.text("MATERIAALI", left + 3, y + 1);
    doc.text("MÄÄRÄ", 130, y + 1);
    doc.text("YKSIKKÖ", 166, y + 1);
    y += 11;
  }
  if (!materials.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(ink);
    doc.text("Ei kirjattuja materiaaleja.", left, y);
    y += 12;
  } else {
    tableHeader();
    for (const material of materials) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const values = [
          String(material.name || "Materiaali"),
          String(material.quantity || ""),
          String(material.unit || ""),
        ],
        columns = [left + 3, 130, 166],
        widths = [105, 29, 25];
      const lines = values.map(
          (value, i) => doc.splitTextToSize(value, widths[i]) as string[],
        ),
        length = Math.max(...lines.map((value) => value.length));
      for (let index = 0; index < length; index++) {
        if (ensure(lineHeight + 2)) {
          label("Materiaalit ja määrät (jatkuu)");
          tableHeader();
        }
        doc.setTextColor(ink);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        lines.forEach((value, i) => {
          if (value[index]) doc.text(value[index], columns[i], y);
        });
        y += lineHeight;
      }
      doc.setDrawColor("#e0e4e5");
      doc.setLineWidth(0.2);
      doc.line(left, y - 2, right, y - 2);
      y += 4;
    }
    y += 5;
  }
  if (billing) {
    const totals = billingTotals(form as ReportForm, billing);
    section('Laskutuksen valmistelu (ei lasku)', `Työ: ${money(totals.work)}\nMateriaalit: ${money(totals.materialsTotal)}\nMatka: ${money(totals.travel)}\nMuut kulut: ${money(totals.other)}${billing.otherDescription ? ' / ' + billing.otherDescription : ''}\nYhteensä alv 0 %: ${money(totals.net)}\nALV ${billing.vatBasisPoints / 100} %: ${money(totals.vat)}`);
    form.materials.filter((row: any) => row.name).forEach((row: any) => section(row.name, `${row.quantity} ${row.unit} × ${money(row.unitPriceCents || 0)} = ${money(Math.round(Number(String(row.quantity).replace(',', '.')) * (row.unitPriceCents || 0)))}`));
  }
  if (form.notes) section("Lisähuomiot", form.notes);
  if (form.followup) section("Jatkotoimet", form.followup);
  if (form.acknowledgement) section("Asiakkaan kuittaus", form.acknowledgement);
  photos.forEach((photo, index) => {
    const data = typeof photo === "string" ? photo : photo.data,
      category = typeof photo === "string" ? "during" : photo.category;
    const title =
      category === "before"
        ? "Ennen työtä"
        : category === "after"
          ? "Työn jälkeen"
          : "Työn aikana";
    nextPage(title);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(muted);
    doc.text("Työkuva " + (index + 1) + " / " + photos.length, left, y);
    y += 8;
    try {
      const props = doc.getImageProperties(data),
        ratio = Math.min(
          (right - left) / props.width,
          (bottom - y - 10) / props.height,
        ),
        w = props.width * ratio,
        h = props.height * ratio;
      doc.addImage(
        data,
        props.fileType || "JPEG",
        left + (right - left - w) / 2,
        y,
        w,
        h,
        "work-photo-" + index,
      );
      doc.setFontSize(8);
      doc.setTextColor(muted);
      doc.text(title + " · " + id, left, Math.min(bottom, y + h + 7));
    } catch {
      doc.setFontSize(10);
      doc.setTextColor(ink);
      doc.text(
        "Kuvaa ei voitu lisätä. Tarkista alkuperäinen kuva.",
        left,
        y + 8,
      );
    }
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor("#d7dcde");
    doc.setLineWidth(0.3);
    doc.line(left, 276, right, 276);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(ink);
    doc.text("KH-Tech Oy · Y-tunnus 3413645-9", left, 282);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(muted);
    doc.text("040 073 6199 · tomi.honka@kh-tech.fi", left, 286.5);
    doc.text(
      "Laiturikatu 14 C 49, 08100 Lohja · Helsinki / Uusimaa",
      left,
      291,
    );
    doc.text("Sivu " + page + " / " + pages, right, 282, { align: "right" });
    doc.text(id, right, 291, { align: "right" });
  }
  doc.setProperties({
    title: "Työraportti " + id,
    subject: "KH-Tech Oy – työraportti",
    author: "KH-Tech Oy",
    creator: "KH-Tech työraportti",
  });
  return doc;
}
export function createPdf(input: PdfInput) {
  buildPdf(input).save("KH-Tech_Tyoraportti_" + input.id + ".pdf");
  return input.id;
}
