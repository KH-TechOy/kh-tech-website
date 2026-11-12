# REPORT 2.0 B.1 – Production UX and workflow refinement

Implemented locally on the existing `main` branch. No push, deployment, real email or production data mutation was performed. The existing Report A/A.1/B services, permissions, editor and PDF remain the foundation.

## Changes

- **Workflow at both ends:** the top panel remains in place. A compact panel follows the complete editor/PDF section. Both render the same workflow function, state, comment draft, status, errors and callbacks. A synchronous in-flight guard disables both panels during a transition; the editor is temporarily read-only. Submission is offered only in editable backend states. Admin return/cancellation still require a comment, and cancellation requires confirmation. Navigation, conflict resolution and the saved-PDF action stay in the top panel rather than being duplicated.
- **Status badges:** text-labelled, distinct neutral/amber/purple/red/green/gray badges cover the existing `WorkStatus` values. Normal text contrast is tested against 4.5:1. No quotation-request state or approval transition was added; APPROVED remains reserved/rejected by the existing backend.
- **Finnish scheduling:** presentation uses DD.MM.YYYY and HH:mm. Simple text controls also accept numeric keypad entry (`12112026`, `0930`) without needing punctuation keys. Empty schedules show **Ajankohta avoin**; date-only schedules remain supported. Existing ISO date and Helsinki wall-clock schedule strings are preserved. They are never interpreted through the browser's local timezone or converted to UTC. Actual timestamp presentation explicitly uses Europe/Helsinki and the `h23` hour cycle. New report dates also use Helsinki. Spring DST gap times are rejected; autumn repeated wall-clock times retain their original value without inventing a UTC offset.
- **Management form drafts:** new/edit work orders, catalog creation/editing, Admin workflow comments, employee creation and display-name editing now use a shared form-draft session. State updates immediately in memory; sessionStorage writes debounce for two seconds and flush on field blur, navigation, page hide/visibility changes and refresh. Dirty/saving/saved/error states are visible. Restored work-order edits are reachable from the dashboard, separately from a new-order draft. A restored edit retains its original server revision so a later submission cannot silently overwrite a newer server version.
- **Safe recovery:** a module-level registry survives component/auth/profile rerenders and remounts. Stored drafts are separated by authenticated UID and form identity. Persistence acknowledgements do not hydrate/reset forms. A clean form reopened after successful editing uses the latest server revision; unfinished input still wins over new defaults. Unreadable saved data cannot be overwritten automatically; write/delete failures preserve the input and report an error. Only confirmed submission or explicit confirmed discard clears a draft, with a revision check protecting newer input. A partial form never creates an account, material or work order automatically. Existing request identities survive draft recovery and submission retries.
- **Material selector:** a clear dropdown arrow opens active materials even without search text. Name/code search, touch selection, arrow keys, Enter, Escape and labelled listbox/combobox semantics are supported. Results show selling price and unit. The existing bounded 100-document pages remain; opening/searching does not fetch the entire catalog. Additional loaded results and catalog pages are requested explicitly. Manual entry and backend canonical pricing/snapshot protections remain intact.
- **Price editing:** focusing selects the existing value. Text buffers allow empty/intermediate input and comma/dot decimals. Valid nonnegative values commit to integer cents on blur/Enter, with decimal rounding that avoids binary floating-point half-cent errors. Invalid values remain available for correction. Report price buffers are local drafts, with a separate notice until committed; incomplete text causes no Firestore write. Canonical billing/material changes continue through the existing report autosave and trusted Worker. Row totals use committed values. Purchase costs remain Admin-only.

## Files changed

- `src/reportAuth/WorkWorkspace.tsx`: shared workflow rendering, synchronized actions, comment drafts, edit recovery and formatted cards/filter.
- `src/reportAuth/WorkForms.tsx`: extracted existing order/catalog forms with per-user persistence and validated submissions.
- `src/reportAuth/formDraft.ts`, `useFormDraft.tsx`: whitelisted-shape draft restoration, live registry, debounce/flush/retry, explicit discard and revision-aware success clearing.
- `src/reportAuth/ReportInputs.tsx`: material dropdown and buffered monetary controls.
- `src/Report.tsx`: selector, price controls and Finnish report date/time UI; report-body autosave controller is unchanged.
- `src/reportAuth/ReportApp.tsx`, `employees.tsx`: management-draft flushing on logout and recovery for employee/name forms.
- `src/reportAuth/report-auth.css`: scoped bottom-panel, status, dropdown and draft/price feedback styles.
- `src/reportLocale.ts`, `src/reportDateInputs.ts`, `src/reportModel.ts`: Finnish formatting/validation/keypad helpers and Helsinki default report date.
- Unit tests in `src/reportLocale.test.ts` and `src/reportAuth/formDraft.test.ts`; emulator-backed browser regressions in `e2e/reportRefinement.playwright.ts`. Existing Report tests now scope duplicated workflow controls and expect the Finnish field/price presentation.
- `scripts/run-report-tests.mjs`: optional `--refinement-only` browser run retains emulator isolation, password-link redaction and Windows process cleanup. `CODEX_PROMPT.md` records the new maintenance constraints.

No public page, CONTACT, game, service-worker cache/data deletion, Firebase rules/index, Worker API/permission logic or GitHub Pages workflow change was made. No dependency/service/billing plan was added.

## Draft storage and limitations

Management drafts use `kht-report-forms:<encoded UID>:<encoded form identity>` with a versioned JSON envelope containing only the fields explicitly declared by that form. Passwords, Firebase reset tokens and service credentials are never included. Request UUIDs identify ordinary idempotent operations, not password reset actions. Report-body drafts/cloud checkpoints retain their existing keys and synchronization logic.

