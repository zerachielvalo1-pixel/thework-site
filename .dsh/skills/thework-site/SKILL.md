---
name: thework-site
description: Use when working on The Work (thework.tw78.workers.dev), the Tarlac State University student publication site — Cloudflare Workers + Supabase architecture, deploys, images, Open Graph previews, service worker, security headers, contrast, and caching. Load this before deploying, before touching image handling, and whenever a link preview, offline behaviour, or stale-asset problem comes up.
---

# The Work — operating procedures

Static SPA on Cloudflare Workers with Supabase content. No build step, no dependencies. Full reference lives in the repo's `AGENTS.md`; this skill is the task-oriented companion.

Working directory: the repo root (contains `wrangler.jsonc`, `app.js`, `sw.js`).

---

## Deploy

1. **Bump the cache-buster in `index.html` for any changed asset.**
   `styles.css?v=N` / `app.js?v=N`. Skipping this has already caused production
   and the repo to serve different CSS under the same URL.
2. **Bump `CACHE_VERSION` in `sw.js`** — only when the `PRECACHE` list changed,
   not for every deploy.
3. `wrangler deploy`
4. If any `<meta>` / OG tag changed, re-scrape the affected URLs in Facebook's
   Sharing Debugger. Messenger caches previews aggressively; the code fix alone
   will not clear them.
5. **Verify.** Fetch the live page and confirm the `?v=` values match what's
   in `index.html`.

Confirm the result by fetching the live page and reading back the `?v=` values,
rather than trusting the deploy output.

---

## Changing how images are served

`imgUrl()` / `imgTag()` in `app.js` produce display URLs;
`renderImage()` / `socialCardUrl()` in `workers/prerender.js` produce preview
URLs. **They must stay in sync.**

Rules for the Supabase render endpoint — each of these was learned by breaking it:

- Always pass `resize=contain`. `width` alone *stretches* the image.
- Never pass `format=jpeg` (HTTP 400). Omit `format` to get JPEG.
- Never use `format=webp` for anything a crawler reads.
- The renderer never upscales, so never declare the output dimensions.
- Route through `/render/image/public/`, not `/object/public/` — the latter
  sends `no-cache`.

To regenerate brand assets: run `scripts/optimize-images.py` (needs Pillow). It
reads `scripts/logo-tw.master.png` and rewrites the logo variants and app icons.

---

## 404 handling

The Worker's `not_found_handling` is set to `404-page`. This means:

- **Real pages that don't exist** (e.g., `/dasda`, `/test`, CSV dumps) return the
  branded 404 page with a `Status: 404` header.
- **Prerendered story pages** that return `null` from the database also 404 —
  never a `200` or a server error.
- Never put arbitrary HTML at the repo root (e.g., `test.html`, `old.html`).
  Anything not listed in `.assetsignore` is publicly served.

**Ghost button contrast bug:** The 404 page uses `var(--line)` for button borders,
which measures only ~1.9:1 against the dark paper — failing WCAG 1.4.11. Use
`var(--ink-3)` or another color that passes 3:1.

---

## Link previews (Open Graph)

- Crawlers **do not run JavaScript.** Only what `workers/prerender.js` emits
  matters. `updateArticleMeta()` in `app.js` is for the browser only.
- **Never point `og:image` at a `.webp`.** Facebook/Messenger/WhatsApp render it
  unreliably and fall back to a bare link. This was the original "shares show no
  thumbnail" bug.
- **Never send `format=jpeg` (or any `format`) on the og:image render URL.** The
  renderer answers HTTP 400 on `format=jpeg` — verified live 2026-10 — and the
  crawlers fetch a JSON error instead of a picture, so shares show bare links.
  Omit `format` entirely: the renderer then transcodes matched webp/jpeg uploads
  to JPEG itself (and leaves PNG as PNG). `socialCardUrl()` in `app.js` and
  `workers/prerender.js` **must stay byte-for-byte in sync**, including their
  `&amp;`-free query strings.
- **Never declare `og:image:width`/`height` unless they are accurate.** They were
  hardcoded to 1200×630, which matched no image in the bucket.
