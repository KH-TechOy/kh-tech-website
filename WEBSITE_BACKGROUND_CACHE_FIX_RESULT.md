# Website background deployment and cache fix

Implemented locally on `main`, on top of `5d664ef`. No push or deployment was performed. Supplied PNG artwork, section CSS, glass panels, Finnish copy, logos, Report/CONTACT/game logic and the GitHub Pages workflow remain unchanged.

## Proven cause

The old `SectionBackground` constructed URLs under `public/website/`. The website did **not** import `docs/website_bg_*.png`. The Pillow script was explicitly a one-off tool, and `npm run build` / GitHub Actions did not run it. Vite copied the previously committed WebPs unchanged into `dist/website/`.

All six updated PNG hashes differed from the historical optimization manifests. The unchanged source image 3 still matched. Read-only HTTP checks on 12 November 2026 also confirmed that all six production desktop WebPs returned HTTP 200 and were byte-for-byte equal to the old repository WebPs:

| Original source | Intended section | Previously deployed file |
| --- | --- | --- |
| `docs/website_bg_1.png` | Homepage hero | `website/hero-1774.webp` (114,238 bytes) |
| `docs/website_bg_2.png` | Homepage company section | `website/company-1774.webp` (89,604 bytes) |
| `docs/website_bg_4.png` | Services hero | `website/services-1672.webp` (99,558 bytes) |
| `docs/website_bg_5.png` | Company hero | `website/about-1672.webp` (114,834 bytes) |
| `docs/website_bg_6.png` | Contact hero | `website/contact-1672.webp` (85,330 bytes) |
| `docs/website_bg_7.png` | Privacy hero | `website/privacy-1672.webp` (79,014 bytes) |

The checked origin was `https://kh-techoy.github.io/kh-tech-website/`. This establishes a stale build-input problem, not merely a browser-cache problem. A hard refresh cannot turn an old deployed WebP into the new PNG artwork. The existing Service Worker did not intercept `website/` image requests at all; its static-cache matcher covered `assets/`, brand and game files instead.

## Fix and changed files

- `scripts/build-website-backgrounds.mjs`: one automatic local PNG → optimized WebP pipeline. Vite runs it before asset scanning in both normal builds and development. It reads the supplied originals, keeps the existing desktop sizes/mobile crops, clamps the one-pixel source-width difference for image 4, and performs resizing/compression only. No artwork is drawn/generated. Missing/corrupt sources fail instead of silently reusing an old image.
- `vite.config.ts`, `src/websiteBackgrounds.ts`, `src/Website.tsx`: import the generated WebPs through Vite. Actual production URLs are now `<base>/assets/hero-1774-<content hash>.webp`, etc., including every `srcSet` candidate. Changing artwork under the same PNG filename changes the encoded content and its URL. Tiny assets are explicitly kept as files rather than inline data URIs.
- `src/generated/website/` is ignored build output, with a source-SHA/variant manifest for auditing. Source bytes and generated variant hashes invalidate its build cache. The generator also handles unchanged image 3 through this same pipeline; its artwork remains unchanged.
- Removed the 33 obsolete committed `public/website/*.webp` derivatives. There is no second, unversioned background set in the new production artifact. The old Python command now forwards to the canonical Node generator instead of recreating obsolete public duplicates.
- `package.json` / lockfile declare existing Sharp 0.35.5 directly as a build-only dependency. No unrelated dependency version changed. `npm ci` on the existing Node 22 Actions runner supplies the native image tooling; no Python/Pillow or workflow modification is required.
- `scripts/build-offline-shell.mjs`: all hashed asset names participate in the shell revision, but large public background variants are excluded from PWA install precaching. The employee shell still precaches 20 core assets. Visited hashed images may use the existing runtime static cache safely.
- Added source/build checks and same-filename replacement regression tests; updated existing image URL assertions and historical visual-review scripts to use the current pipeline.

## Cache and user-data behavior

`public/sw.js` is unchanged. There is no new cache purge, `skipWaiting`, forced page reload, IndexedDB cleanup, localStorage cleanup, sessionStorage cleanup or report-draft migration. Existing shell-cache activation policy remains limited to its own old shell caches. A new image URL cannot match an old browser/SW cache key, including an old `website/hero-1774.webp` entry. This works even while an older worker still controls the page; it fetches the previously unseen asset URL normally.

