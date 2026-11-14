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
  authorizationLost,
  type EmployeeProfile,
} from "./api";
import { sessionDraftStorage } from "./drafts";
import { createDraftSession, type DraftSession } from "./draftSession";
import { readReport, reportIsEmpty } from "../reportModel";
import { flushFormDrafts } from './formDraft';
import { sanitizeEmployeeDrafts } from './employeePrivacy';
import "./report-auth.css";
const Workspace = React.lazy(() => import('./WorkWorkspace'));
const Management=React.lazy(()=>import("./AdminManagement"));
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
  const [page, setPage] = React.useState<"home" | "editor" | "employees" | "management" | "summaries">(
    "home",
  );
  const [openReportId,setOpenReportId]=React.useState<string>();
  const [legacyOpen, setLegacyOpen] = React.useState(0);
  const drafts = React.useRef(new Map<string, DraftSession>()),
    draft = React.useRef<DraftSession | null>(null),
    verifiedUid = React.useRef<string | null>(null);
  const store = React.useRef<ReturnType<typeof sessionDraftStorage> | null>(
      null,
    ),
    generation = React.useRef(0);
  const clear = React.useCallback(() => {
    draft.current?.flush();
    draft.current = null;
    store.current = null;
    verifiedUid.current = null;
    setOpenReportId(undefined);
    setProfile(null);
    setPage("home");
  }, []);
  React.useEffect(() => {
    const flush = () => {
      let success = true;
      for (const session of drafts.current.values())
        if (!session.flush()) success = false;
      return success;
    };
    const before = (event: BeforeUnloadEvent) => {
      if (!flush()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const hide = () => {
      flush();
    };
    window.addEventListener("pagehide", hide);
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("beforeunload", before);
    };
  }, []);
  const validate = React.useCallback(
    async (current: User) => {
      const version = ++generation.current;
      if (verifiedUid.current !== current.uid) setChecking(true);
      try {
        if (!navigator.onLine) throw new ReportApiError("network");
        const result = await reportRequest<{ profile: EmployeeProfile }>(
          current,
          "/session",
        );
        if (version !== generation.current) return;
        if (!result.profile?.active || result.profile.uid !== current.uid)
          throw new ReportApiError("access_disabled");
        if (!store.current || store.current.ownerUid !== current.uid)
          store.current = sessionDraftStorage(current.uid);
        if (!drafts.current.has(current.uid))
          drafts.current.set(current.uid, createDraftSession(store.current));
        draft.current = drafts.current.get(current.uid)!;
        if(result.profile.role !== 'admin') sanitizeEmployeeDrafts(current.uid,drafts.current);
        verifiedUid.current = current.uid;
        setProfile(result.profile);
        if (result.profile.role !== "admin")
          setPage((p) => (p === "employees" ? "home" : p));
      } catch (error) {
        if (version === generation.current) {
          if (authorizationLost(error)) clear();
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
      if (!current || verifiedUid.current !== current.uid) setProfile(null);
      if (!current) {
        setChecking(false);
        return;
      }
      void validate(current);
      unsubscribeProfile = onSnapshot(
        doc(reportFirebase!.db, "users", current.uid),
        (snapshot) => {
          if (reportFirebase!.auth.currentUser?.uid !== current.uid) return;
          const data = snapshot.data();
          if (snapshot.metadata.fromCache) return;
          if (!data || data.active !== true) {
            generation.current++;
            clear();
            setChecking(false);
            setMessage(
              "Käyttöoikeutesi on estetty tai sitä ei ole vielä myönnetty. Ota yhteyttä ylläpitäjään. Mahdollista paikallista luonnosta ei poistettu.",
            );
            return;
          }
          // This listener can only revoke UI access; it never grants authority without the Worker.
          if(data.role !== 'admin') sanitizeEmployeeDrafts(current.uid,drafts.current);
          setProfile((previous) =>
            previous && previous.uid === current.uid
              ? {
                  ...previous,
                  role: data.role === "admin" ? "admin" : "employee",
                  displayName:
                    typeof data.displayName === "string"
                      ? data.displayName
                      : previous.displayName,
                }
              : previous,
          );
          if (data.role !== "admin")
            setPage((p) => (p === "employees" ? "home" : p));
        },
        (error) => {
          if (
            error.code === "permission-denied" ||
            error.code === "unauthenticated"
          ) {
            generation.current++;
            clear();
            setChecking(false);
          }
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
      draft.current?.flush();
      setMessage(
        "Verkkoyhteys puuttuu. Luonnos säilyy tässä välilehdessä; paikallista muokkausta voi jatkaa aiemmin varmennetussa istunnossa.",
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
    const formsSaved = !user || flushFormDrafts(user.uid);
    if ([...drafts.current.values()].map(session => session.flush()).some(success => !success) || !formsSaved) {
      if (
        !confirm(
          "Luonnosta ei voitu tallentaa. Tiedot säilyvät vain tämän välilehden muistissa ja voivat kadota, jos suljet tai päivität välilehden. Kirjaudutaanko silti ulos?",
        )
      )
        return;
    }
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
    const targetDraft = draft.current,
      revision = targetDraft?.getSnapshot().revision;
    try {
      const fresh = await reportRequest<{ profile: EmployeeProfile }>(
        user,
        "/session",
      );
      if (fresh.profile.role !== "admin")
        throw new ReportApiError("admin_required");
      if (
        targetDraft &&
        targetDraft === draft.current &&
        revision !== undefined
      ) {
        if (targetDraft.getSnapshot().revision !== revision) {
          setMessage(
            "Luonnos muuttui. Tuonti peruttiin, jotta uusia tietoja ei korvata.",
          );
          return;
        }
        const legacy = readReport();
        if (reportIsEmpty(legacy)) {
          setMessage(
            "Tuotavaa aiempaa luonnosta ei löytynyt. Nykyisiä tietoja ei muutettu.",
          );
          return;
        }
        targetDraft.replace(legacy, revision);
        setLegacyOpen(n => n + 1);
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
        {user && profile && (
          <details className="access-retention"><summary>Tallennus ja tietosuoja</summary><p>
            Raporttitiedot ja allekirjoitus synkronoidaan pilveen. Paikallinen palautuskopio
            ja kuvat ovat tämän välilehden salaamattomassa selainmuistissa.
            Uloskirjautuminen säilyttää ne omalla käyttäjätunnuksellasi.
            Kuvat eivät siirry laitteiden välillä. Käytä henkilökohtaista laitetta.
          </p></details>
        )}
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
                {profile.role === "admin" && <><button onClick={()=>setPage("management")}>Hallinta</button><button onClick={()=>setPage("summaries")}>Yhteenvedot</button></>}
                {profile.role === "admin" && (
                  <button onClick={() => setPage("employees")}>
                    Työntekijät
                  </button>
                )}
              </nav>
            </div>
            <React.Suspense fallback={<p role="status">Ladataan…</p>}>
              {(page==="management"||page==="summaries")&&profile.role==="admin" ? <Management key={user.uid} user={user} mode={page} onOpen={id=>{setOpenReportId(id);setPage("editor");}}/> : page === "employees" && profile.role === "admin" ? (
                <AdminPanel key={user.uid} user={user} />
              ) : (
                <section className="access-dashboard" hidden={page !== 'home'}>
                  <span className="eyebrow">OMA TYÖTILA</span>
                  <h1>Hyvää työpäivää, {profile.displayName.split(" ")[0]}.</h1>
                  <p>
                    Hallitse työtehtäviä, jatka raporttia ja lähetä valmis teksti
                    tarkastettavaksi. Ylläpitäjä hyväksyy raportin ja käsittelee
                    lopulliset tiedostot sekä erikseen varmennettavan arkistoinnin.
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
                        oikeus sen tietoihin. Editorissa teksti tallentuu pilveen;
                        kuvat säilyvät tässä välilehdessä.
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
              {(page === 'home'||page==='editor') && draft.current && <Workspace initialId={openReportId} key={user.uid + ':' + legacyOpen} user={user} profile={profile} page={page} onPage={setPage} legacy={draft.current} sessions={drafts.current} />}
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
