# KH-Tech Oy — IDEA.md (v2, 2026-11-05)

## 1. Goal and non-negotiable constraints
Build a polished, Finnish-language, mobile-first company website and two lightweight sub-apps: a staff work-report PDF tool and a playful plumbing repair game. Deliver a working preview quickly, then publish on GitHub Pages. No mandatory subscriptions, payment cards, Firebase, Cloudflare, SMS gateways, paid email services, or database. The only planned recurring cost is the existing Zoner domain. Free service quotas and terms may change; never claim permanent free availability.

Owner-controlled technical account: khtech.site@gmail.com (PRIVATE DELIVERY DESTINATION; never display on the public website). The customer-facing contact information must use verified company details, not this technical inbox. The owner must approve content and assets before going live.

## 2. Company content and source provenance
Draft facts collected from public company website and company directory, subject to owner verification:
- Company: KH-Tech Oy; business ID 3413645-9; location Lohja, Finland.
- Public contact: Tomi Honka; telephone 040 073 6199; email tomi.honka@kh-tech.fi.
- Postal address (check whether appropriate for public display): Laiturikatu 14 C 49, 08100 Lohja.
- Services: LVI maintenance and repairs; pipe alterations and installations; balancing heating and domestic hot/cold water networks; water supply and sewer renovations.
- Working region: Uusimaa / Helsinki area as previously described; confirm actual coverage and wording.
- Sources to review: https://kh-tech.fi/ and https://www.proff.fi/yrityksen/kh-tech-oy/lohja/rakennusalan-ammattilaiset/3413645-9I07TR
These are research leads, not a claim of independent re-verification as of this revision. Do not invent emergency 24/7 availability, guarantees, licenses, reviews, years of experience, prices, reference jobs, team photos, or customer logos. Obtain original logo, favicon and licensed job photos from owner. Do not hotlink or scrape copyrighted photos. Until assets arrive, use tasteful CSS/SVG abstract pipe/water illustrations and an explicitly temporary text wordmark.

## 3. Routes and navigation
- `/` Home: strong headline, service overview, click-to-call, request CTA, coverage and concise trust copy.
- `/palvelut` Services: four factual categories with concise, practical customer-oriented descriptions.
- `/yritys` About company: owner-approved introduction, no made-up history.
- `/yhteystiedot` Contact and work/quote request form.
- `/tietosuoja` Privacy policy draft with real processor/data-flow placeholders clearly marked for owner approval.
- `/report` Staff-only work report tool, separate PWA install experience.
- `/peli` Plumbing puzzle game; small friendly teaser on home page, e.g. 'Odotellessasi: ehditkö pysäyttää vuodon?'.
- Provide helpful 404 handling and GitHub Pages-compatible deep links. Use Vite base configuration for a project Pages subpath, and make it configurable for custom domain at launch. Prefer HashRouter for reliable deep links on project Pages (`/#/report`) OR implement real static HTML route entrypoints for clean `/report/`; **preferred: actual `/report/index.html` and `/peli/index.html` with independent entrypoints**, plus `/palvelut/` etc. if practical. Never promise `/index.html/report` as a valid path: that is not how static routes work. The real preview path is `https://USERNAME.github.io/REPO/report/` and eventual custom domain `https://kh-tech.fi/report/`.

## 4. Visual / UX
Professional Finnish LVI business, not generic template. Navy #0B2038, water blue #26A9E0, white and neutral grey. Responsive from 320 px to desktop; WCAG-minded contrast, keyboard navigation, accessible labels, reduced motion, sticky mobile contact CTA. SEO titles, meta descriptions, OG placeholders, semantic headings, sitemap/robots adjusted for final domain, LocalBusiness JSON-LD with only owner-confirmed facts. Fast loading and minimal dependencies.

## 5. Contact / quote request
Fields: name (required), email and/or telephone (at least one required), location/municipality, service category, urgency (normal / soon / urgent; do not imply 24/7 response), preferred reply method (email/phone), free-text issue description (required), optional image attachments **only if the chosen delivery method supports them securely**. Consent/notice: privacy information and anti-spam honeypot. Do not collect excessive sensitive data.

Target private recipient: `khtech.site@gmail.com`, configurable via deployment/server secret; never embed the recipient as a visible public contact address. Owner replies manually by phone/email; no CRM or appointment system.

**Important static-hosting constraint:** GitHub Pages cannot directly send mail or hide a recipient in browser source. A mailto link exposes the address and cannot guarantee submission. For a genuinely private recipient and automatic delivery, a server-side endpoint is required.

Preferred zero-billing pilot: Google Apps Script Web App running under the business Google account, using MailApp and script properties for recipient and anti-abuse configuration. Review current Google quotas and Apps Script access model before production. A public Apps Script endpoint is abusable; implement strict input validation, size caps, rate limiting if feasible, honeypot, minimal error details, and test actual delivery. Apps Script does NOT magically provide robust IP-based rate limits or CAPTCHA; if abuse protection is insufficient, do not expose the endpoint publicly. A stronger free-tier gateway (e.g. Cloudflare Worker + Turnstile) is optional only with explicit approval and quota review. No secrets in frontend or Git.

**Fallback:** until a tested backend is configured, show a clearly labelled demo form and offer a click-to-call or mailto to the company's PUBLIC email, not the private delivery address. Never claim a request was sent if it wasn't. Avoid exposing private destination in frontend, HTML, source maps or public documentation deployed with the website.

Server sends a concise email with a searchable subject, e.g. `[KH-TECH][TYOPYYNTO][KIIREELLINEN] Lohja - 2026-11-05`, sanitized content and submission timestamp. Do not email customers automatically.

