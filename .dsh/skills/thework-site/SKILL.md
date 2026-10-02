---
name: thework-site
description: Use when working on The Work (thework.tw78.workers.dev), the Tarlac State University student publication site — its Cloudflare Workers + Supabase architecture, deploys, images, Open Graph previews, or service worker. Load this before deploying, before touching image handling, and whenever a link preview, offline behaviour, or stale-asset problem comes up.
---

# The Work — operating procedures

Static SPA on Cloudflare Workers with Supabase content. No build step, no
dependencies. Full reference lives in the repo's `AGENTS.md`; this skill is the
task-oriented companion.

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

## Debugging a link preview

Crawlers do not run JavaScript — `app.js` is irrelevant here. Fetch the story URL
with a crawler user-agent and inspect what the **Worker** emits:

```
curl -s -A "facebookexternalhit/1.1" https://thework.tw78.workers.dev/stories/<slug>/<id>
```

Check, in order:

1. `og:image` is not a `.webp`
2. no `og:image:width` / `height` are declared
3. every tag appears **exactly once** — duplicates let a stale generic one win,
   because crawlers read the first match
4. `og:image` actually resolves to `image/jpeg` or `image/png` when fetched

To test the Worker without deploying, import it under Node with a stubbed
`env.ASSETS` binding and call `worker.fetch(request, env, ctx)`. Copy it to a
`.mjs` file first, since Node treats `.js` as CommonJS here.

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
  silently (view counter, related articles, share URL).
- `worker.js` is a stale duplicate of `workers/prerender.js` and is **not**
  deployed. Do not edit it or switch `wrangler.jsonc`'s `main` to it.
- There are no tests. For data-layer changes, at minimum confirm the fields the
  UI reads are actually present in the query result.
- On Windows PowerShell 5.1: `$home` collides with `$HOME`, `??` is unsupported,
  and `$var?query` inside a URL needs `${var}` braces.
