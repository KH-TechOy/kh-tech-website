# REPORT 2.0 B – Setup and release order

Extends the existing Spark project and Report Worker. No new project, paid plan, credit card, Storage bucket, Cloud Function, mail service, database or Worker binding is required. Existing Authentication users, UIDs, Admin counter, service-account secret and A.1 onboarding settings remain. No deployment was executed.

## Verification

```text
npm ci
npm test -- --maxWorkers=2 --testTimeout=15000
npm run check:report
npm run test:report
npm run build
npm run report:bundle
```

Java 21 and Playwright Chromium are needed. `GAME_BROWSER_EXECUTABLE` may select the installed browser. Report integration tests require `demo-kh-tech-report` and never target production. `node scripts/run-report-tests.mjs --security-only` runs only security/integration tests. The bundle command is a dry-run. Use `VITE_BASE_PATH=/kh-tech-website/` for GitHub Pages and `/` for a custom-domain root.

For a targeted B rerun after the full A.1/B suite, `node scripts/run-report-tests.mjs --work-only` runs all emulator/workerd tests and the B browser file. It retains the same demo-project guard, token redaction and owned-emulator cleanup as the full command.

## Manual deployment order

1. Review changes and the result/security documents. Confirm retention and processing arrangements in the privacy approval checklist. Keep Firebase Spark and Workers Free; do not enable billing.
2. Employees save A.1 drafts and download PDFs including local photos. Keep the same tabs. Do not clear sessionStorage, reset accounts, re-provision the first Admin or delete collections.
3. Deploy rules/indexes to the existing, verified project: `firebase deploy --only firestore:rules,firestore:indexes --project <existing-project-id>`. Wait for workOrders and materialCatalog composite indexes to become ready. Do not recreate the database/change its region.
4. Update only the Report Worker: `npx wrangler deploy --config report-api/wrangler.jsonc --keep-vars`. Preserve Dashboard variables/secrets, `FIREBASE_WEB_API_KEY`, `FIREBASE_PROJECT_ID`, `SERVICE_ACCOUNT_JSON`, `ALLOWED_ORIGINS` and the SQLite Durable Object binding/migration. No new secret or IAM role is introduced.
5. Build with the existing public Firebase/API configuration and Pages base path, then publish through the existing workflow after owner approval. No workflow changes. Avoid B work and employee creation while versions are mixed.
6. Reload the original employee tab without clearing storage. Verify A.1 report ID, fields, materials and photos. First text edit/save can adopt a local report into the cloud; a different cloud version requires explicit conflict resolution. Photos stay local. No mass migration or automatic upload of shared legacy localStorage occurs.
7. Test Admin/Employee on the actual site, NFC URL and installed PWA. Create/assign work, edit from two devices, disconnect/reconnect, recover, submit and return. Check PDF and Employee purchase-price rejection. Verify existing real email onboarding.
8. Monitor actual Firestore usage and Free Worker CPU/subrequests, including cold starts and large material additions. Emulators do not establish production CPU consumption. If limits are hit, preserve local recovery and investigate; do not enable billing/weaken authorization.

Rollback must retain schema-2 documents, local snapshots and protective rules. Do not restore older permissive rules. An A.1 frontend rollback supports local drafts, but B cloud management then remains unavailable until compatible code is restored.

## Database and indexes

- `reports/<existing-report-id>`: schema 2, text form/material selling-price snapshots, protected billing, revision, owner/assignees, state, schedule/reference, comment, actors/timestamps and idempotency metadata. No photos/passwords.
- `workOrders/<report-id>`: small list metadata for assigned and independently created reports. Updated for list-visible changes, not each body edit. State changes commit with the report.
- `materialCatalog/<uuid>`: shared name/code/unit, selling cents, active flag and revision.
- `materialCosts/<uuid>`: optional purchase cents and price-bearing mutation fingerprint, Admin-only read. Neither price nor its deterministic hash is copied into reports/shared catalog. Existing safe legacy catalog IDs are accepted; new IDs are UUIDs.
- `auditEvents/work-<id>-<revision>` and `auditEvents/material-<id>-<revision>`: lifecycle/assignment/catalog records. No report copies/password/reset tokens. A.1 UUID audit records remain compatible.
- Existing `users`, `accessControl`, reserved `archiveMetadata` remain.

Indexes cover owner/assignee + updatedAt, all status/workDate filter combinations, and active + material name. Form, billing, comments and idempotency fields are exempt from indexing. Only the open report body has a realtime listener; dashboards use small metadata. Work lists paginate in 25-document live queries, materials in 100-document live queries, with explicit loading of additional pages and no total-page cap. Moving page boundaries rebuild downstream cursors. Work filters execute in Firestore across all matching tasks; the default view is active tasks. Material substring search covers loaded catalog pages. The date filter uses the report work date (prefilled from the order schedule).

Worker requests: 96,000 bytes; form: 60,000 UTF-8 bytes; 50 material rows. Resolve at most 20 new distinct catalog products per save; historical rows require no catalog read. Larger existing local/PDF drafts remain recoverable; cloud validation fails visibly instead of silently trimming them.

Work transactions budget retries from the payload: up to six attempts for ordinary text, fewer for assignment checks/catalog reads, and one for the largest new-catalog batch. The conservative work budget is 30 estimated subrequests, leaving authentication/rate-limit headroom; actual Free limits still need production observation, including first-login/cold-start paths. Exhausted contention is reported as a revision conflict. If reloading shows the same server revision, the client retries after its debounce; a genuinely newer cloud version still requires explicit resolution. A.1 administrative retry behavior remains.

## Free-tier budget

Verified 11 November 2026: Firestore free quota is 50,000 reads/day, 20,000 writes/day, 1 GiB storage and 10 GiB/month outbound. Paid-only TTL/PITR/backups are not enabled. Workers Free permits 100,000 requests/day, 10 ms CPU/invocation and 50 external subrequests/invocation. Sources: [Firestore quotas](https://firebase.google.com/docs/firestore/quotas), [Worker limits](https://developers.cloudflare.com/workers/platform/limits/), [listener charging](https://firebase.google.com/docs/firestore/pricing#listening_to_query_results), [transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).

Estimate for 10 users, 20 jobs/day, 150 changed saves/job (busy editing with frequent pauses): 3,000 body writes plus about 200–400 metadata/audit/catalog writes/day; approximately 12,000 transactional/profile reads, 3,000–6,000 open-report listener reads and a few thousand list/profile/catalog reads. Retries, devices, reconnects and rule-dependent reads increase this. Authentication and Durable Object quotas apply separately. At about 900 changed saves/job the write ceiling is close; monitor usage.

At 5–15 KiB/report, 20 reports add 100–300 KiB raw text/day plus metadata/audits/indexes. Maximum-size reports grow faster. No remote photo storage. Owner-approved retention/deletion is required before accumulating customer records indefinitely; cancellation is not deletion. This estimate does not promise unlimited free operation or production resource-limit acceptance.
