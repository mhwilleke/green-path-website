# Green Path website

Static Eleventy site for https://www.marianhartman.com, hosted on GitHub Pages (repo `mhwilleke/green-path-website`). The owner is lightly to moderately technical and has Claude do all maintenance. Read `README.md` for how it is built, deployed and synced.

## Rules

- `src/*.html` are the source of truth and are edited by hand. They began as captured Webflow HTML. **Never re-run `scripts/capture.mjs`**: it would overwrite hand edits.
- Eleventy runs with the template engines off, so HTML is copied as is. Do not add `{{ }}` or `{% %}` expecting them to work.
- Pages use root-absolute paths (`/assets/...`). The site must be served from the root of a domain, not a subfolder.
- Never edit between `<!-- articles:start -->` and `<!-- articles:end -->` in `src/index.html`. `scripts/sync-substack.mjs` regenerates it.
- There is no Articles page, and every "Articles" link goes to https://changethatsticks.substack.com. This was a deliberate decision.
- Keep the animation library (`goo-motion-library`) and `visualdx` (footer year, anchor scroll offset). Removing either visibly breaks the site. Webflow's runtime scripts under `src/assets` are also still needed.
- Keep the URL `/terms-conditons`. The typo is in the original Webflow address.
- Do not push, change DNS or change GitHub Pages settings without the owner asking.

## Substack sync

- The three home page cards come from Substack. Substack returns 403 to GitHub's servers, so a GitHub Action cannot run the sync. Do not try spoofed headers to get around that.
- It runs from a Windows scheduled task, **Green Path - Sync Substack** (daily 9:00 AM, runs `scripts/sync-and-push.ps1`), on the owner's PC. Log: `%LOCALAPPDATA%\GreenPathSync\sync.log`.
- Manual run: `npm run sync`, then commit and push.

## Commands

- `npm install`, then `npm start` (dev server) or `npm run build` (output in `_site/`).
- Deploys happen on push to `main` (`.github/workflows/deploy.yml`).
- GitHub CLI is at `C:\Program Files\GitHub CLI\gh.exe` and is not on PATH.

## Domains

- DNS is at Namecheap. Custom domain `www.marianhartman.com`. The apex redirects through GitHub. The two `marianhhartman.com` domains use Namecheap URL redirects.
- Do not touch the MX records (email forwarding) or `keystoneapp.marianhhartman.com`, which belongs to another site.
- The old Webflow site is on a paid plan that drops to free on 4 November 2026. Webflow no longer serves the domain; DNS now points at GitHub.
