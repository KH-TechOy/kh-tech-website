# Codex master prompt — KH-Tech Oy (2026-11-05)

You are the senior full-stack engineer, designer, accessibility specialist and test engineer for KH-Tech Oy's website. Read `IDEA.md` and `README.txt` in full before coding. Do not ask me routine design questions: use tasteful defaults and document assumptions. Prioritize a demonstrable, polished, functioning preview with no monthly fees.

## Objective
Create from scratch a production-quality Finnish-first Vite + React + TypeScript website deployed eventually on GitHub Pages. Build three products within the same repo: (1) public company site and quote request UI; (2) installable mobile-first work-report PWA at `/report/`; (3) original top-down plumbing repair game at `/peli/`. The GitHub Pages project subpath must work correctly (base URL, assets, routing and direct refresh). Prefer independent static entrypoints for `/report/` and `/peli/` so clean paths work. No paid dependencies, Firebase, database or Cloudflare required for the preview.

## Work method
1. Inspect the repository. Write a short implementation plan and proceed without waiting for approval for local code changes.
2. Build B001 public website. Use factual service content and public contact information from IDEA.md, clearly flag unverified facts. Make contact CTA obvious. The recipient `khtech.site@gmail.com` is private and must never be exposed in the built public site or source. Do NOT fake submission; until backend exists show demo mode + public company mailto/call fallback.
3. Build B002 `/report/`: mobile-friendly form, repeatable material rows, image capture, local draft, PDF preview/export, unique searchable ID, professional multipage PDF with logo placeholder, PWA manifest and offline shell. No hardcoded `KH-Tech2026` password or pretend authentication. If a secure backend is absent, show 'Esittelytila — ei kirjautumista eikä automaattista sähköpostilähetystä' and keep report local. Explain download/share fallback clearly.
4. Build B003 `/peli/`: working original top-down game, procedural solvable levels, mobile joystick/action button, keyboard/mouse, 90-second level 1 timer, repair objective, pause/retry, win/loss and polished UI.
5. Scaffold B004/B005 integration docs for optional Google Apps Script email and secure staff login, but DO NOT deploy, claim a tested endpoint, expose a password, or send live emails. If implementing backend code, keep Apps Script files separately and include explicit setup, quotas, validation, auth and security warnings. Production must be blocked until actual tests pass.
6. Add SEO, metadata, favicon placeholder, accessibility, privacy draft, responsive layouts, install instructions, GitHub Actions Pages workflow, tests, and useful README.
7. Run `npm install`, `npm run build`, automated tests/lint if configured; fix failures. If possible run browser checks at 375px and 1440px and validate direct URL refresh. Produce `IMPLEMENTATION_REPORT.md` summarizing what really works, tests, open owner questions and remaining deployment actions.

## Guardrails
- Do not invent testimonials, licenses, project photos, prices or emergency response claims. No unlicensed external logos or Brawl Stars assets.
- Do not display private technical inbox as public contact.
- Do not put a shared password, password hash, API key, privileged Google token or other secret in browser code or repo. The shared password from the brief is compromised for production and must be rotated. A static site cannot enforce real access control; backend must validate sessions.
- Do not say a PDF is emailed unless a real authenticated delivery service confirms success. A mailto link cannot attach a PDF automatically.
- No data collection/remote upload without a privacy explanation and user action. No paid APIs or billing activation.
- Keep architecture modular, avoid needless packages, and write understandable code with comments only where useful.
- Work through all three local preview batches before stopping, unless blocked by missing essential owner assets or external service permissions. Use placeholders for missing logo and real job images.

## Definition of done
A nontechnical owner can browse a beautiful website, inspect service descriptions, try a clearly labeled demo contact form, generate/download a branded work-report PDF from a phone, and play the game. All are deployable to GitHub Pages. Automatic email sending and protected staff access are explicitly pending until secure backend integration is configured and verified.
