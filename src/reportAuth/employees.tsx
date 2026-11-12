import React from "react";
import type { User } from "firebase/auth";
import { useFormDraft, FormDraftNotice } from './useFormDraft';
import {
  reportRequest,
  reportError,
  ReportApiError,
  type EmployeeProfile,
} from "./api";
type Created = {
  uid: string;
  completed: boolean;
  setupEmail: { status: string; error: string };
};
function readRequests(key: string): Map<string, string> {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(key) || "[]");
    return new Map(
      Array.isArray(parsed)
        ? parsed.filter(
            (v): v is [string, string] =>
              Array.isArray(v) &&
              typeof v[0] === "string" &&
              v[0].length < 512 &&
              typeof v[1] === "string" &&
              /^[a-f0-9-]{36}$/.test(v[1]),
          )
        : [],
    );
  } catch {
    return new Map();
  }
}
export default function Employees({ user }: { user: User }) {
  const [users, setUsers] = React.useState<EmployeeProfile[]>([]),
    [next, setNext] = React.useState<string | undefined>(),
    [busy, setBusy] = React.useState(false),
    [message, setMessage] = React.useState("");
  const creation = useFormDraft(user.uid, 'employee-create', () => ({ name: '', email: '' }));
  const { name, email } = creation.value;
  const setName = (name: string) => creation.setValue(v => ({ ...v, name }));
  const setEmail = (email: string) => creation.setValue(v => ({ ...v, email }));
  const nameDraft = useFormDraft(user.uid, 'employee-name', () => ({ uid: '', name: '' }));
  const editing = nameDraft.value.uid || null, editedName = nameDraft.value.name;
  const setEditedName = (name: string) => nameDraft.setValue(v => ({ ...v, name }));
  const [created, setCreated] = React.useState<EmployeeProfile | null>(null);
  const requestKey = "kht-report-ops:" + user.uid;
  const requests = React.useMemo(
    () => ({ current: readRequests(requestKey) }),
    [requestKey],
  );
  const persistRequests = () => {
    try {
      sessionStorage.setItem(requestKey, JSON.stringify([...requests.current]));
    } catch {
      /* in-memory idempotency remains available */
    }
  };
  function requestId(key: string) {
    if (!requests.current.has(key)) {
      requests.current.set(key, crypto.randomUUID());
      persistRequests();
    }
    return requests.current.get(key)!;
  }
  function forget(key: string) {
    requests.current.delete(key);
    persistRequests();
  }
  async function load(more = false, preserveMessage = false) {
    setBusy(true);
    try {
      const result = await reportRequest<{
        users: EmployeeProfile[];
        nextPageToken?: string;
      }>(
        user,
        "/employees" +
          (more && next ? "?pageToken=" + encodeURIComponent(next) : ""),
      );
      setUsers((previous) =>
        more ? [...previous, ...result.users] : result.users,
      );
      setNext(result.nextPageToken);
      setCreated((previous) =>
        previous
          ? result.users.find((profile) => profile.uid === previous.uid) ||
            previous
          : null,
      );
    } catch (error) {
      setMessage((previous) =>
        preserveMessage && previous
          ? previous +
            " Käyttäjäluetteloa ei voitu päivittää. " +
            reportError(error)
          : reportError(error),
      );
    } finally {
      setBusy(false);
    }
  }
  React.useEffect(() => {
    void load();
  }, []);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const formRevision = creation.draft.getSnapshot().revision;
    setBusy(true);
    setMessage("");
    const key = "create:" + email.trim().toLowerCase() + ":" + name.trim();
    try {
      const result = await reportRequest<Created>(user, "/employees", {
        requestId: requestId(key),
        email: email.trim(),
        displayName: name.trim(),
      });
      if (!result.completed) throw new ReportApiError("unavailable");
      setCreated({
        uid: result.uid,
        email: email.trim(),
        displayName: name.trim(),
        role: "employee",
        active: true,
        validAfter: 0,
        passwordSetupRequired: true,
        setupEmailStatus: result.setupEmail.status,
        setupEmailError: result.setupEmail.error,
      });
      forget(key);
      creation.draft.clear({ name: '', email: '' }, formRevision);
      setMessage(
        result.setupEmail.status === "accepted"
          ? "Työntekijä luotu. Salasanan asetusviesti on hyväksytty lähetyspalveluun. Postilaatikon vastaanottoa ei ole varmennettu."
          : "Työntekijätili luotiin, mutta asetusviestin lähetystä ei vahvistettu. " +
              reportError(
                new ReportApiError(
                  result.setupEmail.error || "email_outcome_unknown",
                ),
              ) +
              " Käytä työntekijän Lähetä asetuslinkki uudelleen -painiketta.",
      );
      await load(false, true);
    } catch (error) {
      setMessage(reportError(error));
    } finally {
      setBusy(false);
    }
  }
  async function action(
    target: EmployeeProfile,
    kind: "role" | "disable" | "reset" | "name",
  ) {
    if (busy) return;
    const nameRevision = nameDraft.draft.getSnapshot().revision;
    if (
      kind === "disable" &&
      !confirm(
        "Estetäänkö käyttäjän " +
          target.displayName +
          " pääsy työraportteihin?",
      )
    )
      return;
    const role = target.role === "admin" ? "employee" : "admin";
    if (
      kind === "role" &&
      !confirm(
        (role === "admin" ? "Myönnetäänkö" : "Poistetaanko") +
          " käyttäjän " +
          target.displayName +
          " ylläpitäjän oikeudet?",
      )
    )
      return;
    const key =
      kind +
      ":" +
      target.uid +
      ":" +
      (kind === "role" ? role : kind === "name" ? editedName.trim() : "");
    if (kind === "reset" && target.setupEmailStatus === "unknown") {
      if (
        !confirm(
          "Aiemman lähetyksen tulos on epäselvä. Uusi lähetys voi tuottaa toisen viestin. Lähetetäänkö uusi linkki?",
        )
      )
        return;
      forget(key);
      if (kind === "reset")
        setCreated((previous) =>
          previous?.uid === target.uid
            ? { ...previous, setupEmailStatus: "accepted", setupEmailError: "" }
            : previous,
        );
    }
    setBusy(true);
    setMessage("");
    try {
      await reportRequest(user, "/employees/action", {
        requestId: requestId(key),
        action: kind,
        uid: target.uid,
        ...(kind === "role"
          ? { role }
          : kind === "name"
            ? { displayName: editedName.trim() }
            : {}),
      });
      forget(key);
      if (kind === "name") nameDraft.draft.clear({ uid: '', name: '' }, nameRevision);
      setMessage(
        kind === "reset"
          ? "Salasanaviesti on hyväksytty lähetyspalveluun. Postilaatikon vastaanottoa ei ole varmennettu."
          : kind === "name"
            ? "Nimi päivitetty. Kirjautumissähköposti ei muuttunut."
            : "Käyttöoikeus päivitetty.",
      );
      await load(false, true);
    } catch (error) {
      setMessage(reportError(error));
      if (kind === "reset")
        setCreated((previous) =>
          previous?.uid === target.uid
            ? {
                ...previous,
                setupEmailStatus:
                  error instanceof ReportApiError &&
                  error.code !== "network" &&
                  error.code !== "email_outcome_unknown" &&
                  error.code !== "outcome_unknown"
                    ? "failed"
                    : "unknown",
              }
            : previous,
        );
      await load(false, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="access-employees">
      <h1>Työntekijät</h1>
      <p>
        Aktiivisia ladatussa luettelossa: {users.filter((u) => u.active).length}
      </p>
      <form onSubmit={create} onBlurCapture={() => creation.draft.flush()}>
        <h2>Lisää työntekijä</h2>
        <label>
          Nimi
          <input
            value={name}
            disabled={busy}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Sähköposti
          <input
            type="email"
            value={email}
            disabled={busy}
            maxLength={160}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <p>
          Työntekijä valitsee oman salasanansa sähköpostiin lähetettävällä
          linkillä. Salasanaa ei näytetä ylläpitäjälle.
        </p>
        <button className="button primary" disabled={busy}>
          Luo työntekijä
        </button>
        <FormDraftNotice draft={creation.draft} />
      </form>
      {message && (
        <p role="status" className="access-message">
          {message}
        </p>
      )}
      {created && created.active && created.setupEmailStatus !== "accepted" && (
        <div className="access-message">
          <strong>Tili luotu: {created.email}</strong>
          <p>Älä luo tiliä uudelleen. Voit uusia vain asetusviestin.</p>
          <button
            type="button"
            className="button outline"
            disabled={busy}
            onClick={() => void action(created, "reset")}
          >
            Lähetä asetuslinkki uudelleen
          </button>
        </div>
      )}
      <ul className="access-user-list">
        {users.map((target) => (
          <li key={target.uid}>
            <div>
              <strong>{target.displayName}</strong>
              <span>Sähköposti: {target.email}</span>
              <span>
                Rooli: {target.role === "admin" ? "Ylläpitäjä" : "Työntekijä"}
              </span>
              <span>
                Tila:{" "}
                {!target.active
                  ? "Käyttö estetty"
                  : target.passwordSetupRequired
                    ? "Odottaa ensimmäistä kirjautumista"
                    : "Aktiivinen"}
              </span>
              {target.passwordSetupRequired && (
                <span>
                  {target.setupEmailStatus === "accepted"
                    ? "Asetusviesti hyväksytty lähetykseen."
                    : target.setupEmailStatus === "failed"
                      ? "Asetusviestiä ei hyväksytty lähetykseen."
                      : target.setupEmailStatus === "unknown"
                        ? "Asetusviestin tulos on epäselvä."
                        : "Asetusviestiä ei ole vielä vahvistettu."}
                </span>
              )}
              {editing === target.uid && (
                <form
                  className="access-name-form"
                  onBlurCapture={() => nameDraft.draft.flush()}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(target, "name");
                  }}
                >
                  <label>
                    Näyttönimi
                    <input
                      autoFocus
                      value={editedName}
                      disabled={busy}
                      maxLength={120}
                      required
                      onChange={(e) => setEditedName(e.target.value)}
                    />
                  </label>
                  <button className="button primary" disabled={busy}>
                    Tallenna nimi
                  </button>
                  <button
                    type="button"
                    className="button outline"
                    disabled={busy}
                    onClick={() => { if (confirm('Hylätäänkö näyttönimen keskeneräinen muutos?')) nameDraft.draft.clear({ uid: '', name: '' }); }}
                  >
                    Peruuta
                  </button>
                  <FormDraftNotice draft={nameDraft.draft} />
                </form>
              )}
            </div>
            <div className="access-user-actions">
              <button
                className="button outline"
                disabled={busy}
                onClick={() => {
                  if (editing === target.uid) return;
                  if (nameDraft.hasDraft && !confirm('Hylätäänkö keskeneräinen nimimuutos ja avataanko toinen käyttäjä?')) return;
                  nameDraft.setValue({ uid: target.uid, name: target.displayName });
                }}
              >
                Muokkaa nimeä
              </button>
              {target.active && (
                <>
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => void action(target, "reset")}
                  >
                    {target.passwordSetupRequired
                      ? target.setupEmailStatus === "failed" ||
                        target.setupEmailStatus === "unknown"
                        ? "Lähetä asetuslinkki uudelleen"
                        : "Lähetä salasanan asetuslinkki"
                      : "Lähetä salasanan palautuslinkki"}
                  </button>
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => void action(target, "role")}
                  >
                    {target.role === "admin"
                      ? "Poista ylläpitäjän oikeudet"
                      : "Tee ylläpitäjäksi"}
                  </button>
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={() => void action(target, "disable")}
                  >
                    Estä käyttö
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {next && (
        <button
          className="button outline"
          disabled={busy}
          onClick={() => void load(true)}
        >
          Lataa lisää
        </button>
      )}
    </section>
  );
}
