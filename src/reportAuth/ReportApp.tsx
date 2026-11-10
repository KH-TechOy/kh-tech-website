import React from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { Brand, company, url } from "../brand";
import { reportConfigured, reportFirebase } from "./firebase";
import {
  reportRequest,
  reportError,
  ReportApiError,
  type EmployeeProfile,
} from "./api";
import { clearSessionDrafts, sessionDraftStorage } from "./drafts";
import { readReport, saveReport } from "../reportModel";
import "./report-auth.css";
const Editor = React.lazy(() => import("../Report"));
const AdminPanel = React.lazy(() => import("./employees"));

export default function ReportApp() {
  const [user, setUser] = React.useState<User | null>(null),
    [profile, setProfile] = React.useState<EmployeeProfile | null>(null);
  const [checking, setChecking] = React.useState(!!reportFirebase),
    [busy, setBusy] = React.useState(false),
    [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState(""),
    [password, setPassword] = React.useState(""),
    [reset, setReset] = React.useState(false);
  const [page, setPage] = React.useState<"home" | "editor" | "employees">(
      "home",
    ),
    [editorKey, setEditorKey] = React.useState(0);
  const store = React.useRef<ReturnType<typeof sessionDraftStorage> | null>(
      null,
    ),
    generation = React.useRef(0);
  const clear = React.useCallback(() => {
    store.current?.close();
    store.current = null;
    clearSessionDrafts();
    setProfile(null);
    setPage("home");
  }, []);
  const validate = React.useCallback(
    async (current: User) => {
      const version = ++generation.current;
      setChecking(true);
      try {
        if (!navigator.onLine) throw new ReportApiError("network");
        const result = await reportRequest<{ profile: EmployeeProfile }>(
          current,
          "/session",
        );
        if (version !== generation.current) return;
        if (!result.profile?.active || result.profile.uid !== current.uid)
          throw new ReportApiError("access_disabled");
        if (!store.current) store.current = sessionDraftStorage(current.uid);
        setProfile(result.profile);
        if (result.profile.role !== "admin")
          setPage((p) => (p === "employees" ? "home" : p));
      } catch (error) {
        if (version === generation.current) {
          if (
            error instanceof ReportApiError &&
            ["access_disabled", "invalid_session"].includes(error.code)
          )
            clear();
          else {
            setProfile(null);
            setPage("home");
          }
          setMessage(reportError(error));
        }
      } finally {
        if (version === generation.current) setChecking(false);
      }
    },
    [clear],
  );
  React.useEffect(() => {
    if (!reportFirebase) return;
    let unsubscribeProfile: undefined | (() => void);
    const stop = onAuthStateChanged(reportFirebase.auth, (current) => {
      generation.current++;
      unsubscribeProfile?.();
      if (!current || (store.current && store.current.ownerUid !== current.uid))
        clear();
      setUser(current);
      setProfile(null);
      if (!current) {
        setChecking(false);
        return;
      }
      void validate(current);
      unsubscribeProfile = onSnapshot(
        doc(reportFirebase!.db, "users", current.uid),
        (snapshot) => {
          const data = snapshot.data();
          if (!data || data.active !== true) {
            generation.current++;
            clear();
            setChecking(false);
            setMessage(
              "Käyttöoikeutesi on estetty tai sitä ei ole vielä myönnetty. Ota yhteyttä ylläpitäjään.",
            );
            return;
          }
          // This listener can only revoke UI access; it never grants authority without the Worker.
          setProfile((previous) =>
            previous && data.role !== previous.role
              ? {
                  ...previous,
                  role: data.role === "admin" ? "admin" : "employee",
                }
              : previous,
          );
          if (data.role !== "admin")
            setPage((p) => (p === "employees" ? "home" : p));
        },
        () => {
          generation.current++;
          clear();
          setChecking(false);
          setMessage(
            "Istunnon käyttöoikeutta ei voitu varmistaa. Kirjaudu uudelleen.",
          );
        },
      );
    });
    const refresh = () => {
      const current = reportFirebase!.auth.currentUser;
      if (current) void validate(current);
    };
    const visibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const offline = () => {
      generation.current++;
      setProfile(null);
      setPage("home");
      setChecking(false);
      setMessage(
        "Verkkoyhteys puuttuu. Yhdistä verkkoon ja varmista istunto uudelleen. Istuntoluonnos säilyy tässä välilehdessä.",
      );
    };
    const timer = setInterval(refresh, 300000);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stop();
      unsubscribeProfile?.();
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [clear, validate]);
  async function logout() {
    generation.current++;
    clear();
    setPassword("");
    setMessage("");
    try {
      await signOut(reportFirebase!.auth);
    } catch (error) {
      setMessage(reportError(error));
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !reportFirebase) return;
    setMessage("");
    if (!email.trim() || (!reset && !password)) {
      setMessage(
        "Anna sähköpostiosoitteesi" + (reset ? "." : " ja salasanasi."),
      );
      return;
    }
    setBusy(true);
    try {
      if (reset) {
        await sendPasswordResetEmail(reportFirebase.auth, email.trim());
        setMessage(
          "Jos osoitteella on käyttäjätili, saat ohjeet salasanan palauttamiseen.",
        );
      } else {
        await signInWithEmailAndPassword(
          reportFirebase.auth,
          email.trim(),
          password,
        );
        setPassword("");
      }
    } catch (error) {
      setMessage(
        reset && (error as { code?: string })?.code === "auth/user-not-found"
          ? "Jos osoitteella on käyttäjätili, saat ohjeet salasanan palauttamiseen."
          : reportError(error),
      );
    } finally {
      setBusy(false);
    }
  }
  async function importLegacy() {
    if (
      !user ||
      profile?.role !== "admin" ||
      !confirm(
        "Tuo tämän selaimen vanha yhteinen luonnos omaan istuntoosi vain, jos se kuuluu yritykselle ja sinulla on oikeus sen tietoihin. Korvataanko nykyinen istuntoluonnos?",
      )
    )
      return;
    setBusy(true);
    try {
      const fresh = await reportRequest<{ profile: EmployeeProfile }>(
        user,
        "/session",
      );
      if (fresh.profile.role !== "admin")
        throw new ReportApiError("admin_required");
      if (store.current) {
        saveReport(readReport(), store.current);
        setEditorKey((k) => k + 1);
        setPage("editor");
      }
    } catch (error) {
      setMessage(reportError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="report-access">
      <header className="access-header">
        <a href={url()} aria-label="KH-Tech Oy – etusivu">
          <Brand />
        </a>
        <span>HENKILÖSTÖN TYÖRAPORTIT</span>
        {user && (
          <button className="button outline" onClick={() => void logout()}>
            Kirjaudu ulos
          </button>
        )}
      </header>
      <main id="report-access-content">
        {!reportConfigured ? (
          <section className="access-login">
            <h1>Henkilöstön kirjautuminen</h1>
            <p>
              Palvelun käyttöönotto on kesken. Raportteja ei voi avata ilman
              henkilöstöistunnon varmennusta.
            </p>
            <a href={"mailto:" + company.email}>Ota yhteyttä ylläpitoon</a>
          </section>
        ) : checking ? (
          <section className="access-login" role="status">
            <h1>Varmistetaan istuntoa…</h1>
            <p>Odota hetki.</p>
          </section>
        ) : !user || !profile ? (
          <section className="access-login">
            <span className="eyebrow">KH-TECH OY · HENKILÖSTÖ</span>
            <h1>{reset ? "Palauta salasana" : "Kirjaudu työraportteihin"}</h1>
            <p>Jokaisella työntekijällä on oma käyttäjätili.</p>
            {user ? (
              <>
                <p>Käyttöoikeuttasi ei voitu varmistaa.</p>
                <button
                  className="button primary"
                  onClick={() => void validate(user)}
                >
                  Tarkista istunto uudelleen
                </button>
              </>
            ) : (
              <form onSubmit={submit} noValidate>
                <label>
                  Sähköposti
                  <input
                    type="email"
                    value={email}
                    maxLength={160}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </label>
                {!reset && (
                  <label>
                    Salasana
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                )}
                <button className="button primary" disabled={busy}>
                  {busy
                    ? "Odota…"
                    : reset
                      ? "Lähetä palautusohje"
                      : "Kirjaudu sisään"}
                </button>
                <button
                  type="button"
                  className="access-link"
                  onClick={() => {
                    setReset(!reset);
                    setMessage("");
                    setPassword("");
                  }}
                >
                  {reset ? "Takaisin kirjautumiseen" : "Unohditko salasanasi?"}
                </button>
              </form>
            )}
          </section>
        ) : (
          <>
            <div className="access-toolbar">
              <div>
                <strong>{profile.displayName}</strong>
                <span>
                  {profile.role === "admin" ? "Ylläpitäjä" : "Työntekijä"}
                </span>
              </div>
              <nav aria-label="Työraporttien valikko">
                <button onClick={() => setPage("home")}>Etusivu</button>
                <button onClick={() => setPage("editor")}>
                  Raporttieditori
                </button>
                {profile.role === "admin" && (
                  <button onClick={() => setPage("employees")}>
                    Työntekijät
                  </button>
                )}
              </nav>
            </div>
            <React.Suspense fallback={<p role="status">Ladataan…</p>}>
              {page === "editor" && store.current ? (
                <Editor
                  key={user.uid + editorKey}
                  draftStorage={store.current}
                />
              ) : page === "employees" && profile.role === "admin" ? (
                <AdminPanel user={user} />
              ) : (
                <section className="access-dashboard">
                  <span className="eyebrow">OMA TYÖTILA</span>
                  <h1>Hyvää työpäivää, {profile.displayName.split(" ")[0]}.</h1>
                  <p>
                    Voit laatia työraportin ja ladata PDF:n. Työtilausten,
                    pilviraporttien ja arkiston työnkulut otetaan käyttöön
                    seuraavassa vaiheessa.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setPage("editor")}
                  >
                    Avaa raporttieditori
                  </button>
                  {profile.role === "admin" && (
                    <details className="access-legacy">
                      <summary>Aiempi paikallinen luonnos</summary>
                      <p>
                        Vanha tämän selaimen luonnos on yhteinen eikä sen
                        omistajaa ole varmennettu. Tuo se vain, jos sinulla on
                        oikeus sen tietoihin. Se ei siirry pilveen.
                      </p>
                      <button
                        className="button outline"
                        disabled={busy}
                        onClick={() => void importLegacy()}
                      >
                        Tuo vanha luonnos omaan istuntoon
                      </button>
                    </details>
                  )}
                </section>
              )}
            </React.Suspense>
          </>
        )}
        {message && (
          <p className="access-message" role="status">
            {message}
          </p>
        )}
      </main>
    </div>
  );
}
