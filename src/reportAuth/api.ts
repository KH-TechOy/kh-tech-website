import type { User } from "firebase/auth";
import { reportApi } from "./firebase";
export type EmployeeProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "employee";
  active: boolean;
  validAfter: number;
};
export class ReportApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export async function reportRequest<T>(
  user: User,
  path: string,
  data?: object,
): Promise<T> {
  const token = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(reportApi + path, {
      method: data ? "POST" : "GET",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: {
        Authorization: "Bearer " + token,
        ...(data ? { "Content-Type": "application/json" } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new ReportApiError("network");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ReportApiError(result.error || "unavailable");
  return result as T;
}
export function reportError(error: unknown): string {
  const code =
    error instanceof ReportApiError
      ? error.code
      : (error as { code?: string })?.code || "";
  if (
    [
      "auth/invalid-credential",
      "auth/wrong-password",
      "auth/user-not-found",
      "auth/invalid-email",
    ].includes(code)
  )
    return "Sähköpostiosoite tai salasana ei kelpaa.";
  if (["auth/user-disabled", "access_disabled"].includes(code))
    return "Käyttöoikeutesi on estetty tai sitä ei ole vielä myönnetty. Ota yhteyttä ylläpitäjään.";
  if (["auth/too-many-requests", "rate_limited"].includes(code))
    return "Liikaa yrityksiä. Odota hetki ja yritä uudelleen.";
  if (
    [
      "invalid_session",
      "auth/user-token-expired",
      "auth/invalid-user-token",
    ].includes(code)
  )
    return "Istunto on päättynyt. Kirjaudu uudelleen.";
  if (code === "last_admin")
    return "Viimeisen aktiivisen ylläpitäjän oikeuksia ei voi poistaa.";
  if (code === "admin_required")
    return "Toiminto on sallittu vain ylläpitäjälle.";
  if (code === "email_exists")
    return "Sähköpostiosoitteella on jo käyttäjätili. Tarkista käyttäjäluettelo.";
  if (code === "outcome_unknown")
    return "Toiminnon tulos on epäselvä. Tarkista tilanne ennen uutta pyyntöä.";
  if (code === "invalid_request") return "Tarkista antamasi tiedot.";
  return "Palveluun ei saada yhteyttä. Tarkista verkkoyhteys ja yritä uudelleen.";
}