## 6. Staff work-report PWA `/report/`
Mobile-first with big touch targets, camera input (`accept=image/*` and capture where supported), autosaved local draft with explicit privacy warning, offline-capable app shell, clear status and export. Avoid storing client/job photos indefinitely; allow draft deletion. PWA installability is browser-dependent; HTTPS required for service workers outside localhost.

### Authentication / security
Requested pilot password `KH-Tech2026` is NOT safe as a production credential because it was shared in chat and would be readable if hardcoded in frontend. Do not embed it or its hash in shipped client JS. Implement a server-validated login (e.g. Apps Script server-side check with expiring session/token) before allowing staff-only server actions, with server-side authorization on every request; store the production secret only in Script Properties and rotate it before real use. A shared password gives no individual accountability. If secure login/session is not achievable in the free pilot, ship the report editor as a **local-only PDF generator without a misleading login gate**, and disable server-side send until secure auth exists. Avoid using localStorage as a trusted authentication source. A public static route can never truly conceal its HTML/JS; only sensitive data/actions are protected by backend authentication.

### Form contents
- Report ID (stable, collision-resistant): `KHT-YYYYMMDD-XXXXXX` where suffix is cryptographically random, generated once when draft is created; not based solely on address/date.
- Site/customer: customer or organization, work address, city, optional customer reference or job number.
- Work: service category, description of reported fault, observations, work completed, test/commissioning results, follow-up needs, notes.
- Timing: work date, arrival/start/end, duration calculated with manual override; separate travel time if needed.
- Worker: name, optional colleagues, contact or initials; avoid fabricated signatures.
- Materials: repeatable rows (description, quantity, unit, optional notes); no price requirement.
- Photos: before / during / after, captions, optional and compressed with quality checks.
- Optional customer acknowledgment/signature ONLY if owner requests and privacy requirements are met.
- Preview, validation, PDF export, clear/delete local draft, share via native Web Share API when supported.

### PDF requirements
A4 professional branded multi-page PDF with owner-provided logo (fallback typographic logo), report ID, date, customer/site info, technician, sections, materials table, photo pages with captions, page numbers, footer, no clipping or empty pages. Finnish fonts/diacritics work. Printable and searchable text, not a screenshot PDF. File name `KH-Tech_Tyoraportti_KHT-YYYYMMDD-XXXXXX.pdf` and subject `[KH-TECH][TYORAPORTTI][KHT-YYYYMMDD-XXXXXX] <city> <date>`. Searchable report ID appears in PDF header, filename and email subject.

### Delivery reality
Preferred: authenticated server-side PDF submission via Google Apps Script + MailApp to private recipient, **only if** supported attachment sizes, upload handling, auth and quota/abuse safeguards have been validated. Google Apps Script is not a general-purpose anonymous file-upload server; prototype and test before promising success. Keep recipient in server-side properties. If unavailable, use browser download + native Share API / user's own email app with manual attachment; explain that the file was generated but not automatically emailed. `mailto:` cannot attach arbitrary generated PDFs. No Firestore/Drive storage is required. Don't silently upload job photos to external services.

## 7. Game `/peli/`: Putkimestari
Original playful top-down 2D art with colorful chunky proportions and light arcade feel; **do not copy Brawl Stars art, assets, characters or trademarks**. Prefer Canvas + TypeScript, simple custom sprites/vector graphics, no backend.
- Mobile: virtual left joystick + right action button, responsive safe areas and landscape support; desktop: WASD/arrows, Space/E to interact, mouse/touch for menus.
- Loop: randomized seeded rooms/obstacles, leaking pipe, shutoff valve, 2-3 repair parts, repair point; collect parts, close valve, return to leak and hold action to fix.
- Each level solvable; validate reachability after procedural generation. A simple pathfinding check can regenerate bad layouts.
- Timer: level 1 = 90 seconds; later levels reduce gradually to a floor of 55 seconds; visible countdown and water spread meter; win when repaired before time runs out, lose when timer or flood meter reaches limit. Difficulty increases modestly, no ads or in-app purchases.
- Pause, restart, sound toggle, instructions, score/best local score, no personal data collection, reduced motion and simple accessibility alternative where possible.
- No forced autoplay/audio, game never blocks access to business contact actions.

## 8. Build strategy / batches
B001: public website + complete form UI (clearly demo until backend); SEO; responsive; GitHub Pages workflow; report/game route placeholders; tests.
B002: fully functional local report PWA editor and high-quality PDF export; no server delivery claims; tests with photos and multi-page reports.
B003: playable game with procedural levels, mobile/desktop controls, win/loss, tests.
B004: secure form delivery proof of concept via Apps Script; send real test email; server-side validation; failure handling; configure outside Git; owner approval required for deployment.
B005: report authentication and automatic PDF email delivery ONLY after technical feasibility/security verification; otherwise polished download/share fallback.
B006: end-to-end QA, mobile browsers, privacy review, real assets, domain and publication.
Codex should work autonomously through B001–B003 in sequence, run checks, and document blockers. Do not publish, create accounts, expose secrets or perform real email sends without user confirmation. Keep B004–B005 as clear integration tasks with setup instructions, not fabricated completion.

## 9. Acceptance checks
- `npm install`, `npm run build`, lint/tests pass; preview all routes on Pages project subpath.
- All visible company claims are owner-approved or clearly flagged for review.
- Mobile contact form is accessible, validates fields, and cannot falsely claim successful submission.
- Report produces valid multipage A4 PDF with unique ID, images, Finnish text, and easy local export.
- Game playable with keyboard and virtual joystick, randomly generated solvable maps, 90-second first-level timer.
- No production shared password, private inbox, API key or secret committed to repository or built JS.
- Documentation contains exact setup steps, test results, known limitations, free-tier quota caveats and owner sign-off checklist.