- Tags must **replace** the generic homepage defaults, not be appended — a
  crawler reads the *first* matching tag, so a leftover one silently wins.

---

## Debugging a link preview

```
curl -s -A "facebookexternalhit/1.1" https://thework.tw78.workers.dev/stories/<slug>/<id>
```

Check, in order:

1. `og:image` is not a `.webp`
2. No `og:image:width` / `height` declared
3. Every tag appears **exactly once** — duplicates let a stale generic one win,
   because crawlers read the first match
4. `og:image` actually resolves to `image/jpeg` or `image/png` when fetched

To test the Worker without deploying, import it under Node with a stubbed
`env.ASSETS` binding and call `worker.fetch(request, env, ctx)`. Copy it to a
`.mjs` file first, since Node treats `.js` as CommonJS here.

---

## CSP (Content Security Policy)

The Worker sets **two** policies:

- **Enforcing** (`Content-Security-Policy`): `script-src/wscript-src 'self'` only.
  Frames, objects, forms, plugins are blocked. This prevents inline script *execution*.
- **Report-only** (`Content-Security-Policy-Report-Only`): Same directive *plus*
  `'sha256-<hash>'` for one inline script. This allows that script to run while
  warning about other inline scripts.

**Workflow:** When you add new inline scripts, update `INLINES` in
`workers/prerender.js` with the new SHA-256. The script will work; when the
hash doesn't match, browsers silently block the script. To promote from report-only
to enforcing, remove the report-only header once you're confident everything is
hash-approved.

---

## Contrast issues (Dark mode)

- **Primary action color:** `#7C3AED` (3.45:1) → light mode, `#A855F7` (4.97:1).
- **Secondary text/ink:** Dark mode `#7C3AED` (3.86:1) vs `ink-4` `#81819B` (4.19:1).
- Use `color-mix(in srgb, var(--accent), white 35%)` for a generated lighter shade
  that stays on-brand while hitting AA.

---

## Date formatting on crawled pages

The Worker emits **full dates** `Sunday, October 11, 2026` for SEO/social, **not**
`2026-10-11`. The app.js code already formats this for the live site, but crawlers
see what the Worker sends — keep the Worker's `formatDate()` function in sync.

---

## Caching

- `?v=` assets: `max-age=31536000, immutable`. Browser never asks the origin again
  after first visit.
- Unversioned assets: `max-age=3600, must-revalidate` — one hour of freshness, then
  fresh request.
- 404 page: NOT immutable (clients may see an updated 404 after you fix it).

---

## Debugging the service worker or offline behaviour

Use the **Chrome DevTools Protocol**, not `--virtual-time-budget`: that flag
fast-forwards page timers but not browser-side service-worker IPC, so
registration never settles.

For responsive work use `Emulation.setDeviceMetricsOverride` — Chrome clamps its
own `--window-size`, so a 390px window is not a 390px viewport.

A local server on `127.0.0.1` is a secure context, so service workers register
without HTTPS. Note it cannot serve `/stories/*` (no Worker), so prerendered
story-page caching must be checked on the deployed site.

To measure what is actually cached, iterate `caches.keys()`, read each
`cache.match(req)`, and check `res.status` and `Content-Type`. A cache that
exists but holds **0 entries** is the signature of the opaque-response bug —
cross-origin `<img>` responses need a CORS re-fetch to be inspectable.

---

## Before adding any new file to the repo root

Read `.assetsignore` first. Anything not listed there is **publicly served**.
A full database dump once leaked this way.

---

## Known traps

- `PUBLISHED_COLUMNS` in `app.js` must include `status`, or three features fail
  silently (view counter, related articles, share URL canonical).
- Deploy config is `wrangler.jsonc` only. `main` is `workers/prerender.js`.
- There are no tests. For data-layer changes, at minimum confirm the fields the
  UI reads are actually present in the query result.
- On Windows PowerShell 5.1: `$home` collides with `$HOME`, `??` is unsupported,
  and `$var?query` inside a URL needs `${var}` braces.