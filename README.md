# Green Path website

Static site for **https://www.marianhartman.com**, built with [Eleventy](https://www.11ty.dev/) and hosted free on GitHub Pages. It was moved from Webflow in October 2026 and looks the same as the old site.

## How it works

- `src/` holds the pages as plain HTML (`index.html`, `about-us.html`, and so on), plus `src/assets/` for images, CSS, fonts and scripts. Edit these files directly.
- `npm run build` turns `src/` into `_site/`, which is what gets published.
- Every push to `main` runs the **Deploy site** workflow (`.github/workflows/deploy.yml`), which builds and publishes. A change is live about a minute after it is pushed.

## Making a change

1. Edit the page in `src/`.
2. Preview it: `npm install` once, then `npm start` and open http://localhost:8080.
3. Commit and push to `main`. The site updates by itself.

Notes:
- Pages are captured Webflow HTML, so class names look like `heading-style-h2`. Styles are in `src/assets/cdn.prod.website-files.com/…/css/green-path.webflow.shared.*.css`.
- Scroll animations come from `goo-motion-library`, the footer year and anchor offset from `visualdx`. Both are pinned in `package.json` and copied into the site at build time.
- Webflow's own runtime (nav, dropdowns, lightbox) is still included under `src/assets`.
- `scripts/capture.mjs` is the one-off script that copied the site out of Webflow. Do not run it again, because it would overwrite hand edits.

## Articles and Substack

- Every "Articles" link goes to https://changethatsticks.substack.com. There is no Articles page.
- The three article cards on the home page are updated automatically from Substack by `scripts/sync-substack.mjs`. They sit between the `<!-- articles:start -->` and `<!-- articles:end -->` markers in `src/index.html`. Do not edit between the markers by hand.
- The sync reads Substack's archive endpoint and falls back to the RSS feed. Cover images are saved under `src/assets/articles/`.
- **Substack blocks GitHub's servers**, so the sync cannot run as a GitHub Action. A Windows scheduled task called **Green Path - Sync Substack** runs `scripts/sync-and-push.ps1` every day at 9:00 AM on the site owner's PC. If the PC was off, it runs when the PC next starts. When a new post exists it updates the cards and pushes, and the site redeploys.
- The task's log is `%LOCALAPPDATA%\GreenPathSync\sync.log`.
- To run it by hand: `npm run sync`, then commit and push the changes.

## Domains and DNS

DNS is managed at Namecheap, under Advanced DNS.

| Domain | Setup |
| --- | --- |
| `www.marianhartman.com` | CNAME to `mhwilleke.github.io`. This is the GitHub Pages custom domain. |
| `marianhartman.com` | Four A records to GitHub Pages (185.199.108–111.153). GitHub redirects it to `www`. |
| `marianhhartman.com`, `www.marianhhartman.com` | Namecheap URL Redirect (301) to `https://www.marianhartman.com`. HTTPS on these two shows a certificate warning, which is a Namecheap limit. |

- Email on both domains is Namecheap email forwarding (the `eforward…` MX records). Do not remove them.
- `keystoneapp.marianhhartman.com` belongs to a different site. Do not touch it.
- GitHub Pages allows one custom domain, set under the repo's Settings, Pages.

## Troubleshooting

- **Site did not update after a push:** check the Deploy site run under the repo's Actions tab.
- **Home page cards are out of date:** open the sync log above. If it shows a failure, run `npm run sync` by hand and read the error.
- **Sync reports 403:** Substack is refusing the request. It works from the PC but not from GitHub's servers.
- **HTTPS warning on the main domain:** under Settings, Pages, confirm the custom domain is `www.marianhartman.com` and "Enforce HTTPS" is ticked. If the certificate is missing, remove the domain and add it again.
