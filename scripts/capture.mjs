// One-off capture of the published Webflow site into src/ (kept for reference).
// Do not re-run it: src/ has since been edited by hand (Articles page dropped, podcast clips on YouTube).
// Downloads each page's HTML, localizes every asset (images, CSS, fonts, scripts) under src/assets/,
// and removes scripts we decided not to keep. Safe to re-run: it overwrites the captured pages.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ORIGIN = "https://www.marianhartman.com";
const OUT = path.resolve("src");
const PAGES = [
  ["", "index"],
  ["about-us", "about-us"],
  ["organizations", "organizations"],
  ["for-individuals", "for-individuals"],
  ["green-path-in-theory", "green-path-in-theory"],
  ["green-path-in-practise", "green-path-in-practise"],
  ["framework-comparisons", "framework-comparisons"],
  ["privacy-policy", "privacy-policy"],
  ["terms-conditons", "terms-conditons"],
  ["404", "404"],
];

// Hosts whose files get copied into the repo. Anything else is left pointing at its CDN.
const LOCALIZE_HOSTS = new Set([
  "cdn.prod.website-files.com",
  "d3e54v103j8qbb.cloudfront.net",
  "cdn.plyr.io",
]);
// Scripts removed on purpose (assessment Q5, Q6): Finsweet filter config and visualdx.
// goo-motion-library is kept: it drives the scroll animations (the goo="..." attributes in the markup).
const DROP_SCRIPT = /finsweetcomponentsconfig|visualdx/;
// Libraries served from npm (pinned in package.json) instead of a CDN.
const NPM_LIBS = [
  ["https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js", "/assets/vendor/swiper/swiper-bundle.min.js"],
  ["https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css", "/assets/vendor/swiper/swiper-bundle.min.css"],
  ["https://cdn.jsdelivr.net/npm/goo-motion-library@latest/dist/goo.bundle.js", "/assets/vendor/goo/goo.bundle.js"],
];

const downloaded = new Map(); // remote url -> local url path

function localPathFor(u) {
  const url = new URL(u);
  const clean = decodeURIComponent(url.pathname).replace(/^\/+/, "").replace(/[ ()]+/g, "-");
  return `/assets/${url.hostname}/${clean}`;
}

async function fetchBuffer(u) {
  const res = await fetch(u);
  if (!res.ok) throw new Error(`${res.status} ${u}`);
  return Buffer.from(await res.arrayBuffer());
}

async function localize(remote) {
  const url = new URL(remote);
  if (!LOCALIZE_HOSTS.has(url.hostname)) return null;
  url.search = "";
  url.hash = "";
  const key = url.href;
  if (downloaded.has(key)) return downloaded.get(key);
  const local = localPathFor(key);
  downloaded.set(key, local);
  let body = await fetchBuffer(key);
  if (key.endsWith(".css")) body = Buffer.from(await localizeCss(body.toString("utf8"), key));
  const file = path.join(OUT, local);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return local;
}

async function localizeCss(css, baseUrl) {
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  const found = [...css.matchAll(re)];
  const map = new Map();
  for (const m of found) {
    const ref = m[2];
    if (ref.startsWith("data:") || map.has(ref)) continue;
    const abs = new URL(ref, baseUrl).href;
    const local = await localize(abs);
    if (local) map.set(ref, local);
  }
  return css.replace(re, (all, q, ref) => (map.has(ref) ? `url(${q}${map.get(ref)}${q})` : all));
}

async function localizeHtml(html) {
  for (const [remote, local] of NPM_LIBS) html = html.split(remote).join(local);
  // Remove scripts we are not keeping.
  html = html.replace(/<script\b[^>]*\bsrc="[^"]*"[^>]*>\s*<\/script>/g, (tag) =>
    DROP_SCRIPT.test(tag) ? "" : tag,
  );
  // Every absolute URL on a localized host, in attributes, srcset and inline styles.
  const urlRe = /https:\/\/(?:cdn\.prod\.website-files\.com|d3e54v103j8qbb\.cloudfront\.net|cdn\.plyr\.io)(?:[^"'\s()<>,]|\([^)"'\s]*\))*/g;
  const urls = new Set(html.match(urlRe) ?? []);
  const replacements = new Map();
  for (const raw of urls) {
    const decoded = raw.replace(/&amp;/g, "&");
    try {
      const local = await localize(decoded);
      if (local) replacements.set(raw, local);
    } catch (err) {
      console.warn("  skipped:", err.message);
    }
  }
  // Longest first so a URL that is a prefix of another is not replaced inside it.
  for (const [raw, local] of [...replacements].sort((a, b) => b[0].length - a[0].length)) {
    html = html.split(raw).join(local);
  }
  // Local files no longer need Subresource Integrity or CORS attributes.
  html = html.replace(/\s+integrity="[^"]*"/g, "").replace(/\s+crossorigin="anonymous"/g, "");
  return html;
}

for (const [slug, name] of PAGES) {
  const url = `${ORIGIN}/${slug}`;
  console.log("capturing", url);
  const html = (await fetchBuffer(url)).toString("utf8");
  const out = await localizeHtml(html);
  const permalink = name === "index" ? "/index.html" : `/${name}.html`;
  const page = `---\npermalink: ${permalink}\n---\n${out}`;
  await writeFile(path.join(OUT, `${name}.html`), page);
}
console.log(`done: ${PAGES.length} pages, ${downloaded.size} assets`);
