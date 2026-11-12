import React from "react";
import { formDraft, type FormDraft } from "./formDraft";
export function useFormDraft<T>(
  uid: string,
  identity: string,
  initial: () => T,
) {
  const draft = React.useMemo(
    () => formDraft(uid, identity, initial),
    [uid, identity],
  );
  const snapshot = React.useSyncExternalStore(
    draft.subscribe,
    draft.getSnapshot,
  );
  React.useEffect(() => {
    const flush = () => {
      draft.flush();
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const before = (e: BeforeUnloadEvent) => {
      if (!draft.flush()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", before);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [draft]);
  return { ...snapshot, draft, setValue: draft.update };
}
export function FormDraftNotice<T>({
  draft,
  discard = true,
}: {
  draft: FormDraft<T>;
  discard?: boolean;
}) {
  const snapshot = React.useSyncExternalStore(
    draft.subscribe,
    draft.getSnapshot,
  );
  if (!snapshot.hasDraft && snapshot.status !== "error") return null;
  return (
    <div className="management-draft">
      <p role="status">
        {
          {
            dirty: "Tallentamattomia muutoksia",
            saving: "Tallennetaan…",
            saved: "Lomakeluonnos tallennettu tähän välilehteen",
            error: snapshot.readFailed
              ? "Aiemman lomakeluonnoksen lukeminen epäonnistui. Sitä ei korvata automaattisesti."
              : "Lomakeluonnoksen tallennus epäonnistui. Syöte säilyy muistissa.",
          }[snapshot.status]
        }
      </p>
      {snapshot.status === "error" && !snapshot.readFailed && (
        <button
          type="button"
          className="button outline"
          onClick={() => draft.flush()}
        >
          Yritä luonnoksen tallennusta uudelleen
        </button>
      )}
      {discard && (
        <button
          type="button"
          className="access-link"
          onClick={() => {
            if (confirm("Hylätäänkö tämän lomakkeen keskeneräiset muutokset?"))
              draft.clear();
          }}
        >
          Hylkää lomakeluonnos
        </button>
      )}
    </div>
  );
}
