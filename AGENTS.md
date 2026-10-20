# The Work — agent & contributor context

The official student publication of Tarlac State University. Static site on
Cloudflare Workers, content in Supabase. **No build step.** Runtime assets live
under `public/`; deployment tooling, packages, workers, scripts, docs, and local
state stay outside the public asset directory.

Live: https://thework.tw78.workers.dev

---

## Architecture

```
Browser ──► Cloudflare Worker (workers/prerender.js)
              ├─ /stories/*   prerendered HTML + per-article OG tags (SEO)
              ├─ /sitemap.xml generated from Supabase
              └─ everything else ──► Workers Assets (`public/`)
                                        │
                                        └─► Supabase (Postgres + Storage)
```

The app is a single-page app with **hash routing** for views (`#/board`,
`#/admin`) but **clean path routing** for articles (`/stories/<slug>/<id>`).
That split is deliberate: social crawlers ignore `#fragments`, so articles need
real paths that the Worker can prerender.

### Files

| File | Role |
|---|---|
| `public/` | Workers Assets directory. Root-relative public URLs are preserved (`/`, `/app.js`, `/styles.css`, `/sw.js`, `/manifest.webmanifest`, `/404.html`, `/logo-*`, `/icon-*`). |
| `public/.assetsignore` | Wrangler asset exclusions for the configured `public/` directory. |
| `public/index.html` | SPA shell: all views, modals, overlays. ~950 lines. |
| `public/app.js` | **All** client logic in one IIFE. ~4,200 lines. |
| `public/styles.css` | All styling. ~1,420 lines. |
| `public/sw.js` | Service worker: offline shell + install prompt support. |
| `workers/prerender.js` | **The deployed Worker.** Prerender, OG tags, sitemap. |
| `wrangler.jsonc` | Deploy config. `main` points at the Worker above. |
| `public/manifest.webmanifest` | PWA manifest. |
| `scripts/optimize-images.py` | Regenerates public logos + app icons from `scripts/logo-tw.master.png`. |

---

## Deploy checklist

```
# 1. Bump the cache-buster for any changed asset (`public/index.html`)
styles.css?v=7      app.js?v=13

# 2. Bump CACHE_VERSION in `public/sw.js` — ONLY if the PRECACHE list changed

# 3. Ship it
wrangler deploy

# 4. If OG/meta tags changed, re-scrape in Facebook's Sharing Debugger
```

**The cache-buster is manual and it has already bitten us once.** Commit
`8817848` changed `styles.css` without changing `?v=7`, leaving the repo and
production serving *different CSS under the same URL*. Readers who had `v=7`
cached kept the old file. If you change an asset, bump its `?v=`.

---

## Hard-won gotchas

These were each discovered by breaking something. Read before touching the
relevant area.

### Supabase image renderer (`/storage/v1/render/image/public/`)

Thumbnails in the bucket are full-resolution uploads (some 4.5 MB). The renderer
resizes on the fly, but its API is quirky:

- **You must pass `resize=contain`.** With `width` alone the renderer
  *stretches* — a 1400×1400 upload came back as 960×1400.
- **`format=jpeg` returns HTTP 400.** Omit `format` entirely: the renderer then
  emits JPEG for webp/jpeg sources, and leaves PNG as PNG.
- **`format=webp` works, but never use it for `og:image`** — see below.
- **It never upscales.** A 908px-wide source requested at 1200 comes back 908px.
  This is why we never declare `og:image:width`/`height`.
- It answers `Cache-Control: max-age=31536000`. The raw
  `/storage/v1/object/public/` endpoint answers **`no-cache`**, forcing a
  revalidation on every page view.
- **Image transformations are a Pro-plan feature**, quota 100 origin images/month
  then $5 per 1,000. A unique *image* counts once per month no matter how many
  sizes you request, so `srcset` widths are free.

Helpers: `imgUrl()` and `imgTag()` in `public/app.js`, mirrored by `renderImage()` and
`socialCardUrl()` in `workers/prerender.js`. **Keep the two in sync.**

### Link previews (Open Graph)

- Crawlers **do not run JavaScript.** Only what `workers/prerender.js` emits
  matters. `updateArticleMeta()` in `public/app.js` is for the browser only.
- **Never point `og:image` at a `.webp`.** Facebook/Messenger/WhatsApp render it
  unreliably and fall back to a bare link. This was the original "shares show no
  thumbnail" bug.