An already open page retains its loaded code until normal navigation/reload. Offline clients cannot receive new artwork until online. No user-data clearing is needed or recommended.

## Verification

- GitHub Pages production build with `VITE_BASE_PATH=/kh-tech-website/`: passed, including TypeScript. Seven original sources produce 33 hashed variants (six updated images plus unchanged image 3); originals are byte-identical to the supplied commit. All variants together are approximately 2.4 MB; the largest is about 165 kB. A browser selects a responsive candidate rather than downloading all variants.
- `npm run check:backgrounds`: validates source SHA-256, generated/output byte hashes, actual Website JS URLs with the expected base, absence of obsolete public duplicates and exclusion of background images from the PWA precache. Detailed evidence: `.playwright-artifacts/background-cache/assets.json`.
- Unit tests include replacing a PNG in place, two successive Vite builds with changed asset URLs/SW revisions, root-domain and Pages bases, source preservation, and fail-closed missing/corrupt artwork.
- Production browser checks cover all six sections at desktop 1440×900 and phone 390×844, actual downloaded image hashes, successful decoding, stable section bounds, glass panels and no horizontal overflow. A controlled Service Worker with stale legacy image entries cannot override the new URLs; sessionStorage report data, localStorage, IndexedDB and an unrelated Cache Storage entry remain intact.
- Actual screenshots are in `.playwright-artifacts/background-cache/screenshots/`; all six sections were visually inspected at desktop and mobile sizes (12 captures). Existing text positions, glass surfaces and background subjects remain readable and visible.

Completed regression checks:

| Check | Result |
| --- | --- |
| Pages production build / TypeScript | Passed |
| Background source/build audit | 7 sources, 33 hashed variants passed |
| Root unit tests, including same-filename replacement | 127/127 passed |
| Report security / Worker / Firebase Emulator tests | 33/33 passed |
| Report A.1/B browser regressions | 51/51 passed |
| CONTACT 3.1 browser regressions | 30/30 passed |
| Privacy browser regressions | 9/9 passed |
| Existing website browser suite | 15 passed; 3 production-only cases skipped in development |
| New production background/cache browser tests | 4/4 passed |
| Production report PWA offline reload | 1/1 passed |
| Mobile game action/gameplay and homepage teaser smoke checks | 2/2 passed |
| Game asset integrity | Passed; 28 atlas frames and existing game/logo assets preserved |
| Lockfile consistency (`npm ci --dry-run --ignore-scripts`) | Passed |

The existing game-teaser test still expected the mascot tile removed by WEBSITE 2.3. Its assertion now matches the already-existing cinematic background/glass structure and checks both 390 px and 320 px widths. The game implementation was not changed. Browser tests use local service fixtures/emulators; no real contact/password email was sent, and production employee data was not accessed. The full game browser matrix was not rerun; the targeted mobile interaction check completes a level.

## Manual deployment

1. Review and publish this local commit using the normal repository process when approved. Do not publish only the original six-file PNG commit again: the build-pipeline fix and lockfile must be included.
2. Keep the existing GitHub Pages build configuration and public service variables. `npm ci` → `npm run build` → upload `dist` runs as before. No Firebase/Worker deployment, credential change or data migration is involved.
3. After Actions finishes, navigate/reload the public pages online. DevTools image `currentSrc` / Network should show `/kh-tech-website/assets/<section>-<size>-<hash>.webp`, not `/website/<section>-<size>.webp`. On a future custom-domain root build, use `VITE_BASE_PATH=/` and expect `/assets/...`.
4. Confirm all six new subjects at desktop/mobile sizes. Keep any active report tab/draft intact; do not clear site data or uninstall the PWA as a workaround. An existing open tab may keep its current code until normal navigation/reload.

The new deployment itself was not executed, so post-release live verification of the corrected URLs remains the owner's publishing step. Existing Firebase/Phaser build chunk-size warnings are unchanged.

References: [Vite asset imports, hashes and public-directory behavior](https://vite.dev/guide/assets.html), [Sharp installation and Node/platform support](https://sharp.pixelplumbing.com/install/).
