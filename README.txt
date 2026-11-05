KH-TECH OY — STARTER DOCUMENTS v2 (5.11.2026)
=================================================

This package contains:
  IDEA.md          Product requirements, company copy notes, design, architecture,
                   report PDF specification, game design, safety and phases.
  CODEX_PROMPT.md  One master instruction file for the VS Code Codex agent.
  README.txt       This setup and deployment guide.

GOAL
  A Finnish LVI business website, /report/ PWA PDF report creator,
  and /peli/ top-down repair game. First demo is static and free to host.

IMPORTANT LIMITATIONS
  - GitHub Pages cannot directly send email or secure a staff password.
  - The technical recipient khtech.site@gmail.com must not be published.
  - A real private-recipient contact form requires a backend.
  - Automatic PDF attachment email requires a tested backend; mailto cannot attach it.
  - Password KH-Tech2026 is not safe to ship; rotate and validate on server.
  - Codex should first produce a local demo without pretending these are live.
  - No guarantees of perpetual free tiers; quotas and terms can change.

CREATE GITHUB REPOSITORY
  1. Sign in at https://github.com/ using the company account.
  2. Click + > New repository.
  3. Name: kh-tech-website (example; choose any available name).
  4. Public visibility is simplest for GitHub Pages on GitHub Free.
  5. Do NOT tick 'Add README', .gitignore or license if starting locally.
  6. Click Create repository and copy its HTTPS URL.

CONNECT VS CODE PROJECT (PowerShell terminal)
  cd "C:\path\to\KH-Tech"
  git init
  git branch -M main
  git add .
  git commit -m "Initial KH-Tech project"
  git remote add origin https://github.com/YOUR-USERNAME/kh-tech-website.git
  git push -u origin main

  If the repo already has git initialized, skip 'git init'. If 'origin'
  already exists, use 'git remote set-url origin URL' instead.
  Never commit passwords, tokens, .env files or customer data.

CODEX FIRST PROMPT (paste in VS Code)
  Read IDEA.md and CODEX_PROMPT.md completely. Implement the full local
  demo (B001-B003), run builds/tests, and write IMPLEMENTATION_REPORT.md.
  Do not deploy, enable paid services or pretend email delivery/login works.

AFTER CODEX CREATES THE PROJECT
  npm install
  npm run dev
  npm run build
  git add .
  git commit -m "Build KH-Tech website demo"
  git push

ENABLE GITHUB PAGES
  1. GitHub repository > Settings > Pages.
  2. Under Build and deployment, Source: GitHub Actions.
  3. Ensure Codex generated a working Pages workflow under
     .github/workflows/ and Vite base is set to /kh-tech-website/
     for a project site. Workflow may need repository permissions:
     pages: write and id-token: write.
  4. Push to main; check Actions for a green deployment.
  5. Preview at https://YOUR-USERNAME.github.io/kh-tech-website/
     Report: .../kh-tech-website/report/
     Game: .../kh-tech-website/peli/
  6. Test direct refresh of /report/ and /peli/ and all asset URLs.

CUSTOM DOMAIN (LATER)
  Configure the custom domain kh-tech.fi under Settings > Pages only
  after owner approval. Update Vite base to '/' for custom domain, adjust
  CNAME and DNS at Zoner, enable HTTPS, and preserve MX/SPF/DKIM/DMARC.
  Back up the existing website and DNS before switching. Do not switch
  the live domain merely to demonstrate the prototype.

EMAIL INTEGRATION (LATER)
  Investigate Google Apps Script under khtech.site@gmail.com, verify
  current MailApp quotas, anonymous web app access model, anti-spam
  protection, payload/attachment limits and real end-to-end tests.
  Store recipient and staff credentials server-side, never in frontend.
  If security or free quotas are insufficient, retain local PDF download
  and use the company's ordinary email manually.

OWNER CHECKLIST BEFORE LIVE LAUNCH
  [ ] Confirm services, public phone, public email and coverage area.
  [ ] Obtain official logo and approved real photos.
  [ ] Approve privacy text and processing of customer contact details.
  [ ] Decide secure staff authentication and rotate shared password.
  [ ] Verify email delivery and spam protections before enabling form.
  [ ] Check PDF on iPhone and Android, test game controls on both.
  [ ] Approve custom domain cutover and keep existing email DNS intact.
