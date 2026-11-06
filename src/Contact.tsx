import React from "react";
import { ArrowRight, Phone, Mail, MapPin, Check, Info } from "lucide-react";
import { company, services, url } from "./brand";
import { contactErrors, type ContactData } from "./utils";

const empty: ContactData = {
  name: "",
  email: "",
  phone: "",
  location: "",
  service: "",
  urgency: "normal",
  method: "phone",
  description: "",
  consent: false,
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
  const summary = React.useRef<HTMLDivElement>(null),
    errors = submitted ? contactErrors(data) : {};
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
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(contactErrors(data)).length) {
      setTimeout(() => summary.current?.focus(), 0);
      return;
    }
    setStatus(
      "Lomakkeen lähetys ei ole vielä käytössä. Ota yhteyttä puhelimitse tai sähköpostilla. Pyyntöä ei lähetetty.",
    );
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
      <form className="contact-form" noValidate onSubmit={submit}>
        <div className="form-heading">
          <span className="eyebrow">KERRO TYÖSTÄ</span>
          <h2>Pyydä tarjous tai kysy lisää</h2>
          <p>Tähdellä merkityt tiedot tarvitaan pyynnön käsittelyyn.</p>
        </div>
        <div className="notice">
          <Info size={19} />
          <p>
            <strong>Lomake on esittelytilassa.</strong> Tietoja ei vielä
            lähetetä. Saat yhteyden soittamalla tai sähköpostilla.
          </p>
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
        <fieldset>
          <legend>1. Yhteystietosi</legend>
          <div className="form-grid">
            {field("name", "Nimi", "text", true)}
            {field("location", "Paikkakunta / työn sijainti")}
            {field("phone", "Puhelinnumero", "tel")}
            {field("email", "Sähköposti", "email")}
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
              </select>
              <small>
                Lisää valitsemasi yhteystieto. Voit antaa myös molemmat.
              </small>
            </label>
          </div>
        </fieldset>
        <fieldset>
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
        <label className="consent" htmlFor="contact-consent">
          <input
            id="contact-consent"
            type="checkbox"
            name="consent"
            required
            checked={data.consent}
            onChange={change}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? "error-consent" : undefined}
          />
          <span>
            Olen lukenut <a href={url("tietosuoja/")}>tietosuojatiedot</a> ja
            ymmärrän, että tiedot on tarkoitettu yhteydenottoa varten. *
          </span>
        </label>
        {errors.consent && (
          <p id="error-consent" className="field-error">
            {errors.consent}
          </p>
        )}
        <button className="button primary" type="submit">
          Lähetä pyyntö <ArrowRight size={18} />
        </button>
        {status && (
          <p role="status" className="form-status">
            {status}
          </p>
        )}
      </form>
    </section>
  );
}
