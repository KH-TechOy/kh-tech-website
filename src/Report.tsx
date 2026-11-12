import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Save,
  ImagePlus,
  Info,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Brand, company, services, url } from "./brand";
import { createReportId } from "./utils";
import { money, type CatalogMaterial } from './reportWorkModel';
import { finnishDate, isoDate, timeValid } from './reportLocale';
import { dateEntry, timeEntry } from './reportDateInputs';
import { BufferedPrice, MaterialPicker } from './reportAuth/ReportInputs';
import BillingPanels, {BillingSummary} from './reportAuth/BillingPanels';
import SignaturePad,{SignatureView} from './reportAuth/SignaturePad';
import {
  reportIsEmpty,
  reportErrors,
  requiredReportFields,
  photoLabel,
  type ReportFieldName,
  type ReportForm,
  type ReportPhoto,
  type ReportState,
} from "./reportModel";
import {
  createDraftSession,
  type DraftSession,
} from "./reportAuth/draftSession";

type Errors = ReturnType<typeof reportErrors>;
function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  full = false,
  required = false,
  errors,
}: {
  name: ReportFieldName;
  label: string;
  value: string;
  onChange: (name: ReportFieldName, value: string) => void;
  type?: string;
  full?: boolean;
  required?: boolean;
  errors: Errors;
}) {
  const props = {
    id: "report-" + name,
    name,
    value: type === 'date' ? finnishDate(value) : value,
    required,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? "error-" + name : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(name, type === 'date' ? isoDate(dateEntry(e.target.value)) || dateEntry(e.target.value) : type === 'time' ? timeEntry(e.target.value) : e.target.value),
  };
  return (
    <label className={full ? "full" : ""} htmlFor={props.id}>
      {label}
      {required && " *"}
      {type === "textarea" ? (
        <textarea {...props} rows={name === "description" ? 5 : 3} />
      ) : (
        <input
          {...props}
          type={type === 'date' || type === 'time' ? 'text' : type}
          inputMode={name === "hours" ? "decimal" : type === 'date' || type === 'time' ? 'numeric' : undefined}
          placeholder={type === 'date' ? 'pp.kk.vvvv' : type === 'time' ? 'HH:mm' : undefined}
          maxLength={type === 'date' ? 10 : type === 'time' ? 5 : undefined}
          pattern={type === 'time' ? '([01][0-9]|2[0-3]):[0-5][0-9]' : undefined}
          onBlur={e => e.currentTarget.setCustomValidity(type === 'date' && e.target.value && !isoDate(e.target.value) ? 'Anna päivämäärä muodossa pp.kk.vvvv.' : type === 'time' && e.target.value && !timeValid(e.target.value) ? 'Anna kellonaika muodossa HH:mm.' : '')}
          onInput={e => e.currentTarget.setCustomValidity('')}
          autoComplete={
            name === "customer"
              ? "organization"
              : name === "address"
                ? "street-address"
                : name === "city"
                  ? "address-level2"
                  : name === "worker"
                    ? "name"
                    : undefined
          }
        />
      )}
      {errors[name] && (
        <span className="field-error" id={"error-" + name}>
          {errors[name]}
        </span>
      )}
    </label>
  );
}
function Preview({
  state,
  onClose,
  onDownload,
}: {
  state: ReportState;
  onClose: () => void;
  onDownload: () => void;
}) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const { form, photos, id } = state;
  return (
    <dialog
      className="report-preview"
      aria-labelledby="report-preview-title"
      ref={dialog}
      onCancel={onClose}
    >
      <div className="preview-toolbar">
        <div>
          <small>TARKISTA ENNEN LATAUSTA</small>
          <h2 id="report-preview-title">Raportin esikatselu</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-button"
          aria-label="Sulje esikatselu"
          autoFocus
        >
          <X />
        </button>
      </div>
      <div className="preview-scroll">
        <article className="report-paper">
          <header>
            <Brand />
            <div>
              <strong>TYÖRAPORTTI</strong>
              <span>{id}</span>
              <time>{finnishDate(form.date)}</time>
            </div>
          </header>
          <h2>{form.customer}</h2>
          <p className="paper-address">
            {form.address}
            {form.city && ", " + form.city}
          </p>
          <dl className="paper-facts">
            <div>
              <dt>Työntekijä</dt>
              <dd>{form.worker}</dd>
            </div>
            <div>
              <dt>Työaika</dt>
              <dd>
                {form.start || "—"} – {form.end || "—"}
              </dd>
            </div>
            <div>
              <dt>Työtunnit</dt>
              <dd>{form.hours || "—"}</dd>
            </div>
            <div>
              <dt>Viite</dt>
              <dd>{form.reference || "—"}</dd>
            </div>
          </dl>
          {[
            ["Palvelu", form.service],
            ["Työn kuvaus", form.description],
            ["Tehdyt työvaiheet", form.tasks],
          ].map(([title, copy]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{copy || "Ei merkintää"}</p>
            </section>
          ))}
          <section>
            <h3>Materiaalit ja määrät</h3>
            <table>
              <thead>
                <tr>
                  <th>Materiaali</th>
                  <th>Määrä</th>
                  <th>Yksikkö</th>
                </tr>
              </thead>
              <tbody>
                {form.materials
                  .filter((row) => row.name || row.quantity)
                  .map((row, i) => (
                    <tr key={i}>
                      <td>{row.name}</td>
                      <td>{row.quantity}</td>
                      <td>{row.unit}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
          {state.billing && <section><h3>Laskutuksen valmistelu (ei lasku)</h3>
            <BillingSummary form={form} billing={{...state.billing,...state.operations}}/>
            {state.billing.otherDescription && <p>{state.billing.otherDescription}</p>}
            {form.materials.filter(row => row.name).map((row, i) => <p key={i}>{row.name}: {row.quantity} {row.unit} × {money(row.unitPriceCents || 0)} = {money(Math.round(Number(row.quantity.replace(',', '.') || 0) * (row.unitPriceCents || 0)))}</p>)}
          </section>}
          {state.signature?.confirmedAt&&<section><h3>Asiakkaan allekirjoitus</h3><SignatureView value={state.signature}/></section>}
          {[
            ["Lisähuomiot", form.notes],
            ["Jatkotoimet", form.followup],
            ["Asiakkaan kuittaus", form.acknowledgement],
          ].map(
            ([title, copy]) =>
              copy && (
                <section key={title}>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </section>
              ),
          )}
          {photos.map((photo, i) => (
            <figure key={photo.id}>
              <figcaption>
                {photoLabel(photo.category)} · kuva {i + 1}
              </figcaption>
              <img
                src={photo.data}
                alt={photoLabel(photo.category) + " – työkuva " + (i + 1)}
              />
            </figure>
          ))}
          <footer>
            KH-Tech Oy · {company.businessId}
            <br />
            {company.phone} · {company.email}
          </footer>
        </article>
      </div>
      <div className="preview-actions">
        <span>PDF:n sivutus mukautuu tekstin ja kuvien määrään.</span>
        <button type="button" className="button primary" onClick={onDownload}>
          <Download size={18} /> Lataa PDF
        </button>
      </div>
    </dialog>
  );
}
function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Valitse kuvatiedosto."));
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      reject(new Error("Kuva on liian suuri. Valitse alle 25 Mt:n kuva."));
      return;
    }
    const image = new Image(),
      source = URL.createObjectURL(file);
    image.onload = () => {
      try {
        const scale = Math.min(
            1,
            1600 / Math.max(image.naturalWidth, image.naturalHeight),
          ),
          canvas = document.createElement("canvas");
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Kuvan käsittely ei onnistunut.");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(source);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(
        new Error(
          "Kuvan lukeminen ei onnistunut. Kokeile JPEG-, PNG- tai WebP-kuvaa.",
        ),
      );
    };
    image.src = source;
  });
}
export default function Report({
  draftStorage,
  draftSession,
  cloudMode = false,
  cloudSave,
  catalog = [],
  admin = false,
  readOnly = false,
  onDiscardLocal,
  ownerUid = '',
  photoActions,
}: {
  draftStorage?: import("./reportModel").DraftStorage;
  draftSession?: DraftSession;
  cloudMode?: boolean;
  cloudSave?: () => void;
  catalog?: CatalogMaterial[];
  admin?: boolean;
  readOnly?: boolean;
  onDiscardLocal?: () => void;
  ownerUid?: string;
  photoActions?: (photos:ReportPhoto[],append:(photos:ReportPhoto[])=>void)=>React.ReactNode;
}) {
  const [session] = React.useState(
    () => draftSession || createDraftSession(draftStorage),
  );
  const { state, status: storage } = React.useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
  );
  const saveDraft = () => {
    if (session.getSnapshot().readFailed) {
      if (
        !confirm(
          "Aiemman luonnoksen lukeminen epäonnistui. Tallentaminen korvaa tämän käyttäjätilin aiemman luonnoksen näillä uusilla tiedoilla. Jatketaanko?",
        )
      )
        return;
      session.allowReplacementAfterReadFailure();
    }
    void session.save();
    cloudSave?.();
  };
  const setState = session.update;
  const localGeneration=session.getGeneration();
  const [message, setMessage] = React.useState("");
  const [checked, setChecked] = React.useState(false),
    [preview, setPreview] = React.useState(false),
    [busy, setBusy] = React.useState(false),
    [category, setCategory] = React.useState("before"),
    [pdfBusy, setPdfBusy] = React.useState(false);
  const errorSummary = React.useRef<HTMLDivElement>(null),
    previewTrigger = React.useRef<HTMLButtonElement>(null),
    mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    const flush = () => {
      session.flush();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const leaving = (event: BeforeUnloadEvent) => {
      if (!session.flush()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeunload", leaving);
    if(admin)void import("./pdf").catch(() => {});
    return () => {
      mounted.current = false;
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeunload", leaving);
    };
  }, [session,admin]);
  const errors = checked ? reportErrors(state.form) : {},
    progress = requiredReportFields.filter((name) =>
      state.form[name].trim(),
    ).length;
  const change = (name: ReportFieldName, value: string) => {
    setState((s) => ({ ...s, form: { ...s.form, [name]: value } }));
    setMessage("");
  };
  const field = (
    name: ReportFieldName,
    label: string,
    type = "text",
    full = false,
    required = false,
  ) => (
    <Field
      key={name}
      name={name}
      label={label}
      type={type}
      full={full}
      required={required}
      value={state.form[name]}
      onChange={change}
      errors={errors}
    />
  );
  const updateMaterials = (materials: ReportForm["materials"]) =>
    setState((s) => ({ ...s, form: { ...s.form, materials } }));
  function validate() {
    setChecked(true);
    if (Object.keys(reportErrors(state.form)).length) {
      setPreview(false);
      setTimeout(() => errorSummary.current?.focus(), 0);
      return false;
    }
    return true;
  }
  async function download() {
    if(!admin || cloudMode && readOnly)return;
    if (!validate()) return;
    setPdfBusy(true);
    try {
      const { createPdf } = await import("./pdf");
      createPdf({ id: state.id, form: state.form, photos: state.photos, billing:state.billing?{...state.billing,...state.operations}:undefined,signature:state.signature });
      setMessage(
        "PDF luotu tunnuksella " +
          state.id +
          ". Tiedosto on ladattu laitteelle; sitä ei lähetetty sähköpostilla.",
      );
    } catch {
      setMessage(
        "PDF:n luonti epäonnistui. Tarkista verkkoyhteys ensimmäisellä käyttökerralla ja kokeile uudelleen. Luonnoksesi on yhä tässä.",
      );
    } finally {
      setPdfBusy(false);
    }
  }
  async function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const generation = session.getGeneration();
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const room = 6 - state.photos.length;
    if (!room) {
      setMessage(
        "Yhteen raporttiin mahtuu enintään kuusi kuvaa. Poista ensin jokin kuva.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    const photos: ReportPhoto[] = [];
    try {
      for (const file of files.slice(0, room))
        photos.push({
          id: crypto.randomUUID(),
          data: await compressPhoto(file),
          category,
        });
      if (generation === session.getGeneration()) {
        setState((s) => ({
          ...s,
          photos: [...s.photos, ...photos].slice(0, 6),
        }));
        if (mounted.current)
          setMessage(
            files.length > room
              ? "Raporttiin lisättiin kuusi kuvaa. Loput eivät mahtuneet mukaan."
              : "Kuvat lisätty. Voit vaihtaa kunkin kuvan tyyppiä.",
          );
      }
    } catch (error) {
      if (generation === session.getGeneration()) {
        if (photos.length)
          setState((s) => ({
            ...s,
            photos: [...s.photos, ...photos].slice(0, 6),
          }));
        if (mounted.current)
          setMessage(
            error instanceof Error
              ? error.message
              : "Kuvien käsittely epäonnistui.",
          );
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function clear() {
    if (cloudMode) { onDiscardLocal?.(); return; }
    if (
      confirm("Poistetaanko työraporttiluonnos ja valokuvat tästä selaimesta?")
    ) {
      session.discard();
      setChecked(false);
      setMessage(
        session.getSnapshot().status === "error"
          ? "Tyhjennetty näkymä, mutta muutosta ei voitu tallentaa. Aiempi luonnos voi yhä olla selaimessa."
          : "Luonnos tyhjennetty. Ladattu PDF ei poistu.",
      );
    }
  }
  return (
    <div className="report-page">
      <a className="skip-link" href="#report-content">
        Siirry raporttiin
      </a>
      <header className="report-header">
        <a href={url()} aria-label="KH-Tech Oy – etusivu">
          <Brand />
        </a>
        <div>
          <span>TYÖRAPORTTI</span>
          <a href={url()}>
            <ArrowLeft size={14} /> Sivustolle
          </a>
        </div>
      </header>
      <main id="report-content" className="report-wrap" tabIndex={-1}>
        <div className="report-intro">
          <div>
            <span className="eyebrow">KH-TECH OY · TYÖN DOKUMENTOINTI</span>
            <h1>
              Hyvä työ.
              <br />
              Selkeä raportti.
            </h1>
            <p>
              Kirjaa kohde, tehdyt työt ja käytetyt tarvikkeet. Lisää kuvat ja
              lataa asiakkaalle selkeä PDF.
            </p>
          </div>
          <div className="report-mode">
            <Info size={19} />
            <span>
              {cloudMode ? 'Työraportti ja paikallinen PDF' : 'Paikallinen PDF-työkalu'}
              <small>
                {cloudMode ? 'Teksti tallentuu pilveen. Kuvat ja PDF pysyvät laitteella; sähköpostitoimitus ei ole käytössä.' : draftStorage
                  ? "Henkilökohtainen istunto. PDF ladataan laitteelle; pilvitallennus ja sähköpostitoimitus eivät ole käytössä."
                  : "Henkilöstötodennus ja sähköpostitoimitus eivät ole käytössä. Ei tuotantokäyttöön asiakastiedoilla."}
              </small>
            </span>
          </div>
        </div>
        <div className="report-workspace">
          <aside className="report-sidebar">
            <div className="report-progress">
              <span>RAPORTIN PERUSTIEDOT</span>
              <strong>{progress} / 4 valmiina</strong>
              <progress
                max={4}
                value={progress}
                aria-label="Pakolliset perustiedot"
              />
              <p>
                {progress === 4
                  ? "Valmis esikatseltavaksi. Lisää halutessasi materiaalit ja kuvat."
                  : "Täydennä asiakas, osoite, työntekijä ja työn kuvaus."}
              </p>
            </div>
            <nav aria-label="Raportin osiot">
              {[
                ["kohde", "01", "Asiakas ja kohde"],
                ["tyo", "02", "Työ ja ajankohta"],
                ["materiaalit", "03", "Materiaalit ja kuvat"],
                ["viimeistely", "04", "Tarkista ja lataa"],
              ].map(([id, n, title]) => (
                <a key={id} href={"#" + id}>
                  <span>{n}</span>
                  {title}
                  <ChevronRight size={15} />
                </a>
              ))}
            </nav>
            <div className="report-save" role="status">
              {storage === "error" ? (
                <Info size={16} />
              ) : storage === "saving" ? (
                <FileText size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>
                {storage === "error"
                  ? "Luonnosta ei voitu tallentaa"
                  : storage === "dirty"
                    ? "Tallentamattomia muutoksia"
                    : storage === "saving"
                      ? "Tallennetaan..."
                      : reportIsEmpty(state)
                        ? "Ei tallennettua luonnosta"
                        : "Luonnos tallennettu selaimeen"}
              </span>
            </div>
            <button
              type="button"
              className="button outline"
              onClick={saveDraft}
            >
              <Save size={16} /> Tallenna luonnos
            </button>
          </aside>
          <form
            className="report-form"
            onBlurCapture={(event) => {
              if (event.target.matches("input,textarea,select"))
                session.flush();
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void download();
            }}
            noValidate
          >
            <fieldset className="report-fields" disabled={readOnly}>
            <div className="report-id">
              <span>
                RAPORTIN TUNNUS<strong>{state.id}</strong>
              </span>
              {!cloudMode && <button
                type="button"
                onClick={() => {
                  setState((s) => ({ ...s, id: createReportId() }));
                  setMessage("Uusi raporttitunnus luotu.");
                }}
              >
                Uusi tunnus <ArrowRight size={14} />
              </button>}
            </div>
            <div className="privacy-alert">
              <Info />
              <p>
                {cloudMode ? 'Teksti synkronoidaan Firestoreen. Paikallinen palautuskopio ja kuvat säilyvät tässä välilehdessä myös uloskirjautuessa. Selainmuistia ei salata. Kuvat voivat kadota välilehden sulkeutuessa; lataa PDF. ' : draftStorage
                  ? "Luonnos ja kuvat tallentuvat vain tämän selaimen välilehteen omalle käyttäjätilillesi. Uloskirjautuminen säilyttää luonnoksen. Lataa PDF ennen välilehden sulkemista. "
                  : "Luonnos ja kuvat tallentuvat tämän laitteen selaimeen. Käytä omaa laitettasi ja poista luonnos työn jälkeen. "}
                <a href={url("tietosuoja/")}>Tietojen käsittely</a>
              </p>
            </div>
            {storage === "error" && (
              <div className="error-summary" role="alert">
                {session.getSnapshot().readFailed && (
                  <p>
                    Aiemman luonnoksen lukeminen epäonnistui. Automaattinen
                    tallennus on estetty, jotta aiempia tietoja ei korvata.
                    Tarkista selaimen tallennusasetukset. Jos olet jo
                    kirjoittanut uusia tietoja, ne säilyvät tässä välilehdessä.
                  </p>
                )}
                <strong>Automaattinen tallennus ei onnistunut.</strong>
                <p>
                  Selaimen tallennustila voi olla täynnä tai estetty. Tiedot
                  ovat vielä tällä sivulla. Lataa PDF ennen sivulta poistumista
                  ja vähennä tarvittaessa kuvia.
                </p>
              </div>
            )}
            {Object.keys(errors).length > 0 && (
              <div
                ref={errorSummary}
                tabIndex={-1}
                className="error-summary"
                role="alert"
              >
                <strong>Täydennä raportin tiedot</strong>
                <ul>
                  {Object.entries(errors).map(([name, error]) => (
                    <li key={name}>
                      <a
                        href={
                          name === "materials"
                            ? "#materiaalit"
                            : "#report-" + name
                        }
                      >
                        {error}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <section className="report-section" id="kohde">
              <div className="report-section-heading">
                <span>01</span>
                <div>
                  <h2>Asiakas ja kohde</h2>
                  <p>Kenelle työ tehtiin ja missä?</p>
                </div>
              </div>
              <div className="form-grid">
                {field("customer", "Asiakas / yritys", "text", false, true)}
                {field("reference", "Asiakkaan viite")}
                {field("address", "Kohteen osoite", "text", true, true)}
                {field("city", "Paikkakunta")}
              </div>
            </section>
            <section className="report-section" id="tyo">
              <div className="report-section-heading">
                <span>02</span>
                <div>
                  <h2>Työ ja ajankohta</h2>
                  <p>Kirjaa tehdyt työt selkeästi ja konkreettisesti.</p>
                </div>
              </div>
              <div className="form-grid">
                {field("date", "Työn päivämäärä", "date", false, true)}
                {field("worker", "Työntekijä", "text", false, true)}
                {field("start", "Työn alku", "time")}
                {field("end", "Työn loppu", "time")}
                <label htmlFor="report-service">
                  Palveluluokka
                  <select
                    id="report-service"
                    name="service"
                    value={state.form.service}
                    onChange={(e) => change("service", e.target.value)}
                  >
                    <option value="">Valitse palvelu</option>
                    {state.form.service &&
                      !services.some((s) => s.title === state.form.service) &&
                      state.form.service !== "Muu LVI-työ" && (
                        <option>{state.form.service}</option>
                      )}
                    {services.map((s) => (
                      <option key={s.id}>{s.title}</option>
                    ))}
                    <option>Muu LVI-työ</option>
                  </select>
                </label>
                {field("hours", "Työtunnit (esim. 2,5)")}
                {field("description", "Työn kuvaus", "textarea", true, true)}
                {field("tasks", "Tehdyt työvaiheet", "textarea", true)}
              </div>
            </section>
            <section className="report-section" id="materiaalit">
              <div className="report-section-heading">
                <span>03</span>
                <div>
                  <h2>Materiaalit ja kuvat</h2>
                  <p>Tarvikkeet määrineen ja kuvat työn eri vaiheista.</p>
                </div>
              </div>
              {cloudMode && <MaterialPicker items={catalog} onSelect={item => updateMaterials([...state.form.materials.filter(row => row.name || row.quantity), { name: item.name, unit: item.unit, quantity: '1', rowId: crypto.randomUUID(), catalogId: item.id, unitPriceCents: item.sellingCents }])} />}
              <div className="materials-heading" aria-hidden="true">
                <span>Materiaali</span>
                <span>Määrä</span>
                <span>Yksikkö</span>
              </div>
              {state.form.materials.map((row, i) => (
                <div className="material-row" key={i}>
                  {(["name", "quantity", "unit"] as const).map((key, j) => (
                    <input
                      key={key}
                      aria-label={
                        ["Materiaali", "Määrä", "Yksikkö"][j] + " " + (i + 1)
                      }
                      placeholder={["Esim. tiiviste", "2", "kpl"][j]}
                      value={row[key]}
                      inputMode={key === "quantity" ? "decimal" : undefined}
                      onChange={(e) =>
                        updateMaterials(
                          state.form.materials.map((r, index) =>
                            index === i ? { ...r, [key]: e.target.value, ...(key !== 'quantity' ? { catalogId: undefined, rowId: undefined, unitPriceCents: 0 } : {}) } : r,
                          ),
                        )
                      }
                    />
                  ))}
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={"Poista materiaali " + (i + 1)}
                    onClick={() =>
                      updateMaterials(
                        state.form.materials.filter((_, index) => index !== i),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                  {cloudMode && <span className="material-price">{admin ? <label>Yksikköhinta alv 0 % (€)<BufferedPrice uid={ownerUid} identity={state.id + ':material:' + `${i}:${row.name}:${row.unit}`} label={'Yksikköhinta ' + (i + 1)} value={row.unitPriceCents || 0} onCommit={unitPriceCents => setState(s => ({ ...s, form: { ...s.form, materials: s.form.materials.map((r, index) => index === i ? { ...r, unitPriceCents } : r) } }))} /></label> : money(row.unitPriceCents || 0) + ' / ' + row.unit}<strong>Rivi: {money(Math.round(Number(row.quantity.replace(',', '.') || 0) * (row.unitPriceCents || 0)))}</strong></span>}
                </div>
              ))}
              {errors.materials && (
                <p className="field-error">{errors.materials}</p>
              )}
              <button
                className="add-row"
                type="button"
                onClick={() =>
                  updateMaterials([
                    ...state.form.materials,
                    { name: "", quantity: "", unit: "kpl" },
                  ])
                }
              >
                <Plus size={16} /> Lisää materiaali
              </button>
              <div className="photo-section">
                <div>
                  <h3>
                    Valokuvat <small>{state.photos.length}/6</small>
                  </h3>
                  <p>Kuvat pakataan PDF:ää varten. Enintään kuusi kuvaa.</p>
                </div>
                <label htmlFor="photo-category">
                  Lisättävien kuvien tyyppi
                  <select
                    id="photo-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="before">Ennen työtä</option>
                    <option value="during">Työn aikana</option>
                    <option value="after">Työn jälkeen</option>
                  </select>
                </label>
                <div className="photo-actions">
                  <label className={"photo-picker " + (busy ? "disabled" : "")}>
                    <Camera size={20} />
                    {busy ? "Käsitellään kuvia…" : "Ota kuva"}
                    <input
                      type="file"
                      aria-label="Ota työkuva kameralla"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => void addPhotos(e)}
                      disabled={busy || state.photos.length >= 6}
                    />
                  </label>
                  <label
                    className={
                      "photo-picker secondary-picker " +
                      (busy ? "disabled" : "")
                    }
                  >
                    <ImagePlus size={20} />
                    Valitse kuvia
                    <input
                      type="file"
                      aria-label="Valitse työkuvia"
                      accept="image/*"
                      multiple
                      onChange={(e) => void addPhotos(e)}
                      disabled={busy || state.photos.length >= 6}
                    />
                  </label>
                </div>
                {state.photos.length === 0 && (
                  <div className="photo-empty">
                    <Camera size={29} />
                    <span>Kuva ennen ja jälkeen kertoo työn tuloksesta.</span>
                  </div>
                )}
                <div className="photo-grid">
                  {state.photos.map((photo, index) => (
                    <div key={photo.id} className="photo-thumb">
                      <img
                        src={photo.data}
                        alt={
                          photoLabel(photo.category) +
                          " – työkuva " +
                          (index + 1)
                        }
                      />
                      <div>
                        <select
                          aria-label={"Kuvan tyyppi " + (index + 1)}
                          value={photo.category}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              photos: s.photos.map((p) =>
                                p.id === photo.id
                                  ? { ...p, category: e.target.value }
                                  : p,
                              ),
                            }))
                          }
                        >
                          <option value="before">Ennen työtä</option>
                          <option value="during">Työn aikana</option>
                          <option value="after">Työn jälkeen</option>
                        </select>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={"Poista kuva " + (index + 1)}
                          disabled={busy}
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              photos: s.photos.filter((p) => p.id !== photo.id),
                            }))
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            {cloudMode && <BillingPanels state={state} session={session} admin={admin} uid={ownerUid}/> }
            <section className="report-section" id="viimeistely">
              <div className="report-section-heading">
                <span>04</span>
                <div>
                  <h2>{admin?'Tarkista ja lataa':'Viimeistele raportti'}</h2>
                  <p>
                    Lisää huomiot, jatkotoimet ja vapaaehtoinen allekirjoitus.
                  </p>
                </div>
              </div>
              <div className="form-grid">
                {field("notes", "Lisähuomiot", "textarea", true)}
                {field("followup", "Jatkotoimet", "textarea", true)}
                <SignaturePad value={state.signature} reportId={state.id} customer={state.form.customer} date={state.form.date} readOnly={readOnly} onChange={signature=>setState(s=>({...s,signature}))}/>
                {state.form.acknowledgement && <p className="work-help">Aiempi tekstikuittaus: {state.form.acknowledgement}</p>}
              </div>
              {admin && (!cloudMode || !readOnly) && <div className="report-actions">
                <button
                  ref={previewTrigger}
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    if (validate()) setPreview(true);
                  }}
                  disabled={busy || pdfBusy}
                >
                  <Eye size={18} /> Esikatsele raportti
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={busy || pdfBusy}
                >
                  <Download size={18} />
                  {pdfBusy ? "Luodaan PDF…" : "Luo ja lataa PDF"}
                </button>
              </div>}
              <p className="report-footer">
                <Info size={17} />
                {admin ? 'Luonnoksen PDF on tarkastusta varten. Lopullinen hyväksytty PDF ja arkistointi ovat työnkulkupaneelissa. Työkuvat toimitetaan erikseen.' : 'Täydennä raportti ja lähetä se tarkastettavaksi. Ylläpitäjä käsittelee hyväksynnän ja lopulliset raporttitiedostot. Kuvat säilyvät tässä välilehdessä.'}
              </p>
            </section>
            {message && (
              <p className="form-status" role="status">
                {message}
              </p>
            )}
            <div className="report-delete">
              <span>
                <Check size={16} />
                Varmista tietojen tallennus ennen paikallisen luonnoksen poistamista.
              </span>
              <button
                type="button"
                className="button danger"
                onClick={clear}
                disabled={busy || pdfBusy}
              >
                <Trash2 size={17} /> {cloudMode ? 'Poista paikallinen luonnos' : 'Poista luonnos'}
              </button>
            </div>
              {cloudMode&&<p>Poista paikallinen luonnos poistaa vain tämän välilehden palautuskopion ja kuvat. Pilviraportti ja arkistotiedostot säilyvät. Pysyvä pilvipoisto tehdään erikseen ylläpitäjän arkistotoiminnoissa.</p>}
            </fieldset>
          </form>
          {photoActions?.(state.photos,photos=>{if(localGeneration===session.getGeneration())setState(s=>({...s,photos:[...s.photos,...photos].slice(0,6)}))})}
        </div>
      </main>
      {admin && preview && (
        <Preview
          state={state}
          onClose={() => {
            setPreview(false);
            requestAnimationFrame(() =>
              previewTrigger.current?.focus({ preventScroll: true }),
            );
          }}
          onDownload={() => void download()}
        />
      )}
    </div>
  );
}