These are plaintext, tab-scoped recovery copies, **not encrypted storage or cross-device synchronization**. Logout/access revocation keeps recoverable data; another authenticated UID receives separate application state. Someone with browser/devtools access can inspect sessionStorage, so employees should use personal devices. Closing the tab, clearing storage, browser failures or quota errors can lose recovery data. A failed write preserves live memory until reload/closure; the UI explains the failure. Background snapshots do not merge unfinished management forms; stale edits require explicit review after a server revision conflict. Catalog search covers the currently loaded pages.

## Verification

| Check | Result |
| --- | --- |
| App TypeScript / GitHub Pages production build (`VITE_BASE_PATH=/kh-tech-website/`) | Passed |
| Report Worker TypeScript (`npm run check:report`) | Passed |
| Root unit/regression tests | **142/142 passed**, including preservation, failures/retry, pristine reactivation, dates/DST, money, PDF, CONTACT and 1,000 game seeds |
| Auth/Firestore Security Rules + Worker/workerd tests | **33/33 passed** |
| Existing A.1/B Report browser cases | **51/51 passed** |
| Final B.1 browser run (`npm run test:report -- --refinement-only`) | **27/27 passed**, desktop 1440×900, phone 390×844, tablet 768×1024 |
| CONTACT 3.1 browser regressions | **30/30 passed**; no real email |
| Existing public website browser tests | **15 passed**, 3 production-only PWA cases skipped in development |
| Privacy browser regressions | **9/9 passed** |
| Production PWA offline report-shell reload | **1/1 passed**; no unauthenticated editor exposure |
| Background build audit | All 7 sources / 33 hashed variants passed; supplied artwork unchanged |
| Report Worker production bundle (`npm run report:bundle`) | Passed, **103.45 KiB** upload / **25.94 KiB gzip**, dry-run only |

The B.1 tests prove both workflow locations, synchronized comments/errors/disabled states, a single request when both submit controls are clicked, return/resubmit/cancel, active catalog keyboard/touch selection, manual entries, comma/empty/negative prices, absence of partial price cloud writes, UID isolation, management-form reload/navigation/logout recovery, explicit discard, storage-error retry, a second edit of the same saved order, and badge contrast. Delayed employee creation/name responses cannot clear text written after navigation/remount; the browser tests gate the real emulator requests to verify this. Delayed catalog loads also check the local revision before applying a selection. Original Report browser cases verify real PDF download, cloud conflicts, draft failures, disabled users, onboarding and roles.

During QA, the new price test was made to finish its outstanding autosave before teardown, and the storage-failure case now counts actual creation requests instead of assuming no unrelated fixture jobs exist. The earlier complete 78-case browser run had all 51 existing cases green and two new-case failures (a late previous-fixture save and an emulator session-unavailable response). The final focused B.1 run is clean after that test-isolation correction; no product workaround or automatic authorization retry was added.

Actual emulator-backed captures are in `.playwright-artifacts/report20b1/screenshots/`. Desktop/mobile order forms, workflow panels and dropdowns were visually inspected for legibility, padding, focus indication, button size and overlap. Four compact desktop/mobile review captures are versioned in `docs/report20b1-screenshots/`. All captured pages pass horizontal-overflow checks. Existing Firebase/Phaser large-chunk build warnings remain; no new runtime package was added. The complete game browser matrix was not rerun; game model regressions are included in the 142 tests.

Browser tests use local Firebase Auth/Firestore emulators and the existing isolated Report service harness. They exercise actual UI/backend requests with synthetic fixture data. No inbox delivery, real employee account change, physical NFC scan or installation on a physical iOS/Android device is claimed.

## Firebase / Cloudflare changes

No Firebase Console setting, Security Rules/index update, new secret, database migration or Cloudflare binding is required. Existing Spark / Workers Free configuration remains.

The Report Worker imports the shared `emptyReport()` default-date helper. To apply Helsinki dates to **new unscheduled orders created by the Worker**, rebuild/redeploy the existing Worker as well as the frontend. Existing stored schedules/timestamps are not migrated or shifted. API payloads and revision/permission checks are unchanged.

## Exact manual release steps

1. Review this local commit and the screenshots. Preserve current employee sessions/drafts; do not clear site data, IndexedDB or the PWA.
2. From the repository root, with the existing Node 22 setup:

   ```powershell
   npm ci
   npm run check:report
   $env:VITE_BASE_PATH='/kh-tech-website/'
   npm run build
   npm run check:backgrounds
   npm run report:bundle
   ```

   `report:bundle` is a local dry-run, not a deployment. Keep all existing production `VITE_*` configuration. Do not enable emulator settings in production.
3. When the owner chooses to publish, use the existing authenticated Cloudflare setup to update the Worker, preserving server configuration/secrets:

   ```powershell
   npx wrangler deploy --config report-api/wrangler.jsonc --keep-vars
   ```

   No Firebase deployment command is needed. Do not re-provision users, replace credentials or enable billing.
4. Publish the reviewed `main` commit through the normal GitHub Pages process:

   ```powershell
   git push origin main
   ```

   Its existing workflow installs/builds with `/kh-tech-website/` and uploads `dist`, using the existing Firebase/Report/CONTACT repository variables. No workflow edits are needed. The local preview intentionally has no production Firebase/CONTACT credentials configured; authenticated browser QA uses the emulators. These publication commands were not run in this batch.
5. Once live, open/reload Report normally online. Verify one Admin and Employee flow: an unfinished order survives navigation/reload, an empty schedule remains open, comma prices and active material selection work, and top/bottom submit/return/cancel stay synchronized. Confirm existing cloud autosave/conflict handling and PDF on the intended employee devices. Existing tabs can retain their currently loaded version until normal reload; do not force reload an actively edited report.

References: [browser-dependent native time input presentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/time), [explicit locale/timezone formatting with Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat).
