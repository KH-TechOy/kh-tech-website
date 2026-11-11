import {
  emptyReport,
  readReport,
  saveReport,
  type DraftStorage,
  type ReportState,
} from "../reportModel";
export type DraftStatus = "dirty" | "saving" | "saved" | "error";
export function createDraftSession(storage?: DraftStorage) {
  let readFailed = false;
  const readStorage: DraftStorage = {
    getItem(name) {
      try {
        const value = (storage || localStorage).getItem(name);
        if (name === "kht-report-draft" && value) {
          const parsed: unknown = JSON.parse(value);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            throw new Error("invalid draft");
        }
        return value;
      } catch (error) {
        readFailed = true;
        throw error;
      }
    },
    setItem() {
      throw new Error("read only");
    },
    removeItem() {
      throw new Error("read only");
    },
  };
  const initial = readReport(readStorage);
  let snapshot = {
    state: initial,
    status: (readFailed ? "error" : "saved") as DraftStatus,
    readFailed,
    revision: 0,
  };
  let savedRevision = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (status: DraftStatus) => {
    snapshot = { ...snapshot, status };
    listeners.forEach((fn) => fn());
  };
  function persist() {
    clearTimeout(timer);
    if (snapshot.readFailed) {
      publish("error");
      return false;
    }
    if (savedRevision === snapshot.revision && snapshot.status !== "error") {
      if (snapshot.status === "saving") publish("saved");
      return true;
    }
    publish("saving");
    try {
      saveReport(snapshot.state, storage);
      savedRevision = snapshot.revision;
      publish("saved");
      return true;
    } catch {
      publish("error");
      return false;
    }
  }
  return {
    allowReplacementAfterReadFailure() {
      snapshot = { ...snapshot, readFailed: false };
    },
    getGeneration: () => generation,
    // Only a controller that has checked the local revision may apply a remote snapshot.
    acceptRemote(state: ReportState, expectedRevision: number) {
      if (snapshot.revision !== expectedRevision || snapshot.readFailed) return false;
      snapshot = { ...snapshot, state, revision: snapshot.revision + 1, status: 'dirty' };
      persist();
      return true;
    },
    getSnapshot: () => snapshot,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    update(next: ReportState | ((state: ReportState) => ReportState)) {
      const state = typeof next === "function" ? next(snapshot.state) : next;
      snapshot = {
        ...snapshot,
        state,
        status: snapshot.readFailed ? "error" : "dirty",
        revision: snapshot.revision + 1,
      };
      listeners.forEach((fn) => fn());
      clearTimeout(timer);
      timer = setTimeout(persist, 2000);
    },
    flush: persist,
    async save() {
      clearTimeout(timer);
      publish("saving");
      await new Promise((resolve) => setTimeout(resolve, 0));
      return persist();
    },
    discard() {
      generation++;
      snapshot = { ...snapshot, readFailed: false };
      this.update(emptyReport());
      return persist();
    },
    replace(state: ReportState, expectedRevision: number) {
      if (snapshot.revision !== expectedRevision)
        throw new Error(
          "Luonnos muuttui. Tuonti peruttiin, jotta uusia tietoja ei korvata.",
        );
      generation++;
      snapshot = { ...snapshot, readFailed: false };
      this.update(state);
      return persist();
    },
  };
}
export type DraftSession = ReturnType<typeof createDraftSession>;
