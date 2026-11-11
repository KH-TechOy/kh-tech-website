# REPORT 2.0 B – Implementation result

Implemented locally on `main`, extending the deployed A/A.1 architecture. No push, deployment, production email, billing activation or account reset was performed. Authentication/onboarding, user names and last-Admin protection remain in place.

## Implemented

- Admin work-order creation with customer, address, description, schedule, optional CONTACT reference and one or more active assignees, including the Admin themselves. Editable unfinished assignments, reassignment, filters, cancellation with a reason and immutable audit events.
- Employee task list, prefilled editor, independently created reports, local recovery list, submission for review and visible Admin correction comments. NEW / IN_PROGRESS / PENDING_REVIEW / RETURNED lifecycle. APPROVED and final archival/email are reserved, not simulated.
- Real Firestore text persistence through the existing verified Worker and transactions. Per-report revisions, stable mutation IDs, about two-second cloud debounce, manual save, bounded realtime query pages and an open-report listener.
- A.1 `draftSession` remains the input state. UID/report local sessions survive navigation and refresh, including personal reports that have never reached the cloud. Local/cloud indicators are separate. Photos remain local and PDF-compatible. No photo upload/storage service was added.
- Explicit conflict choices with a cloud-text comparison and downloadable local recovery JSON. Async save acknowledgements, delayed conflict choices, map-field ordering and stale snapshots cannot replace newer input. A failed local write cannot advance the cloud checkpoint past the recoverable local snapshot. An access revocation closes the report view without purging recoverable data.
- Admin material creation/edit/deactivation, employee search/selection and manual entries. Units, quantities, selling-price snapshots and row totals. Private purchase costs are separate Firestore documents and are never returned in shared catalog/report data. Historical report prices survive catalog changes/deactivation.
- Billing preparation: hours, material subtotals, distance/rate, other costs/description, configurable VAT and total excluding VAT. Protected settings/prices are server-controlled for Employees. Compatible optional billing details are included in PDF and its preview; a report is not presented as an invoice.
- KH-Tech branding and existing editor preserved. Mobile touch targets, portrait/landscape checks, no new heavy runtime dependency. Public navigation does not expose Report.
- Privacy notice technical descriptions now reflect cloud text versus local photos/recovery. Company details/legal bases and unrelated CONTACT/game information remain. Unknown retention/processing facts are recorded for owner confirmation, not invented.

## Security and compatibility

See [REPORT_2_0_B_SECURITY.md](REPORT_2_0_B_SECURITY.md) for authorization and conflict handling, and [REPORT_2_0_B_SETUP.md](REPORT_2_0_B_SETUP.md) for schemas, indexes, free-tier estimates and exact manual release order.

Browser clients cannot write/delete/downgrade schema-2 reports or work-order metadata. Trusted mutations recheck role, access, assignment, state and revision inside the transaction. Employees cannot manage users, create Admin accounts, approve reports, alter protected billing or read purchase costs/audits. Existing legacy metadata retains its prior constraints; draft metadata can be adopted without changing its ID/owner/assignment. Completed/submitted legacy metadata is not silently reopened. Shared legacy localStorage imports still require explicit Admin authorization.

New report persistence is text-only; photos, existing report IDs, local draft envelopes and original PDF fields remain compatible. There is no cross-device photo/PDF synchronization. A new browser login/reload needs network verification; an already verified editor can continue locally during an interruption. SessionStorage/recovery downloads are not encrypted, and a closed/failed tab can lose unsaved data.

During QA, the Admin edit action was made visibly busy until its selected order has loaded, preventing changes to the previous create form while the load is pending. Tests now wait for the correct edit state before changing assignments. A keyboard skip link is hidden visually until focused; it no longer covers editor headings in captures.

## Verification

| Check | Result |
| --- | --- |
| TypeScript: `npm run check:report`, `tsc -b` via build | Passed. |
| Unit/regression: `npm test -- --maxWorkers=2 --testTimeout=15000` | **125/125 passed**, including A.1 preservation, debounce, failures/retry, canonical map comparison, delayed conflict choice, access revocation, billing/PDF and existing CONTACT/game models. |
| Firebase Auth/Firestore + production workerd/SQLite | **33/33 passed**. Verified roles, onboarding, last Admin, direct-write/downgrade rejection, private cost reads, absence of public price-bearing hashes, work lifecycle, idempotency, concurrent saves and historical/manual material prices. |
| Full Report browser suite | **51/51 passed**: 39 A.1 regressions + 12 B cases, desktop 1440×900, phone 390×844 and tablet 768×1024. |
| Targeted B rerun | **12/12 passed** after the final work-query, private-price and PDF-preview updates. Includes mobile landscape and explicit checks that preview billing matches the report amounts. |
| CONTACT 3.1 browser regression | **30/30 passed**, isolated service fixtures, no real email. |
| Existing privacy browser suite | **9/9 passed**, including final Finnish copy and all nineteen sections. |
| Public website browser regression | **15 passed**, 3 development-mode static-PWA checks skipped by design. |
| Production static PWA offline check | **1/1 passed** against the normal configured Pages build: offline shell reloads and never exposes an unauthenticated editor. Actual iOS/Android installation/NFC acceptance remains external. |
| Production build and Report Worker dry-run | Passed. No deployment. Existing large-chunk warnings remain for the Firebase Report bundle (about 552 kB / 169 kB gzip) and Phaser (about 1.23 MB). No new runtime package was added. |

Free-tier contention testing also confirmed that Firestore can abort both competing transactions. Payload-aware bounded retries now provide backoff for ordinary text and preserve subrequest headroom for large catalog batches. A same-revision contention abort resumes client autosave; a truly newer revision remains an explicit conflict. Local save-status notifications do not restart cloud debounce.

Screenshots are captured from actual emulator-backed UI, not mockups: `.playwright-artifacts/report20b/screenshots/`. Nine selected review images are versioned in `docs/report20b-screenshots/`, including desktop/mobile/tablet dashboards and editors, materials and phone landscape. Actual rendered captures were visually inspected for branding, legibility, touch controls and overlap. Existing A.1 captures go to `.playwright-artifacts/report20b/a1-screenshots/`; CONTACT/privacy/public regression captures are separate under the same directory. Only synthetic fixture data is used.

## Before production release

1. Owner reviews changes and confirms retention/deletion responsibilities, actual Firestore region and processor agreements in `PRIVACY_APPROVAL_CHECKLIST.md`. No automatic cloud report deletion is implemented; cancellation retains the report/audit.
2. Manually publish rules/indexes, wait for indexes, update the existing Report Worker with `--keep-vars`, then publish the frontend. No new secret, service, card or plan is required. Preserve existing accounts, variables and same-tab local drafts.
3. Verify production permissions, NFC/PWA on actual employee devices, two-device conflicts and real Workers Free CPU/subrequest headroom. Emulator correctness is not proof of a live project's configuration or resource limits.

Cloud limits are visible failures, not silent truncation: 50 material rows, 60,000 bytes form JSON, bounded field lengths, up to 20 distinct new catalog products per save. Large legacy drafts still retain local/PDF recovery. Work/catalog lists load additional bounded pages explicitly. Work filters run in Firestore across matching tasks; material substring search covers loaded catalog pages. Approvals, final archive and report email are intentionally outside B as requested. No recurring paid feature or temporary security shortcut was introduced.
