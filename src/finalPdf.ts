import { buildPdf } from "./pdf";
import type { PortableReport } from "./reportArchive";
/** Browser and trusted GAS use this exact generator/version and deterministic metadata. */
export function buildFinalPdf(archive: PortableReport) {
  const r = archive.report;
  const pdf = buildPdf({
    id: r.id,
    form: r.form,
    billing: r.billing,
    signature: r.signature,
    approval: r.approval,
    quotationReference: r.quotationReference,
    comment: r.comment,
    photos: [],
    compact: true,
    // Original C archives remain byte-identical. Only new approvals opt in.
    legacySignature: r.approval.pdfLayout !== 2,
  });
  pdf.setCreationDate(
    "D:" + r.approval.at.slice(0, 19).replace(/[-:T]/g, "") + "+00'00'",
  );
  pdf.setFileId(archive.integrity.value.slice(0, 32));
  pdf.setProperties({
    title: "Hyväksytty työraportti " + r.id,
    subject:
      "KH-Tech approved revision " +
      r.revision +
      " / " +
      archive.integrity.value,
    author: "KH-Tech Oy",
    creator: "KH-Tech Report archive v1",
  });
  return pdf;
}
