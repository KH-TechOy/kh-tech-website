import React from "react";
import type { User } from "firebase/auth";
import { reportRequest, reportError, type EmployeeProfile } from "./api";
import { statusLabel, money, type WorkReport } from "../reportWorkModel";
import { summarize, summaryCsv, type SummaryRow } from "../reportSummary";
import { createReportId } from "../utils";
import { finnishDate, helsinkiToday, isoDate } from "../reportLocale";
import { dateEntry } from "../reportDateInputs";
import { useFormDraft, FormDraftNotice } from "./useFormDraft";
type Row = {
  report?: WorkReport;
  summary?: SummaryRow;
  archive?: { status?: string };
  retention?: {
    eligible: boolean;
    eligibleAt: string;
    minimumDays: number;
  } | null;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  schedule?: string;
  status?: string;
  removedAt?: string;
  reportId?: string;
  unavailable?: boolean;
};
type Policy = {
  revision: number;
  policies: {
    version: string;
    minimumDays: number;
    effectiveFrom: string;
    reason: string;
    at: string;
  }[];
};
const emptyQuote = {
  reference: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  description: "",
  schedule: "",
};
function download(data: Blob, name: string) {
  const u = URL.createObjectURL(data),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export default function AdminManagement({
  user,
  mode,
  onOpen,
}: {
  user: User;
  mode: "management" | "summaries";
  onOpen(id: string): void;
}) {
  const [tab, setTab] = React.useState<
    | "reports"
    | "quotationRequests"
    | "retention"
    | "archiveMetadata"
    | "deletionReview"
  >("reports");
  const [filters, setFilters] = React.useState({
    from: "",
    to: "",
    status: "",
    employee: "",
    search: "",
  });
  const [rows, setRows] = React.useState<Row[]>([]),
    [token, setToken] = React.useState(""),
    [started, setStarted] = React.useState(false),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState("");
  const [settings, setSettings] = React.useState<Policy | null>(null),
    [days, setDays] = React.useState(""),
    [effective, setEffective] = React.useState(helsinkiToday()),
    [reason, setReason] = React.useState(""),
    [reviewed, setReviewed] = React.useState(false);
  const [people, setPeople] = React.useState<EmployeeProfile[]>([]),
    [peopleToken, setPeopleToken] = React.useState("");
  const quoteDraft = useFormDraft(user.uid, "quotation-import", () => ({
    ...emptyQuote,
  }));
  const quote = quoteDraft.value,
    setQuote = quoteDraft.setValue;
  const [preview, setPreview] = React.useState("");
  React.useEffect(() => {
    let alive = true;
    void reportRequest<{ users: EmployeeProfile[]; nextPageToken?: string }>(
      user,
      "/employees",
    )
      .then((r) => {
        if (alive) {
          setPeople(r.users);
          setPeopleToken(r.nextPageToken || "");
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);
  React.useEffect(() => {
    setTab("reports");
    setFilters({
      from: "",
      to: "",
      status: mode === "summaries" ? "APPROVED" : "",
      employee: "",
      search: "",
    });
  }, [mode]);
  const person = (uid: string) =>
    people.find((p) => p.uid === uid)?.displayName || "Tuntematon työntekijä";
  const selectionKey = JSON.stringify({ filters, tab, mode });
  const queryKey = React.useRef(selectionKey);
  queryKey.current = selectionKey;
  const epoch = React.useRef(0),
    lock = React.useRef(false);
  React.useEffect(() => {
    epoch.current++;
    setRows([]);
    setToken("");
    setStarted(false);
    setError("");
    setPreview("");
  }, [filters, tab, mode, user.uid]);
  React.useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );
  React.useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);
  const execute = async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(reportError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const load = async (more = false) => {
    if (queryKey.current !== selectionKey) return;
    const version = epoch.current;
    const r = await reportRequest<{ rows: Row[]; nextPageToken: string }>(
      user,
      "/management",
      {
        action: "list",
        collection:
          mode === "summaries" || tab === "deletionReview" ? "reports" : tab,
        pageToken: more ? token : "",
        filters: {
          ...filters,
          ...(tab === "deletionReview" && mode === "management"
            ? { deletionReview: true }
            : {}),
        },
      },
    );
    if (version !== epoch.current || queryKey.current !== selectionKey) return;
    setRows((old) => (more ? [...old, ...r.rows] : r.rows));
    setToken(r.nextPageToken);
    setStarted(true);
  };
  const policy = async () => {
    const r = await reportRequest<{ settings: Policy | null }>(
      user,
      "/management",
      { action: "policy" },
    );
    setSettings(r.settings);
  };
  const summaryRows = rows.flatMap((r) => (r.summary ? [r.summary] : [])),
    s = summarize(summaryRows);
  const filterLabel = [
    filters.from || "Alusta",
    filters.to || "tähän päivään",
    filters.status
      ? statusLabel[filters.status as keyof typeof statusLabel] ||
        filters.status
      : "Kaikki tilat",
    filters.employee || "Kaikki työntekijät",
    filters.search,
  ]
    .filter(Boolean)
    .join(" · ");
  const complete =
    started && !token && !s.overflow && !rows.some((r) => r.unavailable);
  const period = (kind: string) => {
    const now = new Date(),
      local = (d: Date) =>
        new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10);
    let from = new Date(now),
      to = new Date(now);
    if (kind === "week") {
      const n = (now.getDay() + 6) % 7;
      from.setDate(now.getDate() - n);
      to = new Date(from);
      to.setDate(from.getDate() + 6);
    }
    if (kind === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    if (kind === "year") {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    }
    setFilters((f) => ({ ...f, from: local(from), to: local(to) }));
  };
  const decision = async (row: Row, choice: "accept" | "reject") => {
    const why = choice === "reject" ? prompt("Hylkäyksen syy") : "";
    if (choice === "reject" && !why) return;
    if (
      !confirm(
        choice === "accept"
          ? "Muunna pyyntö työtilaukseksi? Työntekijä valitaan myöhemmin."
          : "Hylätäänkö tarjouspyyntö?",
      )
    )
      return;
    await reportRequest(user, "/management", {
      action: "quoteDecision",
      reference: row.id,
      decision: choice,
      reason: why || "",
      targetId: createReportId(),
    });
    await load();
  };
  return (
    <section className="admin-management" aria-busy={busy}>
      <h1>{mode === "summaries" ? "Yhteenvedot" : "Työn hallinta"}</h1>
      {mode === "management" && (
        <nav className="management-tabs" aria-label="Hallinnan osiot">
          {(
            [
              ["reports", "Työt"],
              ["archiveMetadata", "Arkistoidut"],
              ["deletionReview", "Poiston tarkistus"],
              ["quotationRequests", "Tarjouspyynnöt"],
              ["retention", "Säilytysasetukset"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              aria-pressed={tab === k}
              onClick={() => {
                setTab(k);
                setFilters({
                  from: "",
                  to: "",
                  status: k === "archiveMetadata" ? "ARCHIVE_CONFIRMED" : "",
                  employee: "",
                  search: "",
                });
                if (k === "retention") void execute(policy);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {tab !== "retention" || mode === "summaries" ? (
        <>
          {mode === "summaries" && (
            <>
              <p>
                Laskutuksen valmistelu. Summat eivät ole maksettua liikevaihtoa.
                Hyväksytyt raportit perustuvat lukittuun hyväksyntäversioon.
              </p>
              <div className="work-actions">
                {[
                  ["week", "Tämä viikko"],
                  ["month", "Tämä kuukausi"],
                  ["year", "Tämä vuosi"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className="button outline"
                    onClick={() => period(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
          <form
            className="management-filters"
            onSubmit={(e) => {
              e.preventDefault();
              void execute(() => load());
            }}
          >
            <label>
              Alkaen
              <input
                type="text"
                inputMode="numeric"
                placeholder="pp.kk.vvvv"
                value={finnishDate(filters.from)}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    from:
                      isoDate(dateEntry(e.target.value)) ||
                      dateEntry(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              Asti
              <input
                type="text"
                inputMode="numeric"
                placeholder="pp.kk.vvvv"
                value={finnishDate(filters.to)}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    to:
                      isoDate(dateEntry(e.target.value)) ||
                      dateEntry(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              Tila
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value }))
                }
              >
                <option value="">Kaikki</option>
                {mode === "management" && tab === "reports" && (
                  <option value="active">Aktiiviset työt</option>
                )}
                {tab === "quotationRequests" && mode === "management"
                  ? ["NEW", "ACCEPTED", "REJECTED"].map((v, i) => (
                      <option key={v} value={v}>
                        {["Uusi", "Hyväksytty tilaukseksi", "Hylätty"][i]}
                      </option>
                    ))
                  : tab === "archiveMetadata" && mode === "management"
                    ? [
                        ["ARCHIVE_CONFIRMED", "Arkistoitu"],
                        ["WORK_REMOVED", "Poistettu työ"],
                      ].map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))
                    : Object.entries(statusLabel).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
              </select>
            </label>
            <label>
              Hae asiakasta tai työtä
              <input
                type="search"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
                maxLength={200}
              />
            </label>
            {mode === "summaries" && (
              <label>
                Työntekijä
                <select
                  value={filters.employee}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, employee: e.target.value }))
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
            <button className="button primary" disabled={busy}>
              Näytä tulokset
            </button>
          </form>
          {peopleToken && (
            <button
              className="button outline"
              disabled={busy}
              onClick={() =>
                void execute(async () => {
                  const r = await reportRequest<{
                    users: EmployeeProfile[];
                    nextPageToken?: string;
                  }>(
                    user,
                    "/employees?pageToken=" + encodeURIComponent(peopleToken),
                  );
                  setPeople((p) => [...p, ...r.users]);
                  setPeopleToken(r.nextPageToken || "");
                })
              }
            >
              Lataa lisää työntekijöitä
            </button>
          )}
          {started && (
            <p role="status">
              {rows.length} tulosta
              {token ? " · Lisää tuloksia tarkistettavana" : " · Haku valmis"}
            </p>
          )}
          {mode === "summaries" && started ? (
            <>
              {s.overflow ? (
                <p role="alert">
                  Summat ylittävät tarkan laskennan rajan. Rajaa hakua ennen
                  koontia tai vientiä.
                </p>
              ) : (
                <>
                  <dl className="summary-totals">
                    {[
                      ["Töitä", s.totals.count],
                      [
                        "Työtunnit",
                        s.totals.hours.toFixed(2).replace(".", ","),
                      ],
                      ["Kilometrit", s.totals.km.toFixed(2).replace(".", ",")],
                      ["Työn laskutus", money(s.totals.work)],
                      ["Materiaalimyynti", money(s.totals.materialsTotal)],
                      ["Matkalaskutus", money(s.totals.travel)],
                      ["Muut kulut", money(s.totals.other)],
                      ["Veroton yhteensä", money(s.totals.net)],
                      ["ALV yhteensä", money(s.totals.vat)],
                      ["Sisältäen ALV", money(s.totals.gross)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    {s.totals.estimates} alustavaa raporttia. Saatavilla olevat
                    materiaaliostot {money(s.totals.purchase)}; puuttuvia
                    ostohintoja {s.totals.missingCosts}.{" "}
                    {s.totals.missingCosts
                      ? "Kattavaa katetta ei voida laskea."
                      : "Materiaalikatearvio " +
                        money(s.totals.materialsTotal - s.totals.purchase) +
                        "."}{" "}
                    Työn ja matkojen todellisia kustannuksia ei ole mukana.
                  </p>
                  <details>
                    <summary>ALV, työntekijät ja materiaalit</summary>
                    {Object.entries(s.vat).map(([rate, v]) => (
                      <p key={rate}>
                        ALV {Number(rate) / 100} %: veroton {money(v.net)}, vero{" "}
                        {money(v.vat)}, yhteensä {money(v.gross)}
                      </p>
                    ))}
                    <p>
                      Yhteistyö lasketaan yrityksen summiin kerran.
                      Työntekijöiden tunnit ja kilometrit jaetaan tasan; ne
                      eivät ole henkilökohtainen työajanseuranta.
                    </p>
                    {Object.entries(s.employees).map(([uid, e]) => (
                      <p key={uid}>
                        {person(uid)}: {e.count} työtä ·{" "}
                        {e.hours.toFixed(2).replace(".", ",")} h ·{" "}
                        {e.km.toFixed(2).replace(".", ",")} km
                      </p>
                    ))}
                    {s.materials.map((m, i) => (
                      <p key={i}>
                        {m.name}: {m.quantity} {m.unit} · {money(m.salesCents)}
                      </p>
                    ))}
                  </details>
                </>
              )}
              <div className="work-actions">
                <button
                  className="button outline"
                  disabled={!complete || busy}
                  onClick={() =>
                    download(
                      new Blob([summaryCsv(summaryRows)], {
                        type: "text/csv;charset=utf-8",
                      }),
                      "kh-tech-yhteenveto.csv",
                    )
                  }
                >
                  Vie Exceliin (CSV)
                </button>
                <button
                  className="button outline"
                  disabled={!complete || busy}
                  onClick={() =>
                    void execute(async () => {
                      const { buildSummaryPdf } =
                        await import("../reportSummaryPdf");
                      setPreview(
                        URL.createObjectURL(
                          buildSummaryPdf(
                            summaryRows,
                            filterLabel,
                            Object.fromEntries(
                              people.map((p) => [p.uid, p.displayName]),
                            ),
                          ).output("blob"),
                        ),
                      );
                    })
                  }
                >
                  Esikatsele PDF
                </button>
                <button
                  className="button outline"
                  disabled={!complete || busy}
                  onClick={() =>
                    void execute(async () => {
                      const { buildSummaryPdf } =
                        await import("../reportSummaryPdf");
                      buildSummaryPdf(
                        summaryRows,
                        filterLabel,
                        Object.fromEntries(
                          people.map((p) => [p.uid, p.displayName]),
                        ),
                      ).save("kh-tech-yhteenveto.pdf");
                    })
                  }
                >
                  Lataa yhteenveto-PDF
                </button>
              </div>
              {!complete && (
                <p>
                  Lataa haun loput sivut ennen vientiä. Näytetyt summat koskevat
                  ladattuja tuloksia.
                </p>
              )}
              <div
                className="summary-table"
                role="region"
                aria-label="Raporttien yhteenveto"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      {[
                        "Raportti",
                        "Asiakas",
                        "Päivä",
                        "Tila",
                        "Tunnit",
                        "Km",
                        "Veroton",
                        "ALV",
                        "Sis. ALV",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.customer}</td>
                        <td>{finnishDate(r.workDate) || "Puuttuu"}</td>
                        <td>
                          {r.finalized ? "Hyväksytty" : "Alustava"}
                          {r.missing?.length > 0 && (
                            <small> · Puuttuu: {r.missing.join(", ")}</small>
                          )}
                        </td>
                        <td>{r.hours}</td>
                        <td>{r.km}</td>
                        <td>{money(r.totals.net)}</td>
                        <td>{money(r.totals.vat)}</td>
                        <td>{money(r.totals.gross)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <ul className="management-list">
              {rows.map((row, i) => {
                const r = row.report;
                return (
                  <li key={r?.id || row.id || i}>
                    <span className="work-status">
                      {r
                        ? statusLabel[r.status]
                        : row.status === "ARCHIVE_CONFIRMED"
                          ? "Arkistoitu"
                          : row.status === "WORK_REMOVED"
                            ? "Poistettu"
                            : row.status === "ACCEPTED"
                              ? "Työtilaus luotu"
                              : row.status === "REJECTED"
                                ? "Hylätty"
                                  : row.status==='NEW'?'Uusi':row.status || "Uusi"}
                    </span>
                    <h3>{r?.form.customer || row.name || row.id}</h3>
                    {r?.status === "APPROVED" && (
                      <p>
                        {row.archive?.status === "ARCHIVE_CONFIRMED"
                          ? "Arkistoitu"
                          : "Arkistointi kesken"}{" "}
                        ·{" "}
                        {row.retention
                          ? row.retention.eligible
                            ? "Vähimmäissäilytys täyttynyt"
                            : "Säilytettävä vähintään " +
                              finnishDate(row.retention.eligibleAt.slice(0, 10))
                          : "Säilytysaikaa ei ole asetettu"}
                      </p>
                    )}
                    <p>{r?.form.address || row.address}</p>
                    {row.description && <p>{row.description}</p>}
                    {(row.email || row.phone) && (
                      <p>
                        {row.email} {row.phone}
                      </p>
                    )}
                    <small>{r?.id || row.id}</small>
                    <div className="work-actions">
                      {(r || tab === "archiveMetadata") && !row.removedAt && (
                        <button
                          className="button outline"
                          onClick={() => onOpen(r?.id || row.id!)}
                        >
                          Avaa raportti
                        </button>
                      )}
                      {row.removedAt && (
                        <p>
                          {row.status==='WORK_REMOVED'?'Hyväksymätön työ on poistettu. Poistopäätös ja viittaukset säilyvät tarkistushistoriassa.':<>Alkuperäinen on poistettu. Voit tarkastella tallettamaasi .khtreport-tiedostoa etusivun tuonnissa.</>}
                        </p>
                      )}
                      {r?.status === "CANCELLED" && (
                        <button
                          className="button outline"
                          disabled={busy}
                          onClick={() =>
                            void execute(async () => {
                              if (
                                !confirm(
                                  "Luodaanko perutusta työstä uusi muokattava kopio? Perumishistoria säilyy.",
                                )
                              )
                                return;
                              await reportRequest(user, "/management", {
                                action: "restore",
                                id: r.id,
                                revision: r.revision,
                                targetId: createReportId(),
                                requestId: crypto.randomUUID(),
                              });
                              await load();
                            })
                          }
                        >
                          Palauta uutena työnä
                        </button>
                      )}
                      {r &&
                        [
                          "NEW",
                          "IN_PROGRESS",
                          "RETURNED",
                          "CANCELLED",
                        ].includes(r.status) && (
                          <details>
                            <summary>Poiston tarkistus</summary>
                            <p>
                              Vain tarpeeton hyväksymätön työ voidaan poistaa.
                              Varmista säilytysvelvoitteet ja paikalliset
                              kopiot.
                            </p>
                            <button
                              className="button danger"
                              disabled={busy}
                              onClick={() =>
                                void execute(async () => {
                                  const why = prompt(
                                    "Poiston perustelu (vähintään 10 merkkiä)",
                                  );
                                  if (!why) return;
                                  const identity = prompt(
                                    "Kirjoita poistettavan työn tunnus: " +
                                      r.id,
                                  );
                                  if (
                                    identity !== r.id ||
                                    !confirm(
                                      "Vahvistan, ettei työhön liity lakisääteistä tai toiminnallista säilytysvelvoitetta. Poisto on pysyvä.",
                                    )
                                  )
                                    return;
                                  await reportRequest(user, "/management", {
                                    action: "remove",
                                    id: r.id,
                                    revision: r.revision,
                                    reason: why,
                                    confirmationId: identity,
                                    legalChecked: true,
                                  });
                                  await load();
                                })
                              }
                            >
                              Poista tarpeeton työ
                            </button>
                          </details>
                        )}
                      {tab === "quotationRequests" && row.status === "NEW" && (
                        <>
                          <button
                            className="button primary"
                            disabled={busy}
                            onClick={() =>
                              void execute(() => decision(row, "accept"))
                            }
                          >
                            Luo työtilaus
                          </button>
                          <button
                            className="button outline"
                            disabled={busy}
                            onClick={() =>
                              void execute(() => decision(row, "reject"))
                            }
                          >
                            Hylkää pyyntö
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {token && (
            <button
              className="button outline"
              disabled={busy}
              onClick={() => void execute(() => load(true))}
            >
              Lataa seuraavat tulokset
            </button>
          )}
          {tab === "quotationRequests" && mode === "management" && (
            <details>
              <summary>Tuo tarjouspyyntö sähköpostista</summary>
              <p>
                Lisää CONTACT-viestin tiedot ja alkuperäinen pyyntötunnus.
                Tuonti ei hyväksy tilausta eikä lähetä viestiä asiakkaalle.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void execute(async () => {
                    const savedRevision = quoteDraft.revision;
                    await reportRequest(user, "/management", {
                      action: "quoteImport",
                      ...quote,
                    });
                    quoteDraft.draft.clear({ ...emptyQuote }, savedRevision);
                    await load();
                  });
                }}
              >
                {Object.entries({
                  reference: "CONTACT-pyyntötunnus",
                  name: "Asiakkaan nimi",
                  email: "Sähköposti",
                  phone: "Puhelin",
                  address: "Osoite",
                  description: "Työn kuvaus",
                  schedule: "Toivottu ajankohta",
                }).map(([k, label]) => (
                  <label key={k}>
                    {label}
                    {k === "description" ? (
                      <textarea
                        value={quote.description}
                        required
                        maxLength={6000}
                        rows={4}
                        onChange={(e) =>
                          setQuote((q) => ({
                            ...q,
                            description: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <input
                        value={quote[k as keyof typeof quote]}
                        required={["reference", "name", "description"].includes(
                          k,
                        )}
                        maxLength={k === "description" ? 6000 : 500}
                        onChange={(e) =>
                          setQuote((q) => ({ ...q, [k]: e.target.value }))
                        }
                      />
                    )}
                  </label>
                ))}
                <FormDraftNotice draft={quoteDraft.draft} />
                <button className="button primary" disabled={busy}>
                  Tallenna tarjouspyyntö
                </button>
              </form>
            </details>
          )}
        </>
      ) : (
        <>
          <p>
            Säilytysaika ei käynnistä automaattista poistoa. Määritä käytäntö
            kirjanpitäjän kanssa. Palvelimen erillinen poistolupa vaaditaan
            edelleen.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void execute(async () => {
                const r = await reportRequest<{ settings: Policy }>(
                  user,
                  "/management",
                  {
                    action: "setPolicy",
                    minimumDays: Number(days),
                    effectiveFrom: effective,
                    reason,
                    reviewed,
                    revision: settings?.revision || 0,
                  },
                );
                setSettings(r.settings);
                setReason("");
                setReviewed(false);
              });
            }}
          >
            <fieldset disabled={busy} className="management-fields">
              <label>
                Vähimmäissäilytys päivinä
                <input
                  type="number"
                  min="0"
                  max="36500"
                  required
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </label>
              <label>
                Voimaan alkaen
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="pp.kk.vvvv"
                  required
                  value={finnishDate(effective)}
                  onChange={(e) =>
                    setEffective(
                      isoDate(dateEntry(e.target.value)) ||
                        dateEntry(e.target.value),
                    )
                  }
                />
              </label>
              <label>
                Perustelu
                <input
                  required
                  minLength={10}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <label className="work-checkbox">
                <input
                  type="checkbox"
                  required
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                Omistaja on selvittänyt lakisääteiset ja toiminnalliset
                säilytysvelvoitteet.
              </label>
              <button className="button primary" disabled={busy}>
                Tallenna uusi käytäntö
              </button>
            </fieldset>
          </form>
          {!settings && (
            <p>
              Sovellukseen ei ole asetettu säilytysaikaa. Aiempi palvelinasetus
              voi olla voimassa; tarkista nykyinen poistolupa raportista.
            </p>
          )}
          <details>
            <summary>Käytäntöjen historia</summary>
            {settings?.policies.map((p,index) => (
              <p key={p.version}>
                {p.minimumDays} päivää · voimaan {finnishDate(p.effectiveFrom)}{" "}
                · {p.reason} · versio {index+1}
              </p>
            ))}
          </details>
        </>
      )}
      {rows.some((r) => r.unavailable) && (
        <p role="alert">
          Kaikkia vanhoja raportteja ei voitu sisällyttää yhteenvetoon. Tarkista
          tietomalli ennen vientiä.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section className="summary-preview">
          <h2>Yhteenvedon esikatselu</h2>
          <button className="button outline" onClick={() => setPreview("")}>
            Sulje esikatselu
          </button>
          <iframe title="Yhteenveto-PDF" src={preview} />
        </section>
      )}
    </section>
  );
}
