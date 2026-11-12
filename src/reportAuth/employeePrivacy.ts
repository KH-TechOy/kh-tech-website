import { emptyOperations, type Operations } from "../reportWorkModel";
import type { DraftSession } from "./draftSession";
import { redactFinancialFormDrafts } from "./formDraft";
export function stripFinancial<
  T extends { billing?: any; operations?: Operations },
>(value: T): T {
  const { billing, ...rest } = value;
  return {
    ...rest,
    operations:
      value.operations ||
      (billing
        ? {
            travelKm: billing.travelKm || 0,
            otherCents: billing.otherCents || 0,
            otherDescription: billing.otherDescription || "",
          }
        : emptyOperations()),
  } as T;
}
/** Targeted schema migration, never a site-data purge. Keep all text/photos/signatures/operational costs. */
export function sanitizeEmployeeDrafts(
  uid: string,
  sessions: Map<string, DraftSession>,
) {
  redactFinancialFormDrafts(uid);
  for (const [key, session] of sessions)
    if (
      (key === uid || key.startsWith(uid + ":")) &&
      session.getSnapshot().state.billing
    ) {
      session.update(stripFinancial(session.getSnapshot().state));
      session.flush();
    }
  const prefix = "kht-report2:" + uid + ":";
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)!;
    if (!key.startsWith(prefix)) continue;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed.billing)
        sessionStorage.setItem(key, JSON.stringify(stripFinancial(parsed)));
      else if (typeof parsed.text === "string") {
        const data = JSON.parse(parsed.text);
        if (data.billing)
          sessionStorage.setItem(
            key,
            JSON.stringify({
              ...parsed,
              text: JSON.stringify(stripFinancial(data)),
            }),
          );
      }
    } catch {
      /* Unreadable drafts remain recoverable; the existing draft controller reports failure. */
    }
  }
}
