import type { DraftStorage } from "../reportModel";
import type { ReportState } from "../reportModel";
const prefix = "kht-report2:";
/** Tab-scoped plaintext draft, not an encryption or server authorization mechanism. */
export function sessionDraftStorage(uid: string) {
  let closed = false;
  let legacyCleaned = false;
  const key = (name: string) => prefix + uid + ":" + name;
  const envelopeKey = key("snapshot");
  return {
    ownerUid: uid,
    getItem(name: string) {
      if (closed) return null;
      const envelope = sessionStorage.getItem(envelopeKey);
      if (envelope) {
        const data = JSON.parse(envelope);
        return name === "kht-report-id" ? data.reportId : envelope;
      }
      return sessionStorage.getItem(key(name));
    },
    setItem(name: string, value: string) {
      if (closed) throw new Error("Draft storage closed");
      sessionStorage.setItem(key(name), value);
    },
    removeItem(name: string) {
      if (closed) throw new Error("Draft storage closed");
      sessionStorage.removeItem(key(name));
    },
    writeReport(state: ReportState) {
      if (closed) throw new Error("Draft storage closed");
      sessionStorage.setItem(
        envelopeKey,
        JSON.stringify({
          ...state.form,
          reportId: state.id,
          photos: state.photos.map((p) => p.data),
          photoCategories: state.photos.map((p) => p.category),
        }),
      );
      if (!legacyCleaned) {
        sessionStorage.removeItem(key("kht-report-draft"));
        sessionStorage.removeItem(key("kht-report-id"));
        legacyCleaned = true;
      }
    },
    close() {
      closed = true;
      // Lock access; retention is deliberate. Only an explicit discard removes a draft.
    },
  } satisfies DraftStorage & { ownerUid: string; close(): void };
}
