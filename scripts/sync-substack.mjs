// Refreshes the three article cards on the home page from the Substack publication.
// Run by the "Sync Substack" workflow every day, or by hand: npm run sync
// It only edits the block between the articles:start / articles:end markers in src/index.html
// and adds cover images under src/assets/articles/. If Substack cannot be read it changes nothing and exits 1.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const PUBLICATION = "https://changethatsticks.substack.com";
const HOME = path.resolve("src/index.html");
const IMAGE_DIR = path.resolve("src/assets/articles");
const COUNT = 3;
const DEFAULT_AUTHOR = "Marian Heather Hartman";
const AVATAR = "/assets/cdn.prod.website-files.com/68eca9ef78e99a08798b099c/6901f31b431a40de0ca3c8e5_MHH-1.webp";
const AVATAR_ALT = "Black and white portrait of a woman wearing a hat, smiling with her hand resting near her chin.";
// Webflow interaction id that the existing cards carry (drives the hover animation).
const CARD_WF_ID = "4011cd64-21d9-3ab0-0c3a-ace4595d2523";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; green-path-sync)" };

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Primary source: the archive endpoint (unofficial, but gives subtitle and cover image).
async function fromArchive() {
  const posts = await getJson(`${PUBLICATION}/api/v1/archive?sort=new&limit=20`);
  return posts
    .filter((p) => p.type === "newsletter" && p.canonical_url && p.title)
    .map((p) => ({
      title: p.title.trim(),
      subtitle: (p.subtitle ?? p.description ?? "").trim(),
      url: p.canonical_url,
      image: p.cover_image,
      author: p.publishedBylines?.[0]?.name ?? DEFAULT_AUTHOR,
      date: p.post_date,
    }));
}

// Fallback: the public RSS feed (newest 15 posts).
async function fromRss() {
  const res = await fetch(`${PUBLICATION}/feed`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${PUBLICATION}/feed`);
  const xml = await res.text();
  const tag = (block, name) => {
    const m = block.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`));
    return m ? decode(m[1].trim()) : "";
  };
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
    title: tag(item, "title"),
    subtitle: tag(item, "description"),
    url: tag(item, "link"),
    image: item.match(/<enclosure[^>]*url="([^"]+)"/)?.[1],
    author: tag(item, "dc:creator") || DEFAULT_AUTHOR,
    date: tag(item, "pubDate"),
  }));
}

async function latestPosts() {
  let posts;
  try {
    if (process.env.SYNC_FORCE_RSS) throw new Error("SYNC_FORCE_RSS is set");
    posts = await fromArchive();
  } catch (err) {
    console.warn("archive endpoint failed, using RSS:", err.message);
  }
  if (!posts || posts.length < COUNT) posts = await fromRss();
  posts = posts.filter((p) => p.title && p.url).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (posts.length < COUNT) throw new Error(`only found ${posts.length} posts`);
  return posts.slice(0, COUNT);
}

async function saveCover(post) {
  if (!post.image) return null;
  const slug = new URL(post.url).pathname.split("/").filter(Boolean).pop();
  // Ask Substack's image CDN for a 1000px-wide copy (cards show at most 818px), in WebP where supported.
  const resized = post.image.replace("f_auto,", "w_1000,c_limit,f_auto,");
  const imageHeaders = { ...HEADERS, Accept: "image/webp,image/*" };
  let res = await fetch(resized, { headers: imageHeaders });
  if (!res.ok) res = await fetch(post.image, { headers: imageHeaders });
  if (!res.ok) throw new Error(`${res.status} cover image for ${slug}`);
  const type = res.headers.get("content-type") ?? "";
  const ext = { "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[type.split(";")[0]] ?? "jpg";
  const file = `${slug}.${ext}`;
  await mkdir(IMAGE_DIR, { recursive: true });
  const target = path.join(IMAGE_DIR, file);
  const bytes = Buffer.from(await res.arrayBuffer());
  // Only rewrite when the image changed, so unchanged posts produce no Git diff.
  const existing = await readFile(target).catch(() => null);
  if (!existing || !existing.equals(bytes)) await writeFile(target, bytes);
  return `/assets/articles/${file}`;
}

function cardHtml(post, imageSrc) {
  return (
    `<div role="listitem" class="article-item w-dyn-item"><div data-w-id="${CARD_WF_ID}" class="article_card">` +
    `<div class="article-thumbnail_wrapper"><img src="${imageSrc}" loading="lazy" alt="" sizes="(max-width: 479px) 100vw, 400px" class="article-thumbnail"/>` +
    `<div class="arrow"><svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 27 27" fill="none" class="arrow-icons"><path d="M9.82955 17.4888L16.4022 8.7516M16.4022 8.7516L8.74727 9.83388M16.4022 8.7516L17.4845 16.4065" stroke="currentColor" stroke-width="1.56191" stroke-linecap="round" stroke-linejoin="round"></path></svg></div></div>` +
    `<div class="article_content"><div class="artcle_header"><div class="text-size-large text-weight-semibold min-height">${esc(post.title)}</div>` +
    `<div class="text-size-small text-color-black80 text-style-1line">${esc(post.subtitle)}</div></div>` +
    `<div class="article-info_wrap"><div class="author-bio"><img src="${AVATAR}" loading="lazy" alt="${esc(AVATAR_ALT)}" class="author-avatar"/>` +
    `<div class="text-size-xs text-weight-medium text-color-secondary">${esc(post.author)}</div></div></div></div>` +
    `<a href="${esc(post.url)}" class="absolute-link w-inline-block"></a></div></div>`
  );
}

const posts = await latestPosts();
const cards = [];
for (const post of posts) {
  const image = await saveCover(post);
  if (!image) throw new Error(`no cover image for ${post.url}`);
  cards.push(cardHtml(post, image));
}

const html = await readFile(HOME, "utf8");
const start = "<!-- articles:start -->";
const end = "<!-- articles:end -->";
const from = html.indexOf(start);
const to = html.indexOf(end);
if (from === -1 || to === -1) throw new Error("articles:start / articles:end markers not found in src/index.html");
const next = html.slice(0, from + start.length) + cards.join("") + html.slice(to);
if (next === html) {
  console.log("home page already up to date");
} else {
  await writeFile(HOME, next);
  console.log("updated home page with:", posts.map((p) => p.title).join(" | "));
}
