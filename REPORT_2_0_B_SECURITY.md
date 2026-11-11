# REPORT 2.0 B – Security and synchronization

## Authorization

Existing Worker token verification, live Auth account state and active Firestore profiles remain. Every work mutation rechecks the actor profile in its Firestore transaction. A stale frontend role cannot grant authority. A.1 user-management, last-Admin protection, names and real password-setup delivery remain.

Firestore Rules allow Employees to read self-created/assigned reports and small work-order metadata; Admins see company work. Employees cannot list other employee profiles, read purchase costs/audits or write profiles/counters/archive metadata. Selling prices and report selling-price snapshots are intentionally shared with authorized Employees. Purchase prices/margins are never included in those documents. Hiding a control is not authorization.

Material mutation fingerprints include the private purchase price, so they are also stored only in `materialCosts`, never in the shared catalog. Publishing a deterministic hash of a guessable price would leak information even without publishing the price field. Idempotency checks read the private record inside the same transaction.

Schema-2 bodies/metadata cannot be written, deleted or downgraded by browser clients, including Admin. The Worker validates field allowlists, sizes, numbers, assignments, state and revision. Existing schema-1 metadata stays compatible. Editable draft metadata can be adopted without changing ID/owner/assignment; submitted/completed legacy metadata cannot be silently reopened. Shared browser drafts are never automatically adopted.

Admin-only: create/edit/reassign work orders, return for correction, cancel with a reason, manage catalog/private costs, correct protected billing/prices. Employees edit authorized unfinished text/quantities/manual rows, create personal reports and submit complete text. New catalog rows get canonical server prices; old rows retain snapshots. Employee manual items start at zero price for Admin correction. No approval/final archival/report email endpoint exists.

Lifecycle: NEW → IN_PROGRESS → PENDING_REVIEW → RETURNED → PENDING_REVIEW. Complete prefilled reports may submit from NEW. APPROVED is reserved and rejected. Cancellation is terminal and Admin-only. Employees cannot edit pending-review text; Admin may correct it. Reassignment is for unfinished work. Lifecycle/assignment/catalog audit events have independent actor/time/revision IDs; clients cannot overwrite history.

## Draft/conflict protocol

A.1 `draftSession` remains the live form store: immediate memory updates, local sessionStorage debounce about two seconds, blur/manual/page-exit flush. Cloud persistence has a separate controller/status. Neither local saves nor cloud acknowledgements reset newer input. Photos are excluded from cloud comparison/payload and keep local/PDF behavior. Remote hydration does not cancel local photo processing.

Each cloud write includes expected server revision and stable mutation ID. A transaction checks revision, current access/state and material snapshots before committing. One competing write wins. An ambiguous network/503 request retries with the **same ID, original payload and revision**. Replay of the latest identical mutation returns its result; different content fails. A replay overtaken by another write becomes a conflict, preserving local input.

A UID/report sessionStorage checkpoint records acknowledged revision/text. Server snapshots replace only clean or identical local text. Dirty text plus a newer server version enters conflict. Users inspect cloud text, download local recovery JSON (contains customer data), then explicitly choose cloud/local. Choosing local rereads the server revision and still uses a transaction; a third editor cannot be blindly overwritten. Choosing cloud requires confirmation. Photos remain local. No automatic last-writer-wins overwrite.

Switching reports flushes local state, with separate UID/report sessions. Logout preserves drafts; another account cannot open them through the app. Failed local writes remain in memory and keep logout/page-exit warnings. Revocation closes access without deleting recoverable local data. Server operations are denied to revoked accounts; offline data already loaded on a device cannot be remotely erased.

SessionStorage/recovery downloads are **not encrypted by this app**. Tab closing, browser failure/data deletion/quota limits can lose data. Fresh login/reload needs network validation; offline editing applies to already verified sessions, not an authorization bypass. Firestore uses memory cache, not persistent multi-user IndexedDB. Photos/PDF files do not synchronize.

## Requests and operational limits

Exact allowed origins, Bearer authorization and JSON only. A.1 administrative requests keep 4 KiB bounds; `/work` has a streaming 96 KiB bound. Unknown fields, embedded images and oversized forms fail. Work requests have a separate UID bucket (360/10 minutes), preserving A.1 admin throttle (30/10 minutes). No public signup to company data, browser service-account credential, report reset token, recurring paid job or billing activation.

Local emulator/workerd tests verify authorization/transactions, not company contracts, live configuration, published rules or production CPU headroom. See SETUP/RESULT for acceptance. CONTACT, game, navigation and deployment workflow are not repurposed for Report.
