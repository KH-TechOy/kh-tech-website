import React from "react";
import { doc, onSnapshot, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { reportFirebase } from "./firebase";
import { reportRequest, reportError, type EmployeeProfile } from "./api";
import { sessionDraftStorage } from "./drafts";
import { createDraftSession, type DraftSession } from "./draftSession";
import { createCloudDraft, type CloudDraft } from "./cloudDraft";
import {
  statusLabel,
  type WorkReport,
  type CatalogMaterial,
  type WorkStatus,
} from "../reportWorkModel";
import { createReportId } from "../utils";
import { reportIsEmpty } from "../reportModel";
import { useLivePages } from "./livePages";
import { OrderForm, CatalogAdmin } from "./WorkForms";
import { FormDraftNotice, useFormDraft } from "./useFormDraft";
import { unfinishedFormIds } from "./formDraft";
import { finnishDate, isoDate, scheduleLabel } from "../reportLocale";
import { dateEntry } from "../reportDateInputs";
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
  const unfinishedOrders = admin
    ? unfinishedFormIds(user.uid).filter((id) =>
        /^order:KHT-\d{8}-[A-F0-9]{6}$/.test(id),
      )
    : [];
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
              key={editingOrder?.id || "new"}
              user={user}
              people={people}
              existing={editingOrder}
              loading={loadingOrder}
              onSaved={() => setEditingOrder(null)}
            />
          )}
          {!!unfinishedOrders.length && (
            <details className="work-recoveries">
              <summary>
                Keskeneräiset työtilausmuokkaukset ({unfinishedOrders.length})
              </summary>
              <ul>
                {unfinishedOrders.map((identity) => (
                  <li key={identity}>
                    {identity.slice(6)}{" "}
                    <button
                      className="button outline"
                      disabled={loadingOrder}
                      onClick={() => {
                        setLoadingOrder(true);
                        void reportRequest<{ report: WorkReport }>(
                          user,
                          "/work",
                          { action: "load", id: identity.slice(6) },
                        )
                          .then((result) => {
                            if (result.report) setEditingOrder(result.report);
                          })
                          .catch((e) => setMessage(reportError(e)))
                          .finally(() => setLoadingOrder(false));
                      }}
                    >
                      Jatka työtilauksen muokkausta
                    </button>
                  </li>
                ))}
              </ul>
            </details>
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
                type="text"
                inputMode="numeric"
                placeholder="pp.kk.vvvv"
                value={finnishDate(filter.date)}
                onChange={(e) =>
                  changeFilter({
                    ...filter,
                    date:
                      isoDate(dateEntry(e.target.value)) ||
                      dateEntry(e.target.value),
                  })
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
                <p>{scheduleLabel(row.schedule)}</p>
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
  const commentDraft = useFormDraft(
    user.uid,
    "comment:" + session.getSnapshot().state.id,
    () => ({ comment: "" }),
  );
  const comment = commentDraft.value.comment;
  const [message, setMessage] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  const transitioning = React.useRef(false);
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
    if (transitioning.current) return;
    if (status === "PENDING_REVIEW") {
      const invalid = document.querySelector<HTMLInputElement>(
        ".report-page input:invalid",
      );
      if (invalid) {
        invalid.reportValidity();
        invalid.focus();
        return;
      }
    }
    transitioning.current = true;
    setBusy(true);
    setMessage("");
    const commentRevision = commentDraft.draft.getSnapshot().revision;
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
      commentDraft.draft.clear({ comment: "" }, commentRevision);
    } catch (e) {
      setMessage(reportError(e));
    } finally {
      transitioning.current = false;
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
  const workflow = (bottom = false) => (
    <section
      className={bottom ? "workflow-bottom" : "cloud-toolbar"}
      data-workflow={bottom ? "bottom" : "top"}
      aria-label={
        bottom ? "Raportin työnkulku lopussa" : "Raportin työnkulku alussa"
      }
    >
      {bottom && <h2>Raportin työnkulku</h2>}
      {!bottom && (
        <button className="button outline" onClick={onBack}>
          Takaisin tehtäviin
        </button>
      )}
      <p role="status">
        {cloud.status === "saved" && !cloud.remote
          ? "Ei vielä pilveen tallennettua raporttia"
          : statusCopy[cloud.status]}
        {cloud.remote && (
          <span className={"work-status status-" + cloud.remote.status}>
            {statusLabel[cloud.remote.status]}
          </span>
        )}
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
      {!bottom && cloud.status === "conflict" && (
        <Conflict controller={controller} session={session} />
      )}
      {!locked &&
        (!cloud.remote ||
          ["NEW", "IN_PROGRESS", "RETURNED"].includes(cloud.remote.status)) && (
          <button
            disabled={busy || cloud.status === "loading"}
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
                aria-label="Kommentti palautukseen tai perumiseen"
                value={comment}
                onChange={(e) =>
                  commentDraft.setValue({ comment: e.target.value })
                }
                onBlur={() => commentDraft.draft.flush()}
                disabled={busy}
                maxLength={2000}
              />
            </label>
            <FormDraftNotice draft={commentDraft.draft} />
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
      {!bottom && locked && (
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
  );
  return (
    <>
      {workflow()}
      {!["report_forbidden", "access_disabled", "invalid_session"].includes(
        cloud.error,
      ) && (
        <Editor
          draftSession={session}
          cloudMode
          catalog={catalog}
          admin={admin}
          readOnly={locked || cloud.status === "loading" || busy}
          ownerUid={user.uid}
          cloudSave={() => void controller.save()}
          onDiscardLocal={() => {
            onForget(controller.stop);
          }}
        />
      )}
      {!["report_forbidden", "access_disabled", "invalid_session"].includes(
        cloud.error,
      ) && workflow(true)}
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
