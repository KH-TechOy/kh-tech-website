import React from "react";
import type { User } from "firebase/auth";
import { reportRequest, reportError, type EmployeeProfile } from "./api";
import { useFormDraft, FormDraftNotice } from "./useFormDraft";
import { PriceInput } from "./ReportInputs";
import {
  finnishDate,
  isoDate,
  priceCents,
  priceText,
  workSchedule,
} from "../reportLocale";
import {
  money,
  type WorkReport,
  type CatalogMaterial,
} from "../reportWorkModel";
import { createReportId } from "../utils";
import { dateEntry, timeEntry } from '../reportDateInputs';

export function OrderForm({
  user,
  people,
  existing,
  loading,
  onSaved,
}: {
  user: User;
  people: EmployeeProfile[];
  existing: WorkReport | null;
  loading: boolean;
  onSaved(): void;
}) {
  const blank = () => ({
    customer: existing?.form.customer || "",
    address: existing?.form.address || "",
    description: existing?.form.description || "",
    date: finnishDate(existing?.schedule.split("T")[0] || ""),
    time: existing?.schedule.split("T")[1] || "",
    quotationReference: existing?.quotationReference || "",
    assignedTo: existing?.assignedTo || [user.uid],
    id: existing?.id || createReportId(),
    revision: existing?.revision || 0,
    requestId: crypto.randomUUID() as string,
  });
  const { value, setValue, draft, hasDraft } = useFormDraft(
    user.uid,
    "order:" + (existing?.id || "new"),
    blank,
  );
  const [busy, setBusy] = React.useState(false),
    [message, setMessage] = React.useState("");
  const running = React.useRef(false);
  const set = (
    key:
      | "customer"
      | "address"
      | "description"
      | "date"
      | "time"
      | "quotationReference",
    text: string,
  ) => setValue((v) => ({ ...v, [key]: text }));
  return (
    <details
      className="work-order-form"
      open={!!existing || hasDraft || undefined}
    >
      <summary>
        {existing ? "Muokkaa työtilausta ja vastuuhenkilöitä" : "Luo työtilaus"}
      </summary>
      <form
        onBlurCapture={() => draft.flush()}
        onSubmit={async (event) => {
          event.preventDefault();
          if (running.current) return;
          running.current = true;
          setBusy(true);
          setMessage("");
          const snapshot = draft.getSnapshot();
          try {
            const schedule = workSchedule(value.date, value.time);
            if (!draft.flush())
              throw new Error(
                "Lomakeluonnosta ei voitu tallentaa. Korjaa tallennusvirhe ennen lähettämistä.",
              );
            await reportRequest(user, "/work", {
              action: existing ? "order" : "createOrder",
              id: value.id,
              requestId: value.requestId,
              ...(existing ? { revision: value.revision } : {}),
              customer: value.customer,
              address: value.address,
              description: value.description,
              schedule,
              quotationReference: value.quotationReference,
              assignedTo: value.assignedTo,
            });
            if (!draft.clear(blank(), snapshot.revision))
              throw new Error(
                "Työtilaus tallennettiin, mutta paikallisen lomakeluonnoksen poistaminen epäonnistui. Älä luo samaa tilausta uudelleen.",
              );
            setMessage(existing ? "Työtilaus päivitetty." : "Työtilaus luotu.");
            onSaved();
          } catch (error) {
            setMessage(
              error instanceof Error && !("code" in error)
                ? error.message
                : reportError(error),
            );
          } finally {
            running.current = false;
            setBusy(false);
          }
        }}
      >
        {loading && <p role="status">Avataan työtilausta…</p>}
        <fieldset disabled={busy || loading}>
          <legend>{existing ? existing.id : "Uusi työtilaus"}</legend>
          <label>
            Asiakkaan nimi
            <input
              required
              value={value.customer}
              maxLength={500}
              onChange={(e) => set("customer", e.target.value)}
            />
          </label>
          <label>
            Kohteen osoite
            <input
              required
              value={value.address}
              maxLength={500}
              onChange={(e) => set("address", e.target.value)}
            />
          </label>
          <label>
            Työtilauksen kuvaus
            <textarea
              aria-label="Työtilauksen kuvaus"
              required
              value={value.description}
              maxLength={6000}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <div className="work-filters schedule-fields">
            <label>
              Sovittu päivämäärä (pp.kk.vvvv)
              <input
                type="text"
                inputMode="numeric"
                placeholder="pp.kk.vvvv"
                value={value.date}
                maxLength={10}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity("");
                  set("date", dateEntry(e.target.value));
                }}
                onBlur={(e) => {
                  const iso = isoDate(e.target.value);
                  e.currentTarget.setCustomValidity(
                    e.target.value && !iso
                      ? "Anna päivämäärä muodossa pp.kk.vvvv."
                      : "",
                  );
                  if (iso) set("date", finnishDate(iso));
                }}
              />
            </label>
            <label>
              Sovittu kellonaika (HH:mm)
              <input
                type="text"
                inputMode="numeric"
                placeholder="HH:mm"
                pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                value={value.time}
                maxLength={5}
                onChange={(e) => set("time", timeEntry(e.target.value))}
              />
            </label>
          </div>
          <p className="work-help">
            Suomen aika (Europe/Helsinki).{" "}
            {!value.date && !value.time
              ? "Ajankohta avoin."
              : "Päivämäärä ja kellonaika ovat valinnaisia; kellonaika tarvitsee päivämäärän."}
          </p>
          <label>
            Tarjouspyynnön viite (valinnainen)
            <input
              value={value.quotationReference}
              maxLength={40}
              onChange={(e) => set("quotationReference", e.target.value)}
            />
          </label>
          <fieldset>
            <legend>Vastuuhenkilöt</legend>
            {people
              .filter((p) => p.active)
              .map((p) => (
                <label className="work-checkbox" key={p.uid}>
                  <input
                    type="checkbox"
                    checked={value.assignedTo.includes(p.uid)}
                    onChange={(e) =>
                      setValue((v) => ({
                        ...v,
                        assignedTo: e.target.checked
                          ? [...v.assignedTo, p.uid]
                          : v.assignedTo.filter((uid) => uid !== p.uid),
                      }))
                    }
                  />
                  {p.displayName}
                  {p.uid === user.uid ? " (minä)" : ""}
                </label>
              ))}
          </fieldset>
          <button
            className="button primary"
            disabled={!value.assignedTo.length}
          >
            {busy
              ? "Tallennetaan…"
              : existing
                ? "Tallenna työtilaus"
                : "Luo työtilaus"}
          </button>
          {existing && (
            <button type="button" className="button outline" onClick={onSaved}>
              Sulje muokkaus
            </button>
          )}
          <FormDraftNotice draft={draft} />
        </fieldset>
      </form>
      {message && <p role="status">{message}</p>}
    </details>
  );
}