- **Never send `format=jpeg` (or any `format`) on the og:image render URL.** The
  renderer answers HTTP 400 on `format=jpeg` — verified live 2026-10 — and the
  crawlers fetch a JSON error instead of a picture, so shares show bare links.
  Omit `format` entirely: the renderer then transcodes matched webp/jpeg uploads
  to JPEG itself (and leaves PNG as PNG). `socialCardUrl()` in `public/app.js` and
  `workers/prerender.js` **must stay byte-for-byte in sync**, including their
  `&amp;`-free query strings.
- **Never declare `og:image:width`/`height` unless they are accurate.** They were
  hardcoded to 1200×630, which matched no image in the bucket.
- Tags must **replace** the generic homepage defaults, not be appended — a
  crawler reads the *first* matching tag, so a leftover one silently wins.

### Service worker (`public/sw.js`)

- `<img src>` issues a **no-cors** request, so the response is **opaque**
  (status 0, body unreadable). An `if (response.ok)` guard silently skips
  caching every cross-origin image. The fix re-issues Storage image requests in
  CORS mode (Supabase returns `Access-Control-Allow-Origin: *`), which also
  avoids caching a 404 as a permanently broken image.
- **The Supabase REST API is deliberately never cached.** That origin also
  serves the admin panel; a cached response could show an editor stale rows.
- Offline works in three tiers: shell (always), visited story pages (yes), the
  article list (no — it comes from the uncached API).

### Database

- **`PUBLISHED_COLUMNS` in `public/app.js` must include `status`.** Omitting it makes
  `a.status === 'published'` always false, which silently broke three features
  at once: the view counter, the related-articles list, and the share URL /
  canonical tag. Nothing errored.
- Row Level Security is correctly configured — verify with the anon key that
  drafts and `profiles` return **0 rows**. Don't weaken it.

### Deploy hygiene

- **Only `public/` is uploaded as Workers Assets.** Packages, workers, scripts,
  docs, and local state remain outside the asset directory and are not public.
  A full dump of the articles table (including drafts and `deleted_by` metadata)
  was once served at `/articles_rows.csv`; CSV dumps stay gitignored and never
  belong in `public/`.
- **`.assetsignore` placement matters.** Wrangler reads `.assetsignore` from
  the configured assets directory, so any ignore rules for this deployment
  belong at `public/.assetsignore`, not the repository root. The root-level
  file is not consulted once `assets.directory` is `public`.
- Deploy config is `wrangler.jsonc` only (`main` = `workers/prerender.js`).

---

## Verify changes

There are **no automated tests**. Verification during development used:

- **Local static server + real Chrome.** `http://127.0.0.1` counts as a secure
  context, so service workers register normally.
- **Chrome DevTools Protocol** for anything involving the service worker.
  `--virtual-time-budget` fast-forwards page timers but **not** browser-side
  service-worker IPC, so registration never settles and every assertion sees a
  half-installed worker.
- `Emulation.setDeviceMetricsOverride` for responsive work — Chrome clamps its
  own `--window-size`, so a 390px window is not a 390px viewport.
- A Node harness that imports `workers/prerender.js` with a stubbed
  `env.ASSETS` binding, to assert on the exact HTML a crawler receives.

### Security headers (Layer 1)

The Worker sets these on every response:

```
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
permissions-policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
```

### CSP policies (Layer 1)

- **Enforcing** (`Content-Security-Policy`): `script-src 'self'; style-src 'self'`
  Only in the Worker. No inline scripts run in the enforcing policy.
- **Report-only** (`Content-Security-Policy-Report-Only`): Same directives plus
  `'sha256-...'` hashes for specific inline scripts (navigation, scroll, theme).

To promote from report-only to enforcing, update the INLINES array in
`workers/prerender.js` with new SHA-256 hashes, then remove the report-only
header once confident.

### Reading measure (Layer 2)

Default: 64ch. Wide articles: 78ch. Use `clamp(55rem, 70vmin, 78rem)` to
prevent measure collapse at narrow viewports.

### Contrast (Layer 2)

Dark background `#0D0720` uses accent `#7C3AED` (3.45:1), light background
`#FAF8FF` uses `#A855F7` (4.97:1). Secondary text `ink-4` `#81819B` (4.19:1).

---

## Known debt

1. **`public/app.js` is one ~4,200-line IIFE** with ~125 top-level functions. Splitting
   into ES modules (`data`, `render`, `admin`, `share`) needs no build step.
2. **No tests.** Two silent bugs shipped this year that a single smoke test
   asserting the Supabase column contract would have caught.
3. **Manual cache-busting** (see above).
