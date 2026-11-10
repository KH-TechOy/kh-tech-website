import type { DraftStorage } from "../reportModel";
const prefix = "kht-report2:";
/** Tab-scoped plaintext draft, not an encryption or server authorization mechanism. */
export function sessionDraftStorage(uid: string) {
  let closed = false;
  const key = (name: string) => prefix + uid + ":" + name;
  return {
    ownerUid: uid,
    getItem(name: string) {
      return closed ? null : sessionStorage.getItem(key(name));
    },
    setItem(name: string, value: string) {
      if (!closed) sessionStorage.setItem(key(name), value);
    },
    removeItem(name: string) {
      sessionStorage.removeItem(key(name));
    },
    close() {
      closed = true;
      try {
        sessionStorage.removeItem(key("kht-report-draft"));
        sessionStorage.removeItem(key("kht-report-id"));
      } catch {
        /* closed adapter still rejects all later writes */
      }
    },
  } satisfies DraftStorage & { ownerUid: string; close(): void };
}
export function clearSessionDrafts() {
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith(prefix)) sessionStorage.removeItem(key);
  } catch {
    /* no storage permission */
  }
}
