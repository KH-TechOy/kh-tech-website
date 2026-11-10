import { expect, test } from "vitest";
import { authorizationLost, ReportApiError, reportError } from "./api";
test("actual authorization loss closes access; network and provider faults do not discard a verified local session", () => {
  for (const code of [
    "access_disabled",
    "invalid_session",
    "auth/user-disabled",
    "auth/user-token-expired",
    "auth/invalid-user-token",
  ])
    expect(authorizationLost({ code })).toBe(true);
  for (const code of [
    "network",
    "provider_unavailable",
    "auth/network-request-failed",
    "email_quota",
  ])
    expect(authorizationLost(new ReportApiError(code))).toBe(false);
});
test("email and name errors explain the real failure in Finnish without claiming success", () => {
  expect(reportError(new ReportApiError("email_quota"))).toContain(
    "lähetysraja",
  );
  expect(reportError(new ReportApiError("email_not_configured"))).toContain(
    "käyttöönottoasetus",
  );
  expect(reportError(new ReportApiError("email_outcome_unknown"))).toContain(
    "ei voitu varmistaa",
  );
  expect(reportError(new ReportApiError("invalid_name"))).toContain("1–120");
});
