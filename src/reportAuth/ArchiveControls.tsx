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
import { finnishDate, finnishTimestamp } from "../reportLocale";
import { retentionWindow } from "../reportRetention";
import { SignatureView } from "./SignaturePad";
type Meta = {
  status: ArchiveStatus;
  pdfSha256?: string;
  portableSha256?: string;
  removedAt?: string;
  deliveryResolved?: boolean;
  receipt?: { at: string; byUid: string; method: string };
  error?: string;
  photo?: { status: ArchiveStatus };
  ownerRecovery?: boolean;
  authoritativePdfVerified?: boolean;
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
  const [recoveryReason, setRecoveryReason] = React.useState(""),
    [legalChecked, setLegalChecked] = React.useState(false);
  const [photoHashes, setPhotoHashes] = React.useState<string[]>([]);
  const [now, setNow] = React.useState(Date.now);
  React.useEffect(() => {
    if (!admin || report?.status !== "APPROVED") return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [admin, report?.status]);
  const running = React.useRef(false),
    [files, setFiles] = React.useState<{
      pdfSha256: string;
      portableSha256: string;
      names: string;
      portable: string;
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
      | "manualConfirm"
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
      const result = await reportRequest<{
        archive?: Meta;
        removed?: boolean;
        diagnostic?: string;
      }>(user, "/archive", {
        action,
        id,
        ...(["prepare", "send", "confirm", "manualConfirm", "delete"].includes(
          action,
        )
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
        ...(action === "manualConfirm"
          ? {
              portable: files?.portable,
              pdfSha256: files?.pdfSha256,
              confirmationId: receipt.value.confirmationId,
              recoverable: receipt.value.recoverable,
              reason: recoveryReason,
            }
          : {}),
        ...(action === "delete"
          ? {
              confirmationId: receipt.value.confirmationId,
              recoverable: receipt.value.recoverable,
              policyVersion: cap?.policyVersion,
              legalChecked,
            }
          : {}),
        ...(action === "confirmPhotos"
          ? {
              photoHashes,
              confirmationId: receipt.value.confirmationId,
              recoverable: receipt.value.recoverable,
            }
          : {}),
      });
      if (result.archive) setArchive(result.archive);
      if (result.diagnostic)
        setMessage(reportError({ code: result.diagnostic }));
      if (result.removed) {
        setMessage(
          "Raportti poistettu aktiivisesta pilvitietokannasta. Arkistotiedostot ja tarpeelliset tarkistusmetatiedot säilyvät.",
        );
        onRemoved();
      } else if (action === "confirm" || action === "manualConfirm") {
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
      const bytes = new Uint8Array(await pdf.arrayBuffer());
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
        throw new Error("Valitse alkuperäinen PDF-tiedosto.");
      setFiles({
        portable: await portable.text(),
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
    recoveryReason,
    setRecoveryReason,
    legalChecked,
    setLegalChecked,
    retention: retentionWindow(report?.approval?.at, cap?.retentionDays, now),
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
    recoveryReason,
    setRecoveryReason,
    legalChecked,
    setLegalChecked,
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
    retention,
  } = model;
  const confirmed = archive?.status === "ARCHIVE_CONFIRMED";
  const canSend =
    cap?.relayConfigured &&
    ![
      "ARCHIVE_SENDING",
      "ARCHIVE_SENT_UNVERIFIED",
      "ARCHIVE_CONFIRMED",
      "ARCHIVE_OUTCOME_UNKNOWN",
    ].includes(archive?.status || "");
  const verifiedInput =
    !!files && receipt.value.confirmationId === id && receipt.value.recoverable;
  return (
    <div className="archive-controls" aria-busy={busy}>
      <p>
        Hyväksynyt {report.approval?.byName} · {report.approval?.displayAt}
      </p>
      <p className="work-status" role="status">
        {busy
          ? "Käsitellään…"
          : confirmed
            ? "Arkistoitu"
            : archive?.status === "ARCHIVE_OUTCOME_UNKNOWN"
              ? "Vaatii tarkistuksen"
              : "Arkistointi kesken"}
      </p>
      <div className="work-actions">
        <button
          type="button"
          className="button primary"
          disabled={busy || !canSend}
          onClick={() => void run("send")}
        >
          Lähetä arkistoon
        </button>
        <button
          type="button"
          className="button outline"
          disabled={busy || !cap?.relayConfigured}
          onClick={() => void run("status")}
        >
          Tarkista lähetys
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
      {!cap?.relayConfigured && (
        <p>
          Sähköpostiarkisto ei ole käytettävissä. Lataa ja tallenna molemmat
          arkistotiedostot.
        </p>
      )}
      {archive?.status === "ARCHIVE_OUTCOME_UNKNOWN" && (
        <p>
          Lähetyksen tulos on epäselvä. Tarkista arkistopostilaatikko ja
          lähetyksen tila. Älä lähetä samaa viestiä uudelleen.
        </p>
      )}
      {archive?.status === "ARCHIVE_SENT_UNVERIFIED" && (
        <p>
          Viesti on hyväksytty lähetykseen. Varmista molempien liitteiden
          saatavuus ennen arkistointia.
        </p>
      )}
      <details>
        <summary>Lataa arkistotiedostot</summary>
        <p>
          Tallenna molemmat alkuperäiset tiedostot palautettavaan arkistoon.
        </p>
        <div className="work-actions">
          <button
            type="button"
            className="button outline"
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
        </div>
      </details>
      <details>
        <summary>Merkitse arkistoiduksi</summary>
        <p>
          Valitse arkistoon tallettamasi alkuperäiset PDF- ja
          .khtreport-tiedostot. Raportti säilyy sovelluksessa arkistoinnin
          jälkeen.
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
          className="button primary"
          disabled={busy || !verifiedInput || !archive?.pdfSha256}
          onClick={() => void run("confirm")}
        >
          Merkitse arkistoiduksi
        </button>
        <details>
          <summary>Käsin talletetun arkiston vahvistus</summary>
          <p>
            Käytä tätä, jos lähetyspalvelua ei saada varmennettua. Tarkista
            PDF:n sisältö ja varmista, että molemmat valitut alkuperäistiedostot
            vastaavat hyväksyttyä raporttia. Vahvistus kirjataan omalla
            nimelläsi. Se ei vahvista sähköpostin toimitusta eikä yksin salli
            pysyvää poistoa.
          </p>
          <label>
            Vahvistuksen perustelu
            <input
              value={recoveryReason}
              minLength={10}
              maxLength={500}
              onChange={(e) => setRecoveryReason(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button outline"
            disabled={
              busy || !verifiedInput || recoveryReason.trim().length < 10
            }
            onClick={() => void run("manualConfirm")}
          >
            Vahvista käsin talletettu arkisto
          </button>
        </details>
        {confirmed && archive.deliveryResolved !== true && (
          <p role="alert">
            Tiedostot on arkistoitu. Sähköpostin tulos on vielä selvittämättä;
            pysyvä poisto on estetty.
          </p>
        )}
        {archive?.photo && (
          <fieldset>
            <legend>Työkuvien vastaanotto</legend>
            <p>{archiveLabel[archive.photo.status]}</p>
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
              disabled={busy || !photoHashes.length || !verifiedInput}
              onClick={() => void run("confirmPhotos")}
            >
              Vahvista kuvaliitteiden vastaanotto
            </button>
          </fieldset>
        )}
        <FormDraftNotice draft={receipt.draft} />
      </details>
      <details>
        <summary>Säilytys ja poiston tarkistus</summary>
        <label className="work-checkbox">
          <input
            type="checkbox"
            checked={legalChecked}
            onChange={(e) => setLegalChecked(e.target.checked)}
          />
          Varmistin, ettei raporttiin liity muita lakisääteisiä tai
          toiminnallisia säilytysvelvoitteita.
        </label>
        <p>
          Arkistointi ei poista raporttia. Mitään ei poisteta automaattisesti.
        </p>
        <p>
          {!retention
            ? "Säilytysaikaa ei ole määritetty. Poisto on estetty."
            : retention.eligible
              ? "Vähimmäissäilytysaika on täyttynyt. Tarkista muut säilytysvelvoitteet ennen poistoa."
              : "Vähimmäissäilytysaika täyttyy " +
                finnishTimestamp(retention.eligibleAt) +
                "."}
        </p>
        {!cap?.canDelete && <p>Pysyvä poisto ei ole käytössä.</p>}
        <button
          type="button"
          className="button danger"
          disabled={
            busy ||
            !cap?.canDelete ||
            !legalChecked ||
            !retention?.eligible ||
            !archive?.receipt ||
            !confirmed ||
            archive.deliveryResolved !== true ||
            (archive.ownerRecovery === true &&
              archive.authoritativePdfVerified !== true) ||
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
        <p>
          Poistaa raportin pysyvästi sovelluksesta. Arkistotiedostot ja
          hyväksyntähistoria säilyvät. Poista paikallinen luonnos poistaa
          erikseen vain tämän välilehden kopion.
        </p>
      </details>
      {message && <p role="alert">{message}</p>}
      {archive?.error && !confirmed && (
        <p role="alert">{reportError({ code: archive.error })}</p>
      )}
      <details>
        <summary>Kehittäjän vianmääritys</summary>
        <button
          type="button"
          className="button outline"
          disabled={busy || !cap?.relayConfigured}
          onClick={() => void run("prepare")}
        >
          Valmistele arkiston tarkisteet
        </button>
        <p>
          Koodi: {archive?.error || "ei virhekoodia"}. Tila:{" "}
          {archive?.status || "ei lähetyst?"}.
        </p>
      </details>
    </div>
  );
}
export function ArchiveImport({ user }: { user: User }) {
  const [file, setFile] = React.useState<PortableReport | null>(null),
    [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null),
    selection = React.useRef(0);
  return (
    <details className="archive-import">
      <summary>Tuo .khtreport tarkasteltavaksi</summary>
      <p>
        Tarkastele arkistotiedostoa tai luo siitä uusi työ. Alkuperäinen säilyy
        muuttumattomana.
      </p>
      <input
        type="file"
        accept=".khtreport"
        ref={inputRef}
        aria-label="Tuo .khtreport"
        onChange={async (e) => {
          const current = ++selection.current;
          setError("");
          setFile(null);
          try {
            const selected = e.target.files?.[0];
            if (!selected) return;
            if (selected.size > 150000)
              throw new Error("Tiedosto on liian suuri.");
            const parsed = await parsePortable(await selected.text());
            if (current === selection.current) setFile(parsed);
          } catch (e) {
            if (current === selection.current)
              setError(e instanceof Error ? e.message : "Tuonti epäonnistui.");
          }
        }}
      />
      <button
        type="button"
        className="button outline"
        disabled={busy}
        onClick={() => {
          selection.current++;
          setFile(null);
          setError("");
          if (inputRef.current) inputRef.current.value = "";
        }}
      >
        Tyhjennä valinta
      </button>
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
