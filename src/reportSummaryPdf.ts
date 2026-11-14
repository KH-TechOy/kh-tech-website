import { jsPDF } from "jspdf";
import { brandLogoData } from "./brand-logo-data";
import { summarize, type SummaryRow } from "./reportSummary";
import { money } from "./reportWorkModel";
export function buildSummaryPdf(
  rows: SummaryRow[],
  filterLabel: string,
  names: Record<string, string> = {},
) {
  const d = summarize(rows),
    pdf = new jsPDF();
  if (d.overflow) throw new Error("summary_total_limit");
  let y = 18;
  const line = (s: string) => {
    for (const text of pdf.splitTextToSize(s, 178)) {
      if (y > 275) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(text, 16, y);
      y += 6;
    }
  };
  pdf.addImage(brandLogoData, "PNG", 16, y, 42, 15);
  y += 24;
  pdf.setFontSize(16);
  line("Työn ja laskutuksen yhteenveto");
  pdf.setFontSize(10);
  line(filterLabel);
  line("Laskutuksen valmistelu, ei maksettua liikevaihtoa.");
  line(`${d.totals.count} työtä | ${d.totals.hours} h | ${d.totals.km} km`);
  for (const [label, k] of [
    ["Työ", "work"],
    ["Materiaalit", "materialsTotal"],
    ["Matka", "travel"],
    ["Muut kulut", "other"],
    ["Veroton", "net"],
    ["ALV", "vat"],
    ["Sis. ALV", "gross"],
  ] as const)
    line(label + ": " + money(d.totals[k]));
  line(
    `Saatavilla olevat materiaaliostot: ${money(d.totals.purchase)}. Puuttuvia ostohintoja: ${d.totals.missingCosts}. Alustavia raportteja: ${d.totals.estimates}.`,
  );
  for (const [rate, v] of Object.entries(d.vat))
    line(
      `ALV ${Number(rate) / 100} % | veroton ${money(v.net)} | vero ${money(v.vat)} | sis. ALV ${money(v.gross)}`,
    );
  line("Työntekijät (yhteistyön tunnit ja kilometrit jaettu tasan):");
  for (const [uid, e] of Object.entries(d.employees))
    line(
      `${names[uid] || "Tuntematon työntekijä"}: ${e.count} työtä, ${e.hours.toFixed(2).replace(".", ",")} h, ${e.km.toFixed(2).replace(".", ",")} km`,
    );
  line("Materiaalit:");
  for (const m of d.materials)
    line(`${m.name}: ${m.quantity} ${m.unit}, ${money(m.salesCents)}`);
  line("Raportit:");
  for (const r of d.rows)
    line(
      `${r.id} | ${r.customer} | ${r.workDate || "Päivä puuttuu"} | ${r.finalized ? "Hyväksytty" : "Alustava"} | ${r.hours} h | ${r.km} km | ${money(r.totals.net)} + ALV ${money(r.totals.vat)} = ${money(r.totals.gross)}${r.missing?.length ? " | Puuttuu: " + r.missing.join(", ") : ""}`,
    );
  return pdf;
}
