import type { DraftStatus } from "./draftSession";
export const formDraftPrefix = "kht-report-forms:";
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
// Only the fields explicitly supplied by a form's initializer can be restored.
function knownShape(value: unknown, template: unknown): boolean {
  if (Array.isArray(template))
    return (
      Array.isArray(value) &&
      value.length <= 100 &&
      value.every((v) => typeof v === "string" && v.length <= 500)
    );
  if (template === null)
    return (
      value === null || (typeof value === "number" && Number.isFinite(value))
    );
  if (typeof template !== "object")
    return (
      typeof value === typeof template &&
      (typeof value !== "number" || Number.isFinite(value))
    );
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    Object.keys(value).length === Object.keys(template as object).length &&
    Object.entries(template as object).every(
      ([key, seed]) =>
        Object.prototype.hasOwnProperty.call(value, key) &&
        knownShape((value as Record<string, unknown>)[key], seed),
    )
  );
}
export function createFormDraft<T>(
  key: string,
  initial: () => T,
  storage: Store,
) {
  let initialize = initial;
  const seed = initial();
  let value = seed,
    hasDraft = false,
    readFailed = false;
  try {
    const raw = storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version !== 1 || !knownShape(parsed.value, seed))
        throw new Error("invalid form draft");
      value = parsed.value;
      hasDraft = true;
    }
  } catch {
    readFailed = true;
  }
  let snapshot = {
    value,
    hasDraft,
    readFailed,
    revision: 0,
    status: (readFailed ? "error" : "saved") as DraftStatus,
  };
  let savedRevision = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const publish = (status: DraftStatus) => {
    snapshot = { ...snapshot, status };
    listeners.forEach((fn) => fn());
  };
  function flush() {
    clearTimeout(timer);
    if (snapshot.readFailed) {
      publish("error");
      return false;
    }
    if (snapshot.revision === savedRevision && snapshot.status !== "error")
      return true;
    publish("saving");
    try {
      storage.setItem(
        key,
        JSON.stringify({ version: 1, value: snapshot.value }),
      );
      savedRevision = snapshot.revision;
      publish("saved");
      return true;
    } catch {
      publish("error");
      return false;
    }
  }
  return {
    // Called only when a form is mounted/selected. Clean forms may use fresh server
    // defaults; dirty/error forms retain their input. Discard uses this activation's baseline.
    activate(next: () => T) {
      initialize = next;
      if (
        !snapshot.hasDraft &&
        !snapshot.readFailed &&
        snapshot.status === "saved"
      )
        snapshot = { ...snapshot, value: next() };
    },
    getSnapshot: () => snapshot,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    update(next: T | ((previous: T) => T)) {
      snapshot = {
        ...snapshot,
        value:
          typeof next === "function"
            ? (next as (p: T) => T)(snapshot.value)
            : next,
        revision: snapshot.revision + 1,
        hasDraft: true,
      };
      publish(snapshot.readFailed ? "error" : "dirty");
      clearTimeout(timer);
      timer = setTimeout(flush, 2000);
    },
    flush,
    // Call only after confirmed success or explicit user confirmation. Never on unmount/save completion.
    clear(next: T = initialize(), expectedRevision = snapshot.revision) {
      if (snapshot.revision !== expectedRevision) return false;
      clearTimeout(timer);
      try {
        storage.removeItem(key);
      } catch {
        publish("error");
        return false;
      }
      snapshot = {
        value: next,
        hasDraft: false,
        readFailed: false,
        revision: snapshot.revision + 1,
        status: "saved",
      };
      savedRevision = snapshot.revision;
      listeners.forEach((fn) => fn());
      return true;
    },
  };
}
export type FormDraft<T> = ReturnType<typeof createFormDraft<T>>;
// Lives outside React. Remounts and auth/profile refreshes cannot replace newer input.
const sessions = new Map<string, FormDraft<any>>();
export function formDraft<T>(
  uid: string,
  identity: string,
  initial: () => T,
): FormDraft<T> {
  if (!uid || !identity)
    throw new Error("Form draft owner and identity required");
  const key =
    formDraftPrefix +
    encodeURIComponent(uid) +
    ":" +
    encodeURIComponent(identity);
  if (!sessions.has(key))
    sessions.set(key, createFormDraft(key, initial, sessionStorage));
  else sessions.get(key)!.activate(initial);
  return sessions.get(key)!;
}
export function flushFormDrafts(uid: string) {
  const prefix = formDraftPrefix + encodeURIComponent(uid) + ":";
  let ok = true;
  for (const [key, draft] of sessions)
    if (key.startsWith(prefix) && !draft.flush()) ok = false;
  return ok;
}
export function unfinishedFormIds(uid: string) {
  const prefix = formDraftPrefix + encodeURIComponent(uid) + ":";
  const keys = new Set([...sessions.keys()]);
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) keys.add(key);
    }
  } catch {
    /* Live forms remain available. */
  }
  return [...keys]
    .filter(
      (key) =>
        key.startsWith(prefix) &&
        (sessions.get(key)?.getSnapshot().hasDraft ?? true),
    )
    .map((key) => decodeURIComponent(key.slice(prefix.length)));
}
