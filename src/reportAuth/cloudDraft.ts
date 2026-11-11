import type { ReportState } from "../reportModel";
import { reportIsEmpty } from "../reportModel";
import type { WorkReport } from "../reportWorkModel";
import type { DraftSession } from "./draftSession";

export type CloudStatus =
  | "loading"
  | "saved"
  | "dirty"
  | "saving"
  | "offline"
  | "error"
  | "conflict"
  | "locked";
export type CloudTransport = {
  load(): Promise<WorkReport | null>;
  save(
    revision: number,
    requestId: string,
    state: ReportState,
  ): Promise<WorkReport>;
};
export const cloudText = (state: ReportState) =>
  JSON.stringify(
    {
      form: state.form,
      ...(state.billing ? { billing: state.billing } : {}),
    },
    (_, value: unknown) => {
      if (value && typeof value === "object" && !Array.isArray(value))
        return Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        );
      return value;
    },
  );
/** Local revisions belong to draftSession; server revisions never replace a dirty local revision. */
export function createCloudDraft(
  session: DraftSession,
  transport: CloudTransport,
  checkpoint: Pick<Storage, "getItem" | "setItem">,
  admin = false,
) {
  let view = {
    status: "loading" as CloudStatus,
    remote: null as WorkReport | null,
    error: "",
  };
  let base = 0,
    acknowledged = "",
    started = false,
    applying = false,
    stopped = false;
  let inFlight: {
    requestId: string;
    text: string;
    revision: number;
    localRevision: number;
    state: ReportState;
  } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const publish = (status: CloudStatus, error = "") => {
    view = { ...view, status, error };
    listeners.forEach((fn) => fn());
  };
  function lockAccess(code: string) {
    stopped = true;
    clearTimeout(timer);
    publish("locked", code);
  }
  const local = () => session.getSnapshot();
  const dirty = () => cloudText(local().state) !== acknowledged;
  const editable = (r: WorkReport) =>
    [
      "NEW",
      "IN_PROGRESS",
      "RETURNED",
      ...(admin ? ["PENDING_REVIEW"] : []),
    ].includes(r.status);
  function remember() {
    // Never advance the checkpoint beyond the local snapshot: a partial quota failure must not
    // make an older snapshot look like a new edit against the just-acknowledged cloud revision.
    if (!session.flush()) throw new Error("local_recovery_failed");
    checkpoint.setItem(
      "cloud",
      JSON.stringify({ revision: base, text: acknowledged }),
    );
  }
  function apply(remote: WorkReport) {
    applying = true;
    const success = session.acceptRemote(
      {
        ...local().state,
        id: remote.id,
        form: remote.form,
        billing: remote.billing,
      },
      local().revision,
    );
    applying = false;
    if (!success) return false;
    acknowledged = cloudText(local().state);
    base = remote.revision;
    remember();
    return true;
  }
  async function receive(remote: WorkReport) {
    if (stopped) return;
    if (view.remote && remote.revision < view.remote.revision) return;
    view = { ...view, remote };
    if (inFlight && remote.lastMutation === inFlight.requestId) return;
    if (remote.revision <= base) {
      const retryContention =
        view.status === "conflict" &&
        remote.revision === base &&
        dirty() &&
        !inFlight;
      publish(editable(remote) ? (dirty() ? "dirty" : "saved") : "locked");
      if (retryContention && editable(remote)) schedule();
      return;
    }
    try {
      if (
        dirty() &&
        !(
          cloudText(local().state) ===
          cloudText({
            ...local().state,
            form: remote.form,
            billing: remote.billing,
          })
        )
      ) {
        publish("conflict");
        return;
      }
      if (!apply(remote)) {
        publish("conflict");
        return;
      }
      publish(editable(remote) ? "saved" : "locked");
    } catch {
      publish(
        "error",
        "Paikallinen palautuspiste ei tallentunut. Syötteitä ei poistettu.",
      );
    }
  }
  async function start() {
    if (started || stopped) return;
    started = true;
    publish("loading");
    try {
      const raw = checkpoint.getItem("cloud");
      if (raw) {
        const data = JSON.parse(raw);
        if (!Number.isInteger(data.revision) || typeof data.text !== "string")
          throw new Error("checkpoint");
        base = data.revision;
        acknowledged = data.text;
      } else
        acknowledged = reportIsEmpty(local().state)
          ? cloudText(local().state)
          : "";
      const remote = await transport.load();
      if (stopped) return;
      if (remote) {
        // Reload with unacknowledged local text: a higher cloud version is a conflict, not hydration.
        if (remote.revision === base) {
          view = { ...view, remote };
          publish(dirty() ? "dirty" : editable(remote) ? "saved" : "locked");
        } else await receive(remote);
      } else {
        base = 0;
        publish(dirty() ? "dirty" : "saved");
      }
      if (view.status === "dirty") schedule();
    } catch (error) {
      if (stopped) return;
      const code = (error as { code?: string }).code;
      if (
        ["report_forbidden", "access_disabled", "invalid_session"].includes(
          code || "",
        )
      ) {
        lockAccess(code!);
        return;
      }
      started = false;
      publish(
        "error",
        "Pilviluonnosta ei voitu avata. Paikalliset tiedot säilyvät. Yritä uudelleen.",
      );
    }
  }
  function schedule() {
    clearTimeout(timer);
    if (!stopped) timer = setTimeout(() => void save(), 2000);
  }
  let activeSave: Promise<boolean> | null = null;
  function save(): Promise<boolean> {
    if (activeSave) return activeSave;
    const task = saveOnce();
    activeSave = task;
    void task.finally(() => {
      if (activeSave === task) activeSave = null;
    });
    return task;
  }
  async function saveOnce(): Promise<boolean> {
    clearTimeout(timer);
    if (stopped || !started) {
      if (!stopped) await start();
      return false;
    }
    if (["conflict", "loading", "locked"].includes(view.status)) return false;
    if (local().readFailed) {
      publish(
        "error",
        "Paikallisen luonnoksen lukeminen epäonnistui. Vahvista korvaaminen Tallenna luonnos -painikkeella ennen pilvitallennusta.",
      );
      return false;
    }
    if (!navigator.onLine) {
      publish("offline");
      return false;
    }
    // An ambiguous request is retried with its original id, original payload and original revision.
    if (!inFlight && !dirty()) return true;
    if (saving) return false;
    if (!inFlight)
      inFlight = {
        requestId: crypto.randomUUID(),
        text: cloudText(local().state),
        revision: base,
        localRevision: local().revision,
        state: structuredClone(local().state),
      };
    const pending = inFlight;
    saving = true;
    publish("saving");
    try {
      const remote = await transport.save(
        pending.revision,
        pending.requestId,
        pending.state,
      );
      if (stopped) return false;
      const newerRemote =
        view.remote && view.remote.revision > remote.revision
          ? view.remote
          : null;
      base = remote.revision;
      view = { ...view, remote: newerRemote || remote };
      acknowledged = cloudText({
        ...pending.state,
        form: remote.form,
        billing: remote.billing,
      });
      if (local().revision === pending.localRevision) {
        if (!apply(remote)) {
          publish("conflict");
          return false;
        }
      } else {
        // Accept server-priced snapshots without replacing any text typed while saving.
        applying = true;
        session.update((current) => ({
          ...current,
          billing:
            JSON.stringify(current.billing) ===
            JSON.stringify(pending.state.billing)
              ? remote.billing
              : current.billing,
          form: {
            ...current.form,
            materials: current.form.materials.map((row, index) => {
              const prior = pending.state.form.materials[index],
                canonical = remote.form.materials[index];
              return prior &&
                canonical &&
                row.name === prior.name &&
                row.unit === prior.unit &&
                row.rowId === prior.rowId &&
                row.catalogId === prior.catalogId &&
                row.unitPriceCents === prior.unitPriceCents
                ? {
                    ...row,
                    rowId: canonical.rowId,
                    unitPriceCents: canonical.unitPriceCents,
                  }
                : row;
            }),
          },
        }));
        applying = false;
      }
      remember();
      inFlight = null;
      if (newerRemote) {
        publish("conflict");
        return false;
      }
      publish(dirty() ? "dirty" : editable(remote) ? "saved" : "locked");
      if (dirty()) schedule();
      return !dirty();
    } catch (error) {
      if (stopped) return false;
      const code = (error as { code?: string }).code;
      if (code === "revision_conflict") {
        inFlight = null;
        publish("conflict");
        void transport
          .load()
          .then((r) => r && receive(r))
          .catch(() => {});
      } else if (
        [
          "report_locked",
          "report_forbidden",
          "access_disabled",
          "invalid_session",
        ].includes(code || "")
      ) {
        inFlight = null;
        if (code === "report_locked") publish("locked", code);
        else lockAccess(code!);
      } else {
        // Definite rejections can be corrected; a network/503 response may already have committed.
        if (
          code &&
          !["network", "provider_unavailable", "unavailable"].includes(code)
        )
          inFlight = null;
        publish(navigator.onLine ? "error" : "offline", code || "network");
      }
      return false;
    } finally {
      saving = false;
    }
  }
  let saving = false;
  let observedText = cloudText(local().state);
  const unsubscribe = session.subscribe(() => {
    const nextText = cloudText(local().state);
    if (nextText === observedText) return; // Local save-status changes are not edits.
    observedText = nextText;
    if (applying || stopped || !started || !dirty()) return;
    if (["conflict", "locked", "loading"].includes(view.status)) return;
    publish("dirty");
    schedule();
  });
  return {
    start,
    lockAccess,
    save,
    receive,
    getSnapshot: () => view,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    async retry() {
      if (!started) await start();
      else await save();
    },
    async resolve(useLocal: boolean) {
      if (saving || stopped) return;
      const localRevision = local().revision,
        displayedRevision = view.remote?.revision;
      const remote = await transport.load();
      if (!remote || stopped) return;
      view = { ...view, remote };
      inFlight = null;
      if (
        local().revision !== localRevision ||
        remote.revision !== displayedRevision
      ) {
        publish(
          "conflict",
          "Versio muuttui valinnan aikana. Tarkista paikallinen teksti ja uusin pilviversio uudelleen.",
        );
        return;
      }
      if (!useLocal) {
        if (!apply(remote)) {
          publish("conflict");
          return;
        }
        publish(editable(remote) ? "saved" : "locked");
      } else {
        base = remote.revision;
        acknowledged = cloudText({
          ...local().state,
          form: remote.form,
          billing: remote.billing,
        });
        remember();
        publish(editable(remote) ? "dirty" : "locked");
        if (editable(remote)) await save();
      }
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
      listeners.clear();
    },
  };
}
export type CloudDraft = ReturnType<typeof createCloudDraft>;
