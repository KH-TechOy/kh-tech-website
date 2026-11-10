import React from "react";
import { ArrowRight, Phone, Mail, MapPin, Check, Info } from "lucide-react";
import { company, services, url } from "./brand";
import { contactErrors, type ContactData } from "./utils";
import ContactChallenge, { ContactChallengeError, type ContactChallengeHandle } from "./ContactChallenge";
import { contactRequirements } from "../contact/shared";
import { contactConfigured, contactRequest, readPending, savePending, deliveryErrorText, DeliveryError, type ContactPending, type DeliveryResult } from "./contactDelivery";
import "./contact-delivery.css";

const empty: ContactData = {
  name: "",
  email: "",
  phone: "",
  location: "",
  service: "",
  urgency: "normal",
  method: "phone",
  description: "",
  honey: "",
};
export default function Contact() {
  const [data, setData] = React.useState(() => ({
      ...empty,
      service:
        services.find(
          (service) =>
            service.id === new URLSearchParams(location.search).get("palvelu"),
        )?.title || "",
    })),
    [submitted, setSubmitted] = React.useState(false),
    [status, setStatus] = React.useState("");
  const [phase, setPhase] = React.useState<"verifying" | "sending" | null>(null);
  const [challengeRetry, setChallengeRetry] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copying" | "copied" | "failed">("idle");
  const [pending, setPending] = React.useState<ContactPending | null>(readPending);
  const [result, setResult] = React.useState<DeliveryResult | null>(null);
  const [storageWarning, setStorageWarning] = React.useState(false);
  const sending = React.useRef(false);
  const challenge = React.useRef<ContactChallengeHandle>(null), copyAttempt = React.useRef(0);
  const confirmation = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (result?.state === "sent") confirmation.current?.focus(); }, [result]);
  const busy = phase !== null, locked = busy || !!pending;
  const required = contactRequirements(data.method);
  const summary = React.useRef<HTMLDivElement>(null),
    errors = submitted && !pending ? contactErrors(data) : {};
  function change(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = e.target;
    setData((d) => ({
      ...d,
      [name]:
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
    setStatus("");
    setChallengeRetry(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending.current || result?.state === "sent") return;
    setSubmitted(true);
    if (!pending && Object.keys(contactErrors(data)).length) {
      setTimeout(() => summary.current?.focus(), 0);
      return;
    }
    if (!contactConfigured) {
      setStatus("Lomakkeen lähetys ei ole vielä käytössä. Ota yhteyttä puhelimitse tai sähköpostilla. Pyyntöä ei lähetetty.");
      return;
    }
    sending.current = true; setPhase("verifying"); setStatus(""); setChallengeRetry(false);
    try {
      if (!challenge.current) throw new ContactChallengeError("unavailable");
      const token = await challenge.current.execute();
      const intent = pending || { key: `v1.${Date.now()}.${crypto.randomUUID()}` };
      setPending(intent);
      if (!savePending(intent)) setStorageWarning(true);
      setPhase("sending");
      const response = await contactRequest(intent, token, pending ? undefined : data);
      setResult(response);
      const next = { ...intent, reference: response.reference };
      setPending(response.state === "not_sent" ? null : next);
      if (!savePending(response.state === "not_sent" ? null : next)) setStorageWarning(true);
      if (response.state === "not_sent") setStatus("Viestiä ei lähetetty. Lähetyspalvelun kapasiteetti ei riitä juuri nyt. Tiedot säilyivät lomakkeella. Soita yritykselle tai yritä myöhemmin.");
      else if (response.state !== "sent") setStatus("Lähetystä ei ole vahvistettu. Älä lähetä samaa pyyntöä uudelleen. Tarkista lähetyksen tila tai soita yritykselle.");
    } catch (error) {
      if (error instanceof ContactChallengeError) {
        setChallengeRetry(true);
        setStatus(error.code === "expired" ? "Lähetyksen tarkistus vanheni. Yritä uudelleen." : "Lähetyksen tarkistus ei onnistunut. Yritä uudelleen tai ota yhteyttä puhelimitse.");
        return;
      }
      const code = error instanceof DeliveryError ? error.code : "unknown";
      setStatus(deliveryErrorText(code));
      // These responses occur before the email attempt. A status lookup never authorizes a resend.
      if (!pending && ["validation", "challenge", "challenge_unavailable", "rate_limited", "origin", "unavailable"].includes(code)) {
        setPending(null); if (!savePending(null)) setStorageWarning(true);
      }
    } finally {
      challenge.current?.reset(); setPhase(null); sending.current = false;
    }
  }
  async function copyReference() {
    if (!result || result.state !== "sent" || copyStatus === "copying") return;
    const attempt = ++copyAttempt.current;
    setCopyStatus("copying");
    try {
      await navigator.clipboard.writeText(result.reference);
      if (attempt === copyAttempt.current) setCopyStatus("copied");
    } catch {
      if (attempt === copyAttempt.current) setCopyStatus("failed");
    }
  }
  const field = (
    name: "name" | "email" | "phone" | "location",
    label: string,
    type = "text",
    required = false,
  ) => (
    <label htmlFor={"contact-" + name}>
      {label}
      {required && " *"}
      <input
        id={"contact-" + name}
        name={name}
        type={type}
        value={data[name]}
        onChange={change}
        autoComplete={
          {
            name: "name",
            email: "email",
            phone: "tel",
            location: "address-level2",
          }[name]
        }
        required={required}
        maxLength={name === "email" ? 160 : name === "phone" ? 40 : 120}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? "error-" + name : undefined}
      />
      {errors[name] && (
        <span className="field-error" id={"error-" + name}>
          {errors[name]}
        </span>
      )}
    </label>
  );
  return (
    <section
      className="section container contact-layout"
      aria-label="Yhteystiedot ja lomake"
    >
      <aside className="contact-aside">
        <span className="eyebrow">SUORAAN TEKIJÄLLE</span>
        <h2>
          Ota rohkeasti
          <br />
          yhteyttä.
        </h2>
        <p>
          Kerro työn tarpeesta tai kysy lisää palveluista. Katsotaan yhdessä,
          miten voimme auttaa.
        </p>
        <a className="contact-method" href={"tel:" + company.tel}>
          <Phone />
          <span>
            <small>SOITA TOMILLE</small>
            {company.phone}
          </span>
          <ArrowRight />
        </a>
        <a className="contact-method" href={"mailto:" + company.email}>
          <Mail />
          <span>
            <small>LÄHETÄ SÄHKÖPOSTIA</small>
            {company.email}
          </span>
          <ArrowRight />
        </a>
        <div className="contact-method">
          <MapPin />
          <span>
            <small>PALVELUALUE</small>
            {company.area}
          </span>
        </div>
        <dl className="company-details">
          <div>
            <dt>Yritys</dt>
            <dd>KH-Tech Oy</dd>
          </div>
          <div>
            <dt>Y-tunnus</dt>
            <dd>{company.businessId}</dd>
          </div>
          <div>
            <dt>Yhteyshenkilö</dt>
            <dd>{company.person}</dd>
          </div>
          <div>
            <dt>Postiosoite</dt>
            <dd>{company.address}</dd>
          </div>
        </dl>
      </aside>
      <form className="contact-form" noValidate onSubmit={submit} aria-busy={busy}>
        <div className="form-heading">
          <span className="eyebrow">KERRO TYÖSTÄ</span>
          <h2>Pyydä tarjous tai kysy lisää</h2>
          <p>Tähdellä merkityt tiedot tarvitaan pyynnön käsittelyyn.</p>
        </div>
        {Object.keys(errors).length > 0 && (
          <div
            ref={summary}
            tabIndex={-1}
            className="error-summary"
            role="alert"
          >
            <strong>Tarkista vielä nämä tiedot</strong>
            <ul>
              {Object.entries(errors).map(([name, error]) => (
                <li key={name}>
                  <a href={"#contact-" + name}>{error}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {pending && result?.state !== "sent" && <div className="notice contact-recovery" role="status"><Info size={19}/><p>Aiemman lähetyksen tila on tarkistettava ennen uutta pyyntöä. Tarkistus ei lähetä uutta sähköpostia. {pending.reference && <>Pyyntötunnus: <strong>{pending.reference}</strong>.</>}</p></div>}
        <fieldset disabled={locked}>
          <legend>1. Yhteystietosi</legend>
          <div className="form-grid">
            {field("name", "Nimi", "text", true)}
            {field("location", "Paikkakunta / työn sijainti")}
            {field("phone", "Puhelinnumero", "tel", required.phone)}
            {field("email", "Sähköposti", "email", required.email)}
            <label htmlFor="contact-method" className="full">
              Toivottu yhteydenottotapa
              <select
                id="contact-method"
                name="method"
                value={data.method}
                onChange={change}
              >
                <option value="phone">Soitto puhelimeen</option>
                <option value="email">Vastaus sähköpostilla</option>
                <option value="both">Puhelin ja sähköposti</option>
              </select>
              <small>
                Tähdellä merkityt yhteystiedot tarvitaan vastaamiseen.
              </small>
            </label>
          </div>
        </fieldset>
        <fieldset disabled={locked}>
          <legend>2. Työn tarve</legend>
          <div className="form-grid">
            <label className="full" htmlFor="contact-service">
              Palvelu
              <select
                id="contact-service"
                name="service"
                value={data.service}
                onChange={change}
              >
                <option value="">Valitse palvelu tai kerro omin sanoin</option>
                {services.map((s) => (
                  <option key={s.id}>{s.title}</option>
                ))}
                <option>Muu LVI-työ</option>
              </select>
            </label>
            <label className="full" htmlFor="contact-description">
              Kuvaile työn tarvetta *
              <textarea
                id="contact-description"
                name="description"
                rows={5}
                maxLength={3000}
                required
                value={data.description}
                onChange={change}
                placeholder="Mitä kohteessa pitäisi tehdä? Millaisesta kiinteistöstä on kyse?"
                aria-invalid={!!errors.description}
                aria-describedby={
                  "description-help" +
                  (errors.description ? " error-description" : "")
                }
              />
              <small id="description-help">
                Älä lisää arkaluonteisia tietoja. {data.description.length}/3000
                merkkiä.
              </small>
              {errors.description && (
                <span id="error-description" className="field-error">
                  {errors.description}
                </span>
              )}
            </label>
          </div>
          <fieldset id="contact-urgency" className="urgency-options">
            <legend>Milloin työ on ajankohtainen?</legend>
            {[
              ["normal", "Sovittavissa"],
              ["soon", "Lähiaikoina"],
              ["urgent", "Kiireellinen"],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  name="urgency"
                  type="radio"
                  value={value}
                  checked={data.urgency === value}
                  onChange={change}
                />
                <span>{label}</span>
                {data.urgency === value && <Check size={15} />}
              </label>
            ))}
          </fieldset>
          {data.urgency === "urgent" && (
            <div className="urgent-note" role="status">
              <strong>Kiireellinen tilanne?</strong>
              <p>
                Lomake ei takaa välitöntä apua. Soita{" "}
                <a href={"tel:" + company.tel}>{company.phone}</a>.
              </p>
            </div>
          )}
        </fieldset>
        <label className="honeypot" aria-hidden="true">
          Jätä tyhjäksi
          <input
            id="contact-honey"
            name="honey"
            value={data.honey}
            onChange={change}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
        <p className="contact-privacy-note">
          Yhteydenottotietoja käytetään pyyntöösi vastaamiseen ja mahdollisen
          toimeksiannon valmisteluun. <a href={url("tietosuoja/")}>Lue tietosuojaseloste</a>.
          Älä kirjoita terveystietoja tai muita arkaluonteisia tietoja.
        </p>
        {!contactConfigured && <p id="contact-availability" className="contact-unavailable">Verkkolähetys ei ole käytössä. Soita <a href={"tel:" + company.tel}>{company.phone}</a> tai lähetä <a href={"mailto:" + company.email}>sähköpostia</a>.</p>}
        {contactConfigured && result?.state !== "sent" && <ContactChallenge ref={challenge}/>}
        <button className="button primary" type="submit" disabled={!contactConfigured || busy || result?.state === "sent"} aria-describedby={!contactConfigured ? "contact-availability" : undefined}>
          {!contactConfigured ? "Verkkolähetys ei ole käytössä" : phase === "verifying" ? "Varmistetaan lähetystä…" : phase === "sending" ? "Lähetetään…" : result?.state === "sent" ? "Lähetys vahvistettu" : pending ? "Tarkista lähetyksen tila" : challengeRetry ? "Yritä uudelleen" : "Lähetä pyyntö"}
        </button>
        {result?.state === "sent" && <div ref={confirmation} className="contact-confirmation" role="status" tabIndex={-1}>
          <h3>Kiitos yhteydenotostasi!</h3>
          <p>Pyyntösi on vastaanotettu ja välitetty KH-Techille.</p>
          <p>Pyyntötunnus: <strong className="contact-reference">{result.reference}</strong></p>
          <button type="button" className="button outline" disabled={copyStatus === "copying"} onClick={copyReference} aria-describedby="contact-copy-feedback">Kopioi tunnus</button>
          <p id="contact-copy-feedback" className="contact-copy-feedback" role="status">{copyStatus === "copied" ? "Tunnus kopioitu." : copyStatus === "failed" ? "Kopiointi ei onnistunut. Voit valita tunnuksen ja kopioida sen käsin." : ""}</p>
          <p>Voit halutessasi säilyttää tunnuksen myöhempää asiointia varten.</p>
          {data.urgency === "urgent" && <p>Kiireellisessä asiassa voit myös soittaa numeroon <a href={"tel:" + company.tel}>{company.phone}</a>.</p>}
          <button type="button" className="button outline" onClick={() => { copyAttempt.current++; setCopyStatus("idle"); if (!savePending(null)) setStorageWarning(true); setPending(null); setResult(null); setData({...empty}); setSubmitted(false); setStatus(""); setChallengeRetry(false); }}>Uusi yhteydenotto</button>
        </div>}
        {storageWarning && <p role="alert" className="form-status">Selain ei salli lähetyksen tarkistustunnuksen muistamista. Pidä tämä sivu avoinna ja kirjoita mahdollinen pyyntötunnus talteen. Varmista epäselvä lähetys puhelimitse.</p>}
        {status && (
          <p role="status" className="form-status">
            {status}
          </p>
        )}
      </form>
    </section>
  );
}
