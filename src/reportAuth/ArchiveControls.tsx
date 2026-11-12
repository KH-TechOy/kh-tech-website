import React from "react";
import type { User } from "firebase/auth";
import { reportRequest, reportError } from "./api";
import {
  archiveLabel,
  parsePortable,
  portableText,
  sha256,
  type PortableReport,
  type ArchiveStatus,
} from "../reportArchive";
import type { WorkReport } from "../reportWorkModel";
import { createReportId } from "../utils";
import { useFormDraft, FormDraftNotice } from "./useFormDraft";
import { BillingSummary } from "./BillingPanels";
import { finnishDate } from "../reportLocale";
import { SignatureView } from "./SignaturePad";
type Meta = {
  status: ArchiveStatus;
  pdfSha256?: string;
  portableSha256?: string;
  removedAt?: string;
  deliveryResolved?: boolean;
  error?: string;
  photo?: { status: ArchiveStatus };
};
type Capabilities = {
  relayConfigured: boolean;
  canDelete: boolean;
  policyVersion: string;
  retentionDays: number | null;
};
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function useArchiveControls(
  user: User,
  report: WorkReport | null,
  admin: boolean,
  onRemoved: () => void,
) {
  const [archive, setArchive] = React.useState<Meta | null>(null),
    [cap, setCap] = React.useState<Capabilities | null>(null),
    [busy, setBusy] = React.useState(false),
    [message, setMessage] = React.useState("");
  const [photoHashes, setPhotoHashes] = React.useState<string[]>([]);
  const running = React.useRef(false),
    [files, setFiles] = React.useState<{
      pdfSha256: string;
      portableSha256: string;
      names: string;
    } | null>(null);
  const id = report?.id || "none",
    receipt = useFormDraft(user.uid, "receipt:" + id, () => ({
      confirmationId: "",
      method: "mailbox",
      recoverable: false,
    }));
  React.useEffect(() => {
    if (!admin) return;
    let alive = true;
    void reportRequest<Capabilities>(user, "/archive", {
      action: "capabilities",
    })
      .then((c) => {
        if (alive) setCap(c);
      })
      .catch((e) => {
        if (alive) setMessage(reportError(e));
      });
    return () => {
      alive = false;
    };
  }, [user, admin]);
  React.useEffect(() => {
    if (!admin || report?.status !== "APPROVED") return;
    let alive = true;
    void reportRequest<{ archive: Meta | null }>(user, "/archive", {
      action: "snapshot",
      id,
    })
      .then((r) => {
        if (alive) setArchive(r.archive);
      })
      .catch((e) => {
        if (alive) setMessage(reportError(e));
      });
    return () => {
      alive = false;
    };
  }, [user, admin, id, report?.status, report?.revision]);
  const fresh = async () => {
    const response = await reportRequest<{
      portable: PortableReport;
      archive: Meta | null;
    }>(user, "/archive", { action: "snapshot", id });
    const parsed = await parsePortable(portableText(response.portable));
    setArchive(response.archive);
    return parsed;
  };
  const run = async (
    action:
      | "pdf"
      | "portable"
      | "prepare"
      | "send"
      | "status"
      | "confirm"
      | "confirmPhotos"
      | "delete"
      | "copy",
  ) => {
    if (!admin || running.current || !report) return;
    running.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (action === "pdf" || action === "portable") {
        const snapshot = await fresh();
        if (action === "pdf")
          (await import("../finalPdf"))
            .buildFinalPdf(snapshot)
            .save(id + "_r" + snapshot.report.revision + ".pdf");
        else
          download(
            new Blob([portableText(snapshot)], {
              type: "application/vnd.kh-tech.report+json",
            }),
            id + "_r" + snapshot.report.revision + ".khtreport",
          );
        setMessage(
          "Hyväksytyn version tiedosto ladattu laitteelle. Vastaanottoa ei ole vielä varmennettu.",
        );
        return;
      }
      if (action === "copy") {
        if (
          !confirm(
            "Luodaanko hyväksytystä raportista uusi muokattava kopio? Alkuperäinen säilyy lukittuna; allekirjoitus pyydetään uudelleen.",
          )
        )
          return;
        const result = await reportRequest<{ id: string }>(user, "/archive", {
          action: "copy",
          id,
          targetId: createReportId(),
          requestId: crypto.randomUUID(),
        });
        setMessage("Uusi muokattava kopio luotu: " + result.id);
        return;
      }
      if (
        action === "send" &&
        !confirm(
          "Lähetetäänkö hyväksytty PDF ja .khtreport yrityksen arkistoon? Epäselvää lähetystä ei uusita automaattisesti.",
        )
      )
        return;
      if (
        action === "delete" &&
        !confirm(
          "Poistetaanko raportti " +
            id +
            " aktiivisesta pilvitietokannasta? Varmista, että molemmat arkistotiedostot ovat palautettavissa. Palveluntarjoajan varmuuskopiot eivät välttämättä poistu heti.",
        )
      )
        return;
      const result = await reportRequest<{ archive?: Meta; removed?: boolean }>(
        user,
        "/archive",
        {
          action,
          id,
          ...(["prepare", "send", "confirm", "delete"].includes(action)
            ? { revision: report.revision }
            : {}),
          ...(action === "confirm"
            ? {
                pdfSha256: files?.pdfSha256,
                portableSha256: files?.portableSha256,
                receiptMethod: receipt.value.method,
                confirmationId: receipt.value.confirmationId,
                recoverable: receipt.value.recoverable,
              }
            : {}),
          ...(action === "delete"
            ? {
                confirmationId: receipt.value.confirmationId,
                recoverable: receipt.value.recoverable,
                policyVersion: cap?.policyVersion,
              }
            : {}),
          ...(action === "confirmPhotos"
            ? {
                photoHashes,
                confirmationId: receipt.value.confirmationId,
                recoverable: receipt.value.recoverable,
              }
            : {}),
        },
      );
      if (result.archive) setArchive(result.archive);
      if (result.removed) {
        setMessage(
          "Raportti poistettu aktiivisesta pilvitietokannasta. Arkistotiedostot ja tarpeelliset tarkistusmetatiedot säilyvät.",
        );
        onRemoved();
      } else if (action === "confirm") {
        receipt.draft.flush();
        setMessage("Ylläpitäjä vahvisti vastaavien tiedostojen vastaanoton.");
      }
    } catch (e) {
      setMessage(reportError(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const selectFiles = async (selected: FileList | null) => {
    if (!selected || !report) return;
    setFiles(null);
    setMessage("");
    try {
      const pdf = Array.from(selected).find((f) =>
          f.name.toLowerCase().endsWith(".pdf"),
        ),
        portable = Array.from(selected).find((f) =>
          f.name.toLowerCase().endsWith(".khtreport"),
        );
      if (!pdf || !portable || pdf.size > 2000000 || portable.size > 150000)
        throw new Error(
          "Valitse arkistosta ladatut PDF ja .khtreport (enintään 2 Mt ja 150 kt).",
        );
      const parsed = await parsePortable(await portable.text());
      if (parsed.report.id !== id || parsed.report.revision !== report.revision)
        throw new Error("Tiedostot kuuluvat eri raporttiin tai versioon.");
      setFiles({
        pdfSha256: await sha256(new Uint8Array(await pdf.arrayBuffer())),
        portableSha256: await sha256(
          new Uint8Array(await portable.arrayBuffer()),
        ),
        names: pdf.name + " + " + portable.name,
      });
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Tiedostojen lukeminen epäonnistui.",
      );
    }
  };
  return {
    archive,
    cap,
    busy,
    message,
    run,
    receipt,
    files,
    selectFiles,
    id,
    photoHashes,
    selectPhotos: async (selected: FileList | null) => {
      setPhotoHashes([]);
      try {
        const list = Array.from(selected || []);
        if (
          !list.length ||
          list.length > 6 ||
          list.some((f) => f.size > 1200000)
        )
          throw new Error(
            "Valitse enintään kuusi vastaanotettua kuvaliitettä, kukin enintään 1,2 Mt.",
          );
        setPhotoHashes(
          await Promise.all(
            list.map(async (f) =>
              sha256(new Uint8Array(await f.arrayBuffer())),
            ),
          ),
        );
      } catch (e) {
        setMessage(
          e instanceof Error ? e.message : "Kuvien lukeminen epäonnistui.",
        );
      }
    },
  };
}
export function ArchiveControls({
  model,
  report,
}: {
  model: ReturnType<typeof useArchiveControls>;
  report: WorkReport;
}) {
  const {
    archive,
    cap,
    busy,
    message,
    run,
    receipt,
    files,
    selectFiles,
    id,
    photoHashes,
    selectPhotos,
  } = model;
  return (
    <div className="archive-controls" aria-busy={busy}>
      <p>
        Hyväksynyt {report.approval?.byName} · {report.approval?.displayAt} ·
        versio {report.approval?.revision}
      </p>
      <p role="status">
        {busy
          ? "Arkistotoimintoa käsitellään…"
          : archive
            ? archiveLabel[archive.status]
            : "Arkistoa ei ole vielä lähetetty."}
      </p>
      <div className="work-actions">
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => void run("pdf")}
        >
          Lataa lopullinen PDF
        </button>
        <button
          type="button"
          className="button outline"
          disabled={busy}
          onClick={() => void run("portable")}
        >
          Lataa .khtreport
        </button>
        <button
          type="button"
          className="button outline"
          disabled={busy}
          onClick={() => void run("copy")}
        >
          Luo korjauskopio
        </button>
      </div>
      <details>
        <summary>Arkistointi ja vastaanoton varmennus</summary>
        {!cap?.relayConfigured && (
          <p>
            Arkistosähköpostin palveluasetukset puuttuvat. Lataa molemmat
            tiedostot ja säilytä raportti pilvessä. Lähetystä tai vastaanottoa
            ei ilmoiteta onnistuneeksi.
          </p>
        )}
        <div className="work-actions">
          <button
            type="button"
            className="button outline"
            disabled={busy || !cap?.relayConfigured}
            onClick={() => void run("prepare")}
          >
            Valmistele arkiston tarkisteet
          </button>
          <button
            type="button"
            className="button primary"
            disabled={
              busy ||
              !cap?.relayConfigured ||
              (!!archive &&
                [
                  "ARCHIVE_SENDING",
                  "ARCHIVE_SENT_UNVERIFIED",
                  "ARCHIVE_CONFIRMED",
                  "ARCHIVE_OUTCOME_UNKNOWN",
                ].includes(archive.status))
            }
            onClick={() => void run("send")}
          >
            {archive?.status === "ARCHIVE_FAILED"
              ? "Yritä arkistolähetystä uudelleen"
              : "Lähetä arkistosähköposti"}
          </button>
          <button
            type="button"
            className="button outline"
            disabled={busy || !cap?.relayConfigured}
            onClick={() => void run("status")}
          >
            Tarkista arkistolähetyksen tila
          </button>
        </div>
        <p>
          Lähetyspalvelun hyväksyntä ei todista postilaatikon vastaanottoa.
          Valitse itsenäisesti arkistosta tai viestistä ladatut molemmat
          tiedostot; tarkisteiden on vastattava hyväksyttyä versiota.
        </p>
        <label>
          Vastaanotetut PDF- ja .khtreport-tiedostot
          <input
            type="file"
            multiple
            accept=".pdf,.khtreport"
            disabled={busy}
            onChange={(e) => void selectFiles(e.target.files)}
          />
        </label>
        {files && <p>{files.names}</p>}
        <label>
          Arkiston sijainti
          <select
            value={receipt.value.method}
            onChange={(e) =>
              receipt.setValue((v) => ({ ...v, method: e.target.value }))
            }
          >
            <option value="mailbox">Yrityksen arkistopostilaatikko</option>
            <option value="download">Ladattu, palautettava arkisto</option>
          </select>
        </label>
        <label>
          Kirjoita vahvistukseksi raporttitunnus {id}
          <input
            value={receipt.value.confirmationId}
            onChange={(e) =>
              receipt.setValue((v) => ({
                ...v,
                confirmationId: e.target.value,
              }))
            }
          />
        </label>
        <label className="work-checkbox">
          <input
            type="checkbox"
            checked={receipt.value.recoverable}
            onChange={(e) =>
              receipt.setValue((v) => ({ ...v, recoverable: e.target.checked }))
            }
          />
          Varmistin molempien tiedostojen saatavuuden ja palautettavuuden.
        </label>
        <button
          type="button"
          className="button outline"
          disabled={
            busy ||
            !files ||
            !archive?.pdfSha256 ||
            receipt.value.confirmationId !== id ||
            !receipt.value.recoverable
          }
          onClick={() => void run("confirm")}
        >
          Vahvista arkiston vastaanotto
        </button>
        {archive?.status === "ARCHIVE_CONFIRMED" &&
          archive.deliveryResolved !== true && (
            <p role="alert">
              Tiedostot on varmennettu, mutta lähetysoperaation sulkemista ei
              vielä varmistettu. Tarkista tila tai vahvista vastaanotto
              uudelleen. Poistaminen on estetty.
            </p>
          )}
        {archive?.photo && (
          <fieldset>
            <legend>Erillisen kuvalähetyksen varmennus</legend>
            <p>
              {archiveLabel[archive.photo.status]}. Valitse arkistosta saamasi
              alkuperäiset kuvaliitteet. Tarkisteiden on vastattava lähetettyä
              aineistoa.
            </p>
            <input
              type="file"
              aria-label="Vastaanotetut kuvaliitteet"
              accept="image/jpeg,image/png"
              multiple
              disabled={busy}
              onChange={(e) => void selectPhotos(e.target.files)}
            />
            <button
              type="button"
              className="button outline"
              disabled={
                busy ||
                !photoHashes.length ||
                receipt.value.confirmationId !== id ||
                !receipt.value.recoverable
              }
              onClick={() => void run("confirmPhotos")}
            >
              Vahvista kuvaliitteiden vastaanotto
            </button>
          </fieldset>
        )}
        {!cap?.canDelete && (
          <p>
            Poisto on estetty, kunnes omistajan säilytyspolitiikka ja
            vähimmäisaika on asetettu palvelimelle.
          </p>
        )}
        <button
          type="button"
          className="button danger"
          disabled={
            busy ||
            !cap?.canDelete ||
            archive?.status !== "ARCHIVE_CONFIRMED" ||
            archive.deliveryResolved !== true ||
            (!!archive.photo &&
              [
                "ARCHIVE_PENDING",
                "ARCHIVE_SENDING",
                "ARCHIVE_OUTCOME_UNKNOWN",
              ].includes(archive.photo.status)) ||
            receipt.value.confirmationId !== id ||
            !receipt.value.recoverable
          }
          onClick={() => void run("delete")}
        >
          Poista arkistoitu raportti pilvestä
        </button>
        <FormDraftNotice draft={receipt.draft} />
      </details>
      {message && <p role="alert">{message}</p>}
      {archive?.error && (
        <p role="alert">{reportError({ code: archive.error })}</p>
      )}
    </div>
  );
}
export function ArchiveImport({ user }: { user: User }) {
  const [file, setFile] = React.useState<PortableReport | null>(null),
    [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  return (
    <details className="archive-import">
      <summary>Tuo .khtreport tarkasteltavaksi</summary>
      <p>
        Tuonti on vain luku. Tarkiste varmistaa eheyden, ei lähettäjän
        henkilöllisyyttä. Hyväksyttyä alkuperäistä ei korvata.
      </p>
      <input
        type="file"
        accept=".khtreport"
        aria-label="Tuo .khtreport"
        onChange={async (e) => {
          setError("");
          setFile(null);
          try {
            const selected = e.target.files?.[0];
            if (!selected) return;
            if (selected.size > 150000)
              throw new Error("Tiedosto on liian suuri.");
            setFile(await parsePortable(await selected.text()));
          } catch (e) {
            setError(e instanceof Error ? e.message : "Tuonti epäonnistui.");
          }
        }}
      />
      {file && (
        <section>
          <h3>
            {file.report.id} · versio {file.report.revision}
          </h3>
          <p>
            {file.report.form.customer} · {file.report.form.address}{" "}
            {file.report.form.city}
          </p>
          <p>{file.report.form.description}</p>
          <dl>
            {[
              ["Päivämäärä", finnishDate(file.report.form.date)],
              ["Työntekijä", file.report.form.worker],
              [
                "Työaika",
                file.report.form.start + " – " + file.report.form.end,
              ],
              ["Työtunnit", file.report.form.hours],
              ["Työvaiheet", file.report.form.tasks],
              ["Huomiot", file.report.form.notes],
              ["Jatkotoimet", file.report.form.followup],
              ["Tarjousviite", file.report.quotationReference],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <ul>
            {file.report.form.materials
              .filter((m) => m.name)
              .map((m, i) => (
                <li key={i}>
                  {m.name} · {m.quantity} {m.unit} ·{" "}
                  {String((m.unitPriceCents || 0) / 100).replace(".", ",")} €/{" "}
                  {m.unit}
                </li>
              ))}
          </ul>
          <p>
            Hyväksyjä: {file.report.approval.byName} ·{" "}
            {file.report.approval.displayAt}
          </p>
          <BillingSummary
            form={file.report.form}
            billing={file.report.billing}
          />
          {file.report.signature && (
            <SignatureView value={file.report.signature} />
          )}
          <button
            className="button outline"
            disabled={busy}
            onClick={async () => {
              (await import("../finalPdf"))
                .buildFinalPdf(file)
                .save(file.report.id + "_r" + file.report.revision + ".pdf");
            }}
          >
            Lataa tuodun arkiston PDF
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              if (
                !confirm(
                  "Luodaanko tuodusta tiedostosta uusi muokattava kopio? Allekirjoitusta tai hyväksyntää ei siirretä uutena hyväksyntänä.",
                )
              )
                return;
              setBusy(true);
              try {
                const r = await reportRequest<{ id: string }>(
                  user,
                  "/archive",
                  {
                    action: "import",
                    id: file.report.id,
                    targetId: createReportId(),
                    requestId: crypto.randomUUID(),
                    portable: portableText(file),
                  },
                );
                setError("Uusi kopio luotu: " + r.id);
              } catch (e) {
                setError(reportError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Luo tuodusta uusi muokattava kopio
          </button>
        </section>
      )}
      {error && <p role="status">{error}</p>}
    </details>
  );
}
