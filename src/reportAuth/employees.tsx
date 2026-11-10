import React from "react";
import type { User } from "firebase/auth";
import { reportRequest, reportError, type EmployeeProfile } from "./api";
export default function Employees({ user }: { user: User }) {
  const [users, setUsers] = React.useState<EmployeeProfile[]>([]),
    [next, setNext] = React.useState<string | undefined>(),
    [busy, setBusy] = React.useState(false),
    [message, setMessage] = React.useState("");
  const [name, setName] = React.useState(""),
    [email, setEmail] = React.useState("");
  const requests = React.useRef(new Map<string, string>());
  async function load(more = false) {
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
    } catch (error) {
      setMessage(reportError(error));
    } finally {
      setBusy(false);
    }
  }
  React.useEffect(() => {
    void load();
  }, []);
  function requestId(key: string) {
    if (!requests.current.has(key))
      requests.current.set(key, crypto.randomUUID());
    return requests.current.get(key)!;
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const key = "create:" + email.trim().toLowerCase() + ":" + name.trim();
    try {
      await reportRequest(user, "/employees", {
        requestId: requestId(key),
        email: email.trim(),
        displayName: name.trim(),
      });
      requests.current.delete(key);
      setName("");
      setEmail("");
      setMessage(
        "Työntekijä luotu. Lähetä seuraavaksi salasanan palautusohje.",
      );
      await load();
    } catch (error) {
      setMessage(reportError(error));
    } finally {
      setBusy(false);
    }
  }
  async function action(
    target: EmployeeProfile,
    kind: "role" | "disable" | "reset",
  ) {
    if (busy) return;
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
    setBusy(true);
    setMessage("");
    const key = kind + ":" + target.uid + ":" + (kind === "role" ? role : "");
    try {
      await reportRequest(user, "/employees/action", {
        requestId: requestId(key),
        action: kind,
        uid: target.uid,
        ...(kind === "role" ? { role } : {}),
      });
      requests.current.delete(key);
      setMessage(
        kind === "reset"
          ? "Palautuspyyntö on hyväksytty sähköpostipalveluun."
          : "Käyttöoikeus päivitetty.",
      );
      await load();
    } catch (error) {
      setMessage(reportError(error));
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
      <form onSubmit={create}>
        <h2>Lisää työntekijä</h2>
        <label>
          Nimi
          <input
            value={name}
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
            maxLength={160}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button className="button primary" disabled={busy}>
          Luo työntekijä
        </button>
      </form>
      {message && (
        <p role="status" className="access-message">
          {message}
        </p>
      )}
      <ul className="access-user-list">
        {users.map((target) => (
          <li key={target.uid}>
            <div>
              <strong>{target.displayName}</strong>
              <span>{target.email}</span>
              <span>
                {target.active
                  ? target.role === "admin"
                    ? "Ylläpitäjä"
                    : "Työntekijä"
                  : "Käyttö estetty"}
              </span>
            </div>
            {target.active && (
              <div className="access-user-actions">
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => void action(target, "reset")}
                >
                  Lähetä palautusohje
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
              </div>
            )}
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