export function CatalogAdmin({
  user,
  items,
}: {
  user: User;
  items: CatalogMaterial[];
}) {
  const blank = () => ({
    id: crypto.randomUUID() as string,
    revision: 0,
    requestId: crypto.randomUUID() as string,
    name: "",
    code: "",
    unit: "kpl",
    selling: "0",
    purchase: "",
    active: true,
  });
  const { value, setValue, draft } = useFormDraft(user.uid, "catalog", blank);
  const [message, setMessage] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  const running = React.useRef(false);
  return (
    <section className="catalog-admin">
      <h3>Materiaalien ylläpito</h3>
      <p>
        Hinnat ilman arvonlisäveroa. Ostohinta on erillisessä, vain
        ylläpitäjälle sallitussa dokumentissa.
      </p>
      <ul className="work-cards">
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong>
            <p>
              {item.code} · {money(item.sellingCents)} / {item.unit} ·{" "}
              {item.active ? "Käytössä" : "Poistettu käytöstä"}
            </p>
            <button
              className="button outline"
              disabled={busy}
              onClick={async () => {
                if (running.current) return;
                if (draft.getSnapshot().hasDraft) {
                  if (value.id === item.id) {
                    setMessage(
                      "Materiaalin keskeneräistä muokkausta jatketaan.",
                    );
                    return;
                  }
                  if (
                    !confirm(
                      "Hylätäänkö materiaalilomakkeen keskeneräiset muutokset ja avataanko toinen materiaali?",
                    )
                  )
                    return;
                }
                running.current = true;
                setBusy(true);
                const selectionRevision = draft.getSnapshot().revision;
                try {
                  const response=await reportRequest<{material:CatalogMaterial&{purchaseCents:number|null}}>(user,'/work',{action:'loadMaterial',id:item.id});
                  const canonicalItem=response.material;
                  if (draft.getSnapshot().revision !== selectionRevision) return;
                  setValue({
                    id: item.id,
                    revision: canonicalItem.revision,
                    requestId: crypto.randomUUID(),
                    name: canonicalItem.name,
                    code: canonicalItem.code,
                    unit: canonicalItem.unit,
                    selling: priceText(canonicalItem.sellingCents),
                    purchase: priceText(canonicalItem.purchaseCents),
                    active: canonicalItem.active,
                  });
                } catch (error) {
                  setMessage(reportError(error));
                } finally {
                  running.current = false;
                  setBusy(false);
                }
              }}
            >
              Muokkaa materiaalia
            </button>
          </li>
        ))}
      </ul>
      <form
        onBlurCapture={() => draft.flush()}
        onSubmit={async (event) => {
          event.preventDefault();
          if (running.current) return;
          running.current = true;
          setBusy(true);
          setMessage("");
          const snapshot = draft.getSnapshot();
          try {
            const sellingCents = priceCents(value.selling),
              purchaseCents = priceCents(value.purchase, true);
            if (!draft.flush())
              throw new Error(
                "Lomakeluonnosta ei voitu tallentaa. Korjaa tallennusvirhe ennen lähettämistä.",
              );
            await reportRequest(user, "/work", {
              action: "material",
              id: value.id,
              revision: value.revision,
              requestId: value.requestId,
              name: value.name,
              code: value.code,
              unit: value.unit,
              active: value.active,
              sellingCents,
              purchaseCents,
            });
            if (!draft.clear(blank(), snapshot.revision))
              throw new Error(
                "Materiaali tallennettiin, mutta lomakeluonnoksen poistaminen epäonnistui. Älä luo materiaalia uudelleen.",
              );
            setMessage("Materiaali tallennettu.");
          } catch (error) {
            setMessage(
              error instanceof Error && !("code" in error)
                ? error.message
                : reportError(error),
            );
          } finally {
            running.current = false;
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend>
            {value.revision ? "Muokkaa materiaalia" : "Lisää materiaali"}
          </legend>
          {(["name", "code", "unit"] as const).map((key, i) => (
            <label key={key}>
              {["Nimi", "Tuotekoodi", "Yksikkö"][i]}
              <input
                required={key !== "code"}
                value={value[key]}
                maxLength={key === "name" ? 120 : key === "code" ? 40 : 20}
                onChange={(e) =>
                  setValue((v) => ({ ...v, [key]: e.target.value }))
                }
              />
            </label>
          ))}
          <label>
            Myyntihinta alv 0 % (€)
            <PriceInput
              value={value.selling}
              onChange={(selling) => setValue((v) => ({ ...v, selling }))}
              onBlur={() => {
                try {
                  const cents = priceCents(value.selling);
                  setValue((v) => ({ ...v, selling: priceText(cents) }));
                } catch {
                  /* Keep invalid input for correction. */
                }
              }}
            />
          </label>
          <label>
            Ostohinta alv 0 % (€), valinnainen
            <PriceInput
              optional
              value={value.purchase}
              onChange={(purchase) => setValue((v) => ({ ...v, purchase }))}
              onBlur={() => {
                try {
                  const cents = priceCents(value.purchase, true);
                  setValue((v) => ({ ...v, purchase: priceText(cents) }));
                } catch {
                  /* Keep invalid input for correction. */
                }
              }}
            />
          </label>
          <label className="work-checkbox">
            <input
              type="checkbox"
              checked={value.active}
              onChange={(e) =>
                setValue((v) => ({ ...v, active: e.target.checked }))
              }
            />
            Käytössä
          </label>
          <button className="button primary">
            {busy ? "Tallennetaan…" : "Tallenna materiaali"}
          </button>
          <button
            type="button"
            className="button outline"
            onClick={() => {
              if (
                !draft.getSnapshot().hasDraft ||
                confirm(
                  "Hylätäänkö materiaalilomakkeen keskeneräiset muutokset?",
                )
              )
                draft.clear(blank());
            }}
          >
            Uusi materiaali
          </button>
          <FormDraftNotice draft={draft} />
        </fieldset>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
