import React from "react";
import { doc, getDoc, onSnapshot, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { reportFirebase } from "./firebase";
import { reportRequest, reportError, type EmployeeProfile } from "./api";
import { sessionDraftStorage } from "./drafts";
import { createDraftSession, type DraftSession } from "./draftSession";
import { createCloudDraft, type CloudDraft } from "./cloudDraft";
import {
  statusLabel,
  money,
  type WorkReport,
  type CatalogMaterial,
  type WorkStatus,
} from "../reportWorkModel";
import { createReportId } from "../utils";
import { reportIsEmpty } from "../reportModel";
import { useLivePages } from "./livePages";
const Editor = React.lazy(() => import("../Report"));
type Card = Pick<
  WorkReport,
  | "id"
  | "ownerUid"
  | "assignedTo"
  | "title"
  | "schedule"
  | "status"
  | "updatedAt"
> & { address?: string };
type Props = {
  user: User;
  profile: EmployeeProfile;
  page: "home" | "editor";
  onPage(page: "home" | "editor"): void;
  legacy: DraftSession;
  sessions: Map<string, DraftSession>;
};

export default function WorkWorkspace({
  user,
  profile,
  page,
  onPage,
  legacy,
  sessions,
}: Props) {
  const admin = profile.role === "admin";
  const [workPages, setWorkPages] = React.useState(1),
    [catalogPages, setCatalogPages] = React.useState(1);
  const [filter, setFilter] = React.useState({
    employee: "",
    status: "active",
    date: "",
  });
  const changeFilter = (next: typeof filter) => {
    setWorkPages(1);
    setFilter(next);
  };
  const workSources = React.useMemo(() => {
    const filters = [
      ...(filter.status === "active"
        ? [
            where("status", "in", [
              "NEW",
              "IN_PROGRESS",
              "PENDING_REVIEW",
              "RETURNED",
            ]),
          ]
        : filter.status
          ? [where("status", "==", filter.status)]
          : []),
      ...(filter.date ? [where("workDate", "==", filter.date)] : []),
    ];
    const access = admin
      ? [
          filter.employee
            ? [where("assignedTo", "array-contains", filter.employee)]
            : [],
        ]
      : [
          [where("ownerUid", "==", user.uid)],
          [where("assignedTo", "array-contains", user.uid)],
        ];
    return access.map((source) => [...source, ...filters]);
  }, [user.uid, admin, filter.employee, filter.status, filter.date]);
  const catalogSources = React.useMemo(
    () => (admin ? [[]] : [[where("active", "==", true)]]),
    [admin],
  );
  const workList = useLivePages<Card>(
    "workOrders",
    workSources,
    "updatedAt",
    "desc",
    25,
    workPages,
  );
  const materialList = useLivePages<CatalogMaterial>(
    "materialCatalog",
    catalogSources,
    "name",
    "asc",
    100,
    catalogPages,
  );
  const cards = workList.rows
    .filter((row) => row.status in statusLabel)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const catalog = materialList.rows.map((item) => ({
    ...item,
    sellingCents: Number.isSafeInteger(item.sellingCents)
      ? item.sellingCents
      : 0,
    revision: Number.isInteger(item.revision) ? item.revision : 0,
  }));
  const [recoveries, setRecoveries] = React.useState<
    Array<{ key: string; title: string; id: string }>
  >([]);
  const [people, setPeople] = React.useState<EmployeeProfile[]>([]),
    [message, setMessage] = React.useState("");
  const [selected, setSelected] = React.useState("legacy"),
    [editingOrder, setEditingOrder] = React.useState<WorkReport | null>(null);
  const [loadingOrder, setLoadingOrder] = React.useState(false);
  const [catalogOpen, setCatalogOpen] = React.useState(false);
  React.useEffect(() => {
    if (page !== "home") return;
    const rows: Array<{ key: string; title: string; id: string }> = [];
    try {
      const prefix = "kht-report2:" + user.uid + ":";
      rows.push(
        ...Object.keys(sessionStorage)
          .filter((key) => key.startsWith(prefix) && key.endsWith(":snapshot"))
          .flatMap((key) => {
            const suffix = key.slice(prefix.length),
              reportKey =
                suffix === "snapshot"
                  ? "legacy"
                  : suffix.slice(0, -":snapshot".length);
            if (
              reportKey !== "legacy" &&
              !/^KHT-\d{8}-[A-F0-9]{6}$/.test(reportKey)
            )
              return [];
            const saved = JSON.parse(sessionStorage.getItem(key) || "{}");
            if (
              !saved.customer &&
              !saved.description &&
              !saved.notes &&
              !saved.photos?.length &&
              !saved.materials?.some((row: { name?: string }) => row.name)
            )
              return [];
            return [
              {
                key: reportKey,
                id: String(saved.reportId || reportKey),
                title: String(
                  saved.customer || "Keskeneräinen paikallinen raportti",
                ),
              },
            ];
          }),
      );
    } catch {
      setMessage(
        "Paikallisten palautuskopioiden luetteloa ei voitu lukea. Selaimen luonnoksia ei poistettu.",
      );
    }
    // Include live drafts whose browser write failed; they must remain reachable before reload.
    for (const [key, session] of sessions) {
      if (key !== user.uid && !key.startsWith(user.uid + ":")) continue;
      const state = session.getSnapshot().state;
      if (!reportIsEmpty(state))
        rows.push({
          key: key === user.uid ? "legacy" : key.slice(user.uid.length + 1),
          id: state.id,
          title: state.form.customer || "Keskeneräinen paikallinen raportti",
        });
    }
    setRecoveries([...new Map(rows.map((row) => [row.key, row])).values()]);
  }, [page, user.uid, sessions]);
  React.useEffect(() => {
    if (!admin) {
      setPeople([]);
      return;
    }
    let alive = true;
    reportRequest<{ users: EmployeeProfile[] }>(user, "/employees")
      .then((result) => {
        if (alive) setPeople(result.users);
      })
      .catch((e) => {
        if (alive) setMessage(reportError(e));
      });
    return () => {
      alive = false;
    };
  }, [user, admin]);
  const getSession = (id: string) => {
    if (id === "legacy") return legacy;
    const key = user.uid + ":" + id;
    if (!sessions.has(key)) {
      const next = createDraftSession(sessionDraftStorage(user.uid, id));
      if (!next.getSnapshot().readFailed && next.getSnapshot().state.id !== id)
        next.update((state) => ({ ...state, id }));
      sessions.set(key, next);
    }
    return sessions.get(key)!;
  };
  const open = (id: string) => {
    getSession(selected).flush();
    setSelected(id);
    onPage("editor");
  };
  const active = getSession(selected);
  const visibleCards = cards;
  return (
    <div className="work-space">
      {page === "home" ? (
        <>
          <section className="work-heading">
            <h2>{admin ? "Työtilausten hallinta" : "Omat työtehtävät"}</h2>
            <button
              className="button primary"
              onClick={() => open(createReportId())}
            >
              Aloita oma raportti
            </button>
          </section>
          {!!recoveries.length && (
            <details className="work-recoveries">
              <summary>
                Paikalliset palautuskopiot ({recoveries.length})
              </summary>
              <p>
                Myös vielä pilveen tallentumattomat raportit ovat jatkettavissa
                tässä välilehdessä.
              </p>
              <ul>
                {recoveries.map((row) => (
                  <li key={row.key}>
                    <strong>{row.title}</strong> · {row.id}{" "}
                    <button
                      className="button outline"
                      onClick={() => open(row.key)}
                    >
                      Jatka paikallista kopiota
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {admin && (
            <OrderForm
              user={user}
              people={people}
              existing={editingOrder}
              loading={loadingOrder}
              onSaved={() => setEditingOrder(null)}
            />
          )}
          <div className="work-filters">
            {admin && (
              <label>
                Työntekijä
                <select
                  value={filter.employee}
                  onChange={(e) =>
                    changeFilter({ ...filter, employee: e.target.value })
                  }
                >
                  <option value="">Kaikki työntekijät</option>
                  {people.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Tila
              <select
                value={filter.status}
                onChange={(e) =>
                  changeFilter({ ...filter, status: e.target.value })
                }
              >
                <option value="active">Aktiiviset tehtävät</option>
                <option value="">Kaikki tilat</option>
                {Object.entries(statusLabel).map(([s, label]) => (
                  <option key={s} value={s}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Työn päivämäärä
              <input
                type="date"
                value={filter.date}
                onChange={(e) =>
                  changeFilter({ ...filter, date: e.target.value })
                }
              />
            </label>
          </div>
          <ul className="work-cards">
            {visibleCards.map((row) => (
              <li key={row.id}>
                <span className={"work-status status-" + row.status}>
                  {statusLabel[row.status]}
                </span>
                <h3>{row.title}</h3>
                <p>{row.address}</p>
                <p>
                  {row.schedule?.replace("T", " ") || "Ei sovittua ajankohtaa"}
                </p>
                <small>{row.id}</small>
                <div className="work-actions">
                  <button
                    className="button outline"
                    onClick={() => open(row.id)}
                  >
                    Avaa raportti
                  </button>
                  {admin &&
                    !["CANCELLED", "APPROVED", "PENDING_REVIEW"].includes(
                      row.status,
                    ) && (
                      <button
                        className="button outline"
                        disabled={loadingOrder}
                        onClick={() => {
                          setLoadingOrder(true);
                          void reportRequest<{ report: WorkReport }>(
                            user,
                            "/work",
                            { action: "load", id: row.id },
                          )
                            .then((r) => setEditingOrder(r.report))
                            .catch((e) => setMessage(reportError(e)))
                            .finally(() => setLoadingOrder(false));
                        }}
                      >
                        Muokkaa työtilausta
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
          {!visibleCards.length && <p>Ei suodatusta vastaavia työtehtäviä.</p>}
          {workList.more && (
            <button
              className="button outline"
              onClick={() => setWorkPages((n) => n + 1)}
            >
              Näytä vanhempia tehtäviä
            </button>
          )}
          <p className="work-help">
            Ladattu {cards.length} suodatusta vastaavaa tehtävää. Suodatus
            kattaa myös vanhemmat tehtävät; hakutuloksia voi ladata lisää.
          </p>
          {admin && (
            <>
              <button
                className="button outline"
                onClick={() => setCatalogOpen(!catalogOpen)}
              >
                Materiaaliluettelo
              </button>
              {catalogOpen && <CatalogAdmin user={user} items={catalog} />}
            </>
          )}
        </>
      ) : (
        <CloudEditor
          key={selected + ":" + admin}
          user={user}
          admin={admin}
          session={active}
          catalog={catalog}
          onBack={() => {
            active.flush();
            onPage("home");
          }}
          onForget={(stop) => {
            const id = active.getSnapshot().state.id;
            if (
              !confirm(
                "Poistetaanko paikallinen palautuskopio ja kuvat? Pilveen tallennettu teksti säilyy. Tallentamattomat muutokset voivat kadota.",
              )
            )
              return false;
            stop();
            onPage("home");
            if (!active.discard()) {
              setMessage(
                "Paikallista luonnosta ei voitu tyhjentää selaimesta.",
              );
              return false;
            }
            try {
              sessionStorage.removeItem(
                "kht-report2:" + user.uid + ":" + id + ":cloud",
              );
              sessionStorage.removeItem(
                "kht-report2:" +
                  user.uid +
                  ":" +
                  (selected === "legacy" ? "" : id + ":") +
                  "snapshot",
              );
            } catch {
              setMessage("Selaimen palautuskopion poistaminen epäonnistui.");
              return false;
            }
            if (selected !== "legacy")
              sessions.delete(user.uid + ":" + selected);
            setSelected("legacy");
            onPage("home");
            return true;
          }}
        />
      )}
      {materialList.more && (
        <button
          className="button outline"
          onClick={() => setCatalogPages((n) => n + 1)}
        >
          Lataa lisää luettelomateriaaleja
        </button>
      )}
      {(message || workList.error || materialList.error) && (
        <p role="alert">{message || workList.error || materialList.error}</p>
      )}
    </div>
  );
}

function CloudEditor({
  user,
  admin,
  session,
  catalog,
  onBack,
  onForget,
}: {
  user: User;
  admin: boolean;
  session: DraftSession;
  catalog: CatalogMaterial[];
  onBack(): void;
  onForget(stop: () => void): boolean;
}) {
  const [controller] = React.useState(() => {
    const id = session.getSnapshot().state.id,
      key = "kht-report2:" + user.uid + ":" + id + ":cloud";
    return createCloudDraft(
      session,
      {
        load: () =>
          reportRequest<{ report: WorkReport | null }>(user, "/work", {
            action: "load",
            id,
          }).then((r) => r.report),
        save: (revision, requestId, state) =>
          reportRequest<{ report: WorkReport }>(user, "/work", {
            action: "save",
            id,
            revision,
            requestId,
            form: state.form,
            ...(admin && state.billing ? { billing: state.billing } : {}),
          }).then((r) => r.report),
      },
      {
        getItem: () => sessionStorage.getItem(key),
        setItem: (_, value) => sessionStorage.setItem(key, value),
      },
      admin,
    );
  });
  const cloud = React.useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [comment, setComment] = React.useState(""),
    [message, setMessage] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    void controller.start();
    const online = () => void controller.retry();
    const hidden = () => {
      if (document.visibilityState === "hidden") {
        session.flush();
        void controller.save();
      }
    };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      controller.stop();
      session.flush();
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [controller, session]);
  const remoteId = cloud.remote?.id;
  React.useEffect(() => {
    if (!remoteId) return;
    return onSnapshot(
      doc(reportFirebase!.db, "reports", remoteId),
      (snapshot) => {
        if (!snapshot.metadata.fromCache && snapshot.exists())
          void controller.receive(snapshot.data() as WorkReport);
      },
      (error) => {
        if (["permission-denied", "unauthenticated"].includes(error.code))
          controller.lockAccess("report_forbidden");
        setMessage(
          "Pilvimuutosten kuuntelu keskeytyi. Paikallinen luonnos säilyy; tarkista käyttöoikeus ja yhteys.",
        );
      },
    );
  }, [remoteId, controller]);
  async function transition(status: WorkStatus) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!(await controller.save())) {
        setMessage(
          "Tallenna muutokset pilveen ja ratkaise mahdollinen ristiriita ensin.",
        );
        return;
      }
      const remote = controller.getSnapshot().remote;
      if (!remote) {
        setMessage(
          "Täydennä raportin pakolliset tiedot ennen tarkastukseen lähettämistä.",
        );
        return;
      }
      const result = await reportRequest<{ report: WorkReport }>(
        user,
        "/work",
        {
          action: "transition",
          id: remote.id,
          revision: remote.revision,
          requestId: crypto.randomUUID(),
          status,
          comment,
        },
      );
      await controller.receive(result.report);
      setComment("");
    } catch (e) {
      setMessage(reportError(e));
    } finally {
      setBusy(false);
    }
  }
  const statusCopy: Record<string, string> = {
    loading: "Avataan pilviluonnosta…",
    saved: "Tekstiluonnos tallennettu pilveen",
    dirty: "Tallentamattomia muutoksia pilveen",
    saving: "Tallennetaan pilveen…",
    offline: "Offline: paikallinen palautuskopio käytössä",
    error: "Pilvitallennus epäonnistui",
    conflict: "Samanaikaisia muutoksia – ratkaise ristiriita",
    locked: "Raportti on lukittu muokkaukselta",
  };
  const locked =
    cloud.status === "locked" ||
    (!!cloud.remote &&
      ![
        "NEW",
        "IN_PROGRESS",
        "RETURNED",
        ...(admin ? ["PENDING_REVIEW"] : []),
      ].includes(cloud.remote.status));
  return (
    <>
      <section className="cloud-toolbar">
        <button className="button outline" onClick={onBack}>
          Takaisin tehtäviin
        </button>
        <p role="status">
          {cloud.status === "saved" && !cloud.remote
            ? "Ei vielä pilveen tallennettua raporttia"
            : statusCopy[cloud.status]}
          {cloud.remote && " · " + statusLabel[cloud.remote.status]}
        </p>
        {message && <p role="alert">{message}</p>}
        {cloud.error && (
          <p role="alert">
            {cloud.error.includes(" ")
              ? cloud.error
              : reportError({ code: cloud.error })}
          </p>
        )}
        {cloud.remote?.comment && (
          <p className="work-comment">
            <strong>Ylläpitäjän kommentti:</strong> {cloud.remote.comment}
          </p>
        )}
        {["error", "offline"].includes(cloud.status) && (
          <button
            className="button outline"
            onClick={() => void controller.retry()}
          >
            Yritä pilvitallennusta uudelleen
          </button>
        )}
        {cloud.status === "conflict" && (
          <Conflict controller={controller} session={session} />
        )}
        {!locked && (
          <button
            disabled={busy}
            className="button primary"
            onClick={() => void transition("PENDING_REVIEW")}
          >
            Lähetä tarkastettavaksi
          </button>
        )}
        {admin &&
          cloud.remote &&
          !["APPROVED", "CANCELLED"].includes(cloud.remote.status) && (
            <div className="work-actions">
              <label>
                Kommentti palautukseen tai perumiseen
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                />
              </label>
              {cloud.remote.status === "PENDING_REVIEW" && (
                <button
                  className="button outline"
                  disabled={busy || !comment.trim()}
                  onClick={() => void transition("RETURNED")}
                >
                  Palauta korjattavaksi
                </button>
              )}
              <button
                className="button outline"
                disabled={busy || !comment.trim()}
                onClick={() => {
                  if (
                    confirm(
                      "Perutaanko työtilaus? Raportti ja auditointitiedot säilyvät.",
                    )
                  )
                    void transition("CANCELLED");
                }}
              >
                Peru työtilaus
              </button>
            </div>
          )}
        {locked && (
          <button
            className="button outline"
            onClick={() =>
              void import("../pdf").then(({ createPdf }) =>
                createPdf(session.getSnapshot().state),
              )
            }
          >
            Lataa tallennettu PDF
          </button>
        )}
      </section>
      {!["report_forbidden", "access_disabled", "invalid_session"].includes(
        cloud.error,
      ) && (
        <Editor
          draftSession={session}
          cloudMode
          catalog={catalog}
          admin={admin}
          readOnly={locked || cloud.status === "loading"}
          cloudSave={() => void controller.save()}
          onDiscardLocal={() => {
            onForget(controller.stop);
          }}
        />
      )}
    </>
  );
}
function Conflict({
  controller,
  session,
}: {
  controller: CloudDraft;
  session: DraftSession;
}) {
  const [error, setError] = React.useState("");
  const resolve = async (local: boolean) => {
    if (
      !confirm(
        local
          ? "Korvataanko uusin pilviteksti tällä paikallisella tekstillä? Tarkista molemmat versiot ensin."
          : "Korvataanko paikallinen teksti pilviversiolla? Lataa paikallinen palautuskopio ensin. Kuvat säilyvät tässä välilehdessä.",
      )
    )
      return;
    try {
      await controller.resolve(local);
    } catch (e) {
      setError(reportError(e));
    }
  };
  return (
    <div className="work-conflict" role="alert">
      <p>
        Paikallista tekstiä ei korvattu. Vertaa versioita ja tallenna
        tarvittaessa palautuskopio. Palautuskopio sisältää asiakastietoja.
      </p>
      <details>
        <summary>Näytä uusin pilviteksti</summary>
        <pre>
          {JSON.stringify(controller.getSnapshot().remote?.form, null, 2)}
        </pre>
      </details>
      <button
        className="button outline"
        onClick={() => {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(
            new Blob([JSON.stringify(session.getSnapshot().state)], {
              type: "application/json",
            }),
          );
          link.download =
            session.getSnapshot().state.id + "-palautuskopio.json";
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }}
      >
        Lataa paikallinen palautuskopio
      </button>
      <button className="button outline" onClick={() => void resolve(false)}>
        Käytä pilviversiota
      </button>
      <button className="button outline" onClick={() => void resolve(true)}>
        Säilytä paikallinen teksti pilvessä
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}

function OrderForm({
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
  const initial = () => ({
    customer: existing?.form.customer || "",
    address: existing?.form.address || "",
    description: existing?.form.description || "",
    schedule: existing?.schedule || "",
    quotationReference: existing?.quotationReference || "",
    assignedTo: existing?.assignedTo || [user.uid],
  });
  const [value, setValue] = React.useState(initial),
    [busy, setBusy] = React.useState(false),
    [message, setMessage] = React.useState("");
  const operation = React.useRef({
    id: createReportId(),
    requestId: crypto.randomUUID(),
  });
  React.useEffect(() => {
    setValue(initial());
    operation.current = {
      id: existing?.id || createReportId(),
      requestId: crypto.randomUUID(),
    };
    setMessage("");
  }, [existing]);
  return (
    <details className="work-order-form" open={existing ? true : undefined}>
      <summary>
        {existing ? "Muokkaa työtilausta ja vastuuhenkilöitä" : "Luo työtilaus"}
      </summary>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setMessage("");
          try {
            await reportRequest(user, "/work", {
              action: existing ? "order" : "createOrder",
              ...operation.current,
              ...(existing ? { revision: existing.revision } : {}),
              ...value,
            });
            setMessage(existing ? "Työtilaus päivitetty." : "Työtilaus luotu.");
            setValue({
              customer: "",
              address: "",
              description: "",
              schedule: "",
              quotationReference: "",
              assignedTo: [user.uid],
            });
            operation.current = {
              id: createReportId(),
              requestId: crypto.randomUUID(),
            };
            onSaved();
          } catch (e) {
            setMessage(reportError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {loading && <p role="status">Avataan työtilausta…</p>}
        <fieldset disabled={busy || loading}>
          <legend>{existing ? existing.id : "Uusi työtilaus"}</legend>
          {(
            [
              "customer",
              "address",
              "description",
              "schedule",
              "quotationReference",
            ] as const
          ).map((key, i) => (
            <label key={key}>
              {
                [
                  "Asiakkaan nimi",
                  "Kohteen osoite",
                  "Työtilauksen kuvaus",
                  "Sovittu ajankohta",
                  "Tarjouspyynnön viite (valinnainen)",
                ][i]
              }
              {key === "description" ? (
                <textarea
                  required
                  value={value[key]}
                  maxLength={6000}
                  onChange={(e) =>
                    setValue({ ...value, [key]: e.target.value })
                  }
                />
              ) : (
                <input
                  required={i < 2}
                  type={key === "schedule" ? "datetime-local" : "text"}
                  value={value[key]}
                  maxLength={key === "quotationReference" ? 40 : 500}
                  onChange={(e) =>
                    setValue({ ...value, [key]: e.target.value })
                  }
                />
              )}
            </label>
          ))}
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
                      setValue({
                        ...value,
                        assignedTo: e.target.checked
                          ? [...value.assignedTo, p.uid]
                          : value.assignedTo.filter((uid) => uid !== p.uid),
                      })
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
            {existing ? "Tallenna työtilaus" : "Luo työtilaus"}
          </button>
          {existing && (
            <button type="button" className="button outline" onClick={onSaved}>
              Sulje muokkaus
            </button>
          )}
        </fieldset>
      </form>
      {message && <p role="status">{message}</p>}
    </details>
  );
}

function CatalogAdmin({
  user,
  items,
}: {
  user: User;
  items: CatalogMaterial[];
}) {
  const blank = () => ({
    id: crypto.randomUUID() as string,
    revision: 0,
    name: "",
    code: "",
    unit: "kpl",
    sellingCents: 0,
    purchaseCents: null as number | null,
    active: true,
  });
  const [value, setValue] = React.useState(blank),
    [message, setMessage] = React.useState(""),
    [busy, setBusy] = React.useState(false);
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
              onClick={async () => {
                setBusy(true);
                try {
                  const costs = await getDoc(
                    doc(reportFirebase!.db, "materialCosts", item.id),
                  );
                  setValue({
                    id: item.id,
                    revision: item.revision,
                    name: item.name,
                    code: item.code,
                    unit: item.unit,
                    sellingCents: item.sellingCents,
                    active: item.active,
                    purchaseCents: costs.data()?.purchaseCents ?? null,
                  });
                } catch (e) {
                  setMessage(reportError(e));
                } finally {
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
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          try {
            await reportRequest(user, "/work", {
              action: "material",
              ...value,
              requestId: crypto.randomUUID(),
            });
            setValue(blank());
            setMessage("Materiaali tallennettu.");
          } catch (e) {
            setMessage(reportError(e));
          } finally {
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
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              />
            </label>
          ))}
          {(["sellingCents", "purchaseCents"] as const).map((key, i) => (
            <label key={key}>
              {
                [
                  "Myyntihinta alv 0 % (€)",
                  "Ostohinta alv 0 % (€), valinnainen",
                ][i]
              }
              <input
                type="number"
                min="0"
                step="0.01"
                value={value[key] === null ? "" : value[key]! / 100}
                onChange={(e) =>
                  setValue({
                    ...value,
                    [key]:
                      e.target.value === "" && key === "purchaseCents"
                        ? null
                        : Math.round(Number(e.target.value) * 100),
                  })
                }
              />
            </label>
          ))}
          <label className="work-checkbox">
            <input
              type="checkbox"
              checked={value.active}
              onChange={(e) => setValue({ ...value, active: e.target.checked })}
            />
            Käytössä
          </label>
          <button className="button primary">Tallenna materiaali</button>
          <button
            type="button"
            className="button outline"
            onClick={() => setValue(blank())}
          >
            Uusi materiaali
          </button>
        </fieldset>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
