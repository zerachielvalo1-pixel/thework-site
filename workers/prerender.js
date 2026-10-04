const SITE_ORIGIN = 'https://thework.tw78.workers.dev';
const SUPABASE_URL = 'https://fgojhhgqpvnwtcqkornz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UiH_F3V2tFE1doecIb337w__hYVQIQf';
const CACHE_TTL = 600; // 10 minutes
const STALE_WHILE_REVALIDATE_SECONDS = 172800; // revalidate up to 2 days stale
const ARTICLE_COLUMNS = 'id,title,excerpt,body,thumbnail,date,updated,cat,subcat,author,author2,photojournalist,photojournalist_2,photo_courtesy,graphics_by,layout_by,layout_by_2,read,credits';
const CATEGORY_LABELS = {
  news: 'News', editorial: 'Editorial', opinion: 'Opinion',
  features: 'Features', literary: 'Literary', sports: 'Sports',
  devcom: 'DevCom', entertainment: 'Entertainment'
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function slugify(title) {
  return String(title || 'story').normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'story';
}

function storyPath(article) {
  return `/stories/${slugify(article.title)}/${encodeURIComponent(article.id)}`;
}

function storyDescription(article) {
  const value = article.excerpt || article.body || '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 300);
}

/* ---------- Responsive image delivery (mirrors app.js) ----------
   Without this, the prerendered page loads the raw full-resolution
   thumbnail, which a tall infographic blows right past the CSS
   max-height and gets cropped. Routing through Supabase's render
   endpoint with `resize=contain` scales it proportionally so the
   whole image stays visible. */
const IMG_OBJECT_PATH = '/storage/v1/object/public/';
const IMG_RENDER_PATH = '/storage/v1/render/image/public/';
const IMG_QUALITY = 55;

function imgUrl(url, width) {
  const src = String(url == null ? '' : url);
  if (!src || src.indexOf(IMG_OBJECT_PATH) === -1) return src;
  const sep = src.indexOf('?') === -1 ? '?' : '&';
  const supabaseUrl = src.replace(IMG_OBJECT_PATH, IMG_RENDER_PATH) + sep +
    'width=' + width + '&resize=contain&quality=' + IMG_QUALITY + '&format=webp';
  return '/api/image-proxy?url=' + encodeURIComponent(supabaseUrl);
}

function imgTag(url, widths, sizes, attrs) {
  const src = String(url == null ? '' : url);
  const extra = attrs || '';
  if (!src) return '';
  if (src.indexOf(IMG_OBJECT_PATH) === -1) {
    return `<img src="${escapeHtml(src)}"${extra}>`;
  }
  const largest = widths[widths.length - 1];
  const set = widths.map(w => `${imgUrl(src, w)} ${w}w`).join(', ');
  const sizeAttr = sizes ? ` sizes="${escapeHtml(sizes)}"` : '';
  return `<img src="${escapeHtml(imgUrl(src, largest))}" srcset="${escapeHtml(set)}"${sizeAttr}${extra}>`;
}

/* Only used as a fallback for social cards / non-Supabase URLs. */
function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : `${SITE_ORIGIN}/logo-tw.png`;
  } catch {
    return `${SITE_ORIGIN}/logo-tw.png`;
  }
}

const RENDER_PATH = '/storage/v1/render/image/public/';
const OBJECT_PATH = '/storage/v1/object/public/';
const OG_CARD = { width: 1200, height: 630, quality: 80 };

/* Route a Storage object through Supabase's on-the-fly image renderer.
   Anything not in our bucket (external thumbnails, the local logo) is returned
   untouched, since there is nothing to transform it with. */
function renderImage(url, params) {
  const src = String(url || '');
  if (src.indexOf(OBJECT_PATH) === -1) return src;
  const sep = src.indexOf('?') === -1 ? '?' : '&';
  return src.replace(OBJECT_PATH, RENDER_PATH) + sep + params;
}

/* The image used for link previews.
   Social crawlers never run our JavaScript and are far pickier than a browser.
   Nearly every thumbnail in the bucket is a .webp upload, which those crawlers
   do not reliably render, so the card is pulled through the renderer with NO
   `format` argument: that transcodes webp and jpeg to JPEG while leaving PNG as
   PNG, and both are formats every preview crawler accepts. (`format=jpeg` looks
   like the obvious way to force that, but the renderer answers HTTP 400 on the
   param - verified live 2026-10 - so it must never be sent.) resize=cover fits
   it to the 1.91:1 that Facebook, Messenger and X expect.

   og:image:width / og:image:height are deliberately NOT emitted. They used to be
   hardcoded to 1200x630, which matched no image in the bucket (uploads are
   square, portrait and landscape). Worse, the renderer never upscales, so a
   908px-wide source comes back 908x630 rather than 1200x630 - and declaring a
   size the file does not have is a documented reason for crawlers to drop the
   preview entirely. Omitting them lets the crawler measure the real file. */
function socialCardUrl(url) {
  const src = String(url == null ? '' : url);
  if (!src || src.indexOf(IMG_OBJECT_PATH) === -1) return src;
  const sep = src.indexOf('?') === -1 ? '?' : '&';
  /* Must stay byte-for-byte in sync with socialCardUrl() in app.js: no format
     param (that would 400), no width/height attributes downstream. */
  return src.replace(IMG_OBJECT_PATH, IMG_RENDER_PATH) + sep +
    `width=${OG_CARD.width}&height=${OG_CARD.height}&resize=cover&quality=${OG_CARD.quality}`;
}

/* The site is published in the Philippines, so previews get an explicit locale
   rather than being guessed from the crawler's own region. */
const OG_LOCALE = 'en_PH';

/* Story-page credits block. Mirrors renderStoryCredits() in app.js so the
   worker-prerendered page and the SPA-rendered page agree. Prefers the
   JSONB `credits` object; falls back to the legacy fixed columns for
   pre-migration articles. Returns empty string when none are present. */
function storyCreditsMarkup(article) {
  const creds = (article.credits && typeof article.credits === 'object') ? article.credits : {};
  const norm = (v) => Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  const photographers = norm(creds.photojournalists).length
    ? norm(creds.photojournalists)
    : [article.photojournalist, article.photojournalist_2].filter(Boolean);
  const courtesy = norm(creds.courtesy).length
    ? norm(creds.courtesy)
    : [article.photo_courtesy].filter(Boolean);
  const graphics = norm(creds.graphics).length
    ? norm(creds.graphics)
    : [article.graphics_by].filter(Boolean);
  const layout = norm(creds.layout).length
    ? norm(creds.layout)
    : [article.layout_by, article.layout_by_2].filter(Boolean);

  const lines = [];
  if (photographers.length) lines.push({ label: 'Photos',   value: photographers.join(' & ') });
  if (courtesy.length)      lines.push({ label: 'Courtesy', value: courtesy.join(', ') });
  if (graphics.length)      lines.push({ label: 'Graphics', value: graphics.join(' & ') });
  if (layout.length)        lines.push({ label: 'Layout',   value: layout.join(' & ') });
  if (!lines.length) return '';
  return `<div class="article-credits">${lines.map(l =>
    `<div class="credit-row"><span class="credit-label">${escapeHtml(l.label)}</span><span>${escapeHtml(l.value)}</span></div>`
  ).join('')}</div>`;
}

function isoDateTime(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  if (raw.indexOf('T') !== -1) return raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  return `${raw}T00:00:00+08:00`;
}

/* ---------- Article body renderer (mirror of app.js) ----------
   Must stay byte-for-byte in sync with renderArticleBody() in app.js, or
   the SPA modal and the prerendered story page will render the same
   article differently. Same esc-first-then-regex order, same rules. */
function renderInlineFormatting(escaped) {
  let out = escaped;
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|\s)\*([^*\n\s][^*\n]*?)\*(\s|$|[.,!?;:])/g, '$1<em>$2</em>$3');
  return out;
}

function renderArticleBody(text) {
  const raw = String(text || '');
  const parts = raw.split(/\n\s*\n/).filter(p => p.trim());
  if (!parts.length) return '';
  return parts.map(part => {
    const trimmed = part.trim();
    if (/^>\s?/.test(trimmed)) {
      const inner = trimmed.replace(/^>\s?/gm, '');
      return `<blockquote>${renderInlineFormatting(escapeHtml(inner)).replace(/\n/g, '<br>')}</blockquote>`;
    }
    const hm = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      const level = Math.min(4, hm[1].length + 1);
      return `<h${level}>${renderInlineFormatting(escapeHtml(hm[2]))}</h${level}>`;
    }
    return `<p>${renderInlineFormatting(escapeHtml(trimmed)).replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

/* The `articles.date` column is a plain YYYY-MM-DD while `updated` is already a
   full timestamp. The Open Graph article namespace expects ISO 8601 datetimes,
   so a bare date is anchored to midnight Philippine time (UTC+8) rather than
   left to the crawler to interpret - which would otherwise shift the published
   date by a day for anyone reading it west of Manila. */
function storyMarkup(article) {
  /* Mirror getCredits() from app.js. Prefer the JSONB array; fall back to
     the legacy two-slot columns for articles written before the migration.
     Separator is ", " to match the card and modal on the client side. */
  const creds = (article.credits && typeof article.credits === 'object') ? article.credits : {};
  const authorsArr = Array.isArray(creds.authors) && creds.authors.length
    ? creds.authors.map(String).filter(Boolean)
    : [article.author, article.author2].filter(Boolean);
  const authors = authorsArr.join(', ') || 'The Work Staff';
  const category = CATEGORY_LABELS[article.cat] || article.cat || 'Story';
  const dateMarkup = article.date ? `<time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time>` : '';
  const readTime = article.read ? ` · ${escapeHtml(article.read)} read` : '';

  /* Multi-width srcset so phones fetch the small variant and wide screens
     fetch the larger one. The CSS `.story-hero img` caps at 70vh with
     object-fit:contain, so the full image always shows. */
  const hero = article.thumbnail
    ? `<figure class="story-hero">${imgTag(
        article.thumbnail,
        [800, 1200],
        '(max-width: 900px) 100vw, 900px',
        ' alt="" fetchpriority="high" decoding="async"'
      )}</figure>`
    : '';

  const body = renderArticleBody(article.body)
    || (article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : '');

  return `<main id="view-story" class="view active" data-server-story="true">
    <article class="story-page">
      <div class="wrap story-page-inner">
        <div class="story-back-row">
          <a class="story-back" href="/#/">← All stories</a>
          <a class="story-back story-back-site" href="/">Back to site →</a>
        </div>
        <div class="story-category">${escapeHtml(category)}</div>
        <h1>${escapeHtml(article.title)}</h1>
        ${article.excerpt ? `<p class="story-deck">${escapeHtml(article.excerpt)}</p>` : ''}
        <div class="story-byline">By ${escapeHtml(authors)}${dateMarkup ? ` · ${dateMarkup}` : ''}${readTime}</div>
        ${storyCreditsMarkup(article)}
        ${hero}
        <div class="story-content">${body}</div>
        <div id="storyShare" class="modal-share">
          <div class="modal-share-label">Share this story</div>
          <div class="modal-share-buttons">
            <button class="share-btn" data-share="copy" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>Copy link</span></button>
            <button class="share-btn" data-share="messenger" type="button"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4l-2.6-2.7-5 2.7L8.2 11l2.6 2.7 4.9-2.7-2.7 3.4z"></path></svg><span>Messenger</span></button>
            <button class="share-btn" data-share="facebook" type="button"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"></path></svg><span>Facebook</span></button>
            <button class="share-btn" data-share="x" type="button"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg><span>X</span></button>
          </div>
        </div>
      </div>
    </article>
  </main>`;
}

async function fetchArticles(query) {
  const url = new URL('/rest/v1/articles', SUPABASE_URL);
  const params = { ...query };
  if (params.status === 'eq.published') {
    if (!Object.prototype.hasOwnProperty.call(params, 'deleted_at')) params.deleted_at = 'is.null';
    if (!Object.prototype.hasOwnProperty.call(params, 'or')) {
      params.or = `(publish_at.is.null,publish_at.lte.${new Date().toISOString()})`;
    }
  }
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
}

async function serveFreshOrStale(request, ctx, key, render) {
  const cache = caches.default;
  const cacheKey = new Request(key);
  const cached = await cache.match(cacheKey);
  const ageMs = cached ? (Date.now() - Number(cached.headers.get('tw-swr-at') || 0)) : Infinity;
  if (cached && ageMs < CACHE_TTL * 1000) return cached;
  if (cached) {
    // Serve stale instantly, refresh the cache in the background
    ctx.waitUntil(render(true));
    return cached;
  }
  return render(false);
}

async function renderStory(request, env, ctx, id) {
  const storyUrlKey = `${SITE_ORIGIN}/stories/${encodeURIComponent(id)}`;
  return serveFreshOrStale(request, ctx, storyUrlKey, async (isRevalidate) => {
    const rendered = await renderAndCacheStory(request, env, id, storyUrlKey, ctx, isRevalidate);
    if (rendered.status === 404) {
      const cache = caches.default;
      await cache.delete(new Request(storyUrlKey));
      return rendered;
    }
    if (rendered.status === 503) {
      const cache = caches.default;
      const stale = await cache.match(new Request(storyUrlKey));
      if (stale) return stale;
    }
    return rendered;
  });
}

async function renderAndCacheStory(request, env, id, storyUrlKey, ctx) {
  let response;
  try {
    response = await fetchArticles({
      select: ARTICLE_COLUMNS,
      id: `eq.${id}`,
      status: 'eq.published',
      limit: '1'
    });
  } catch {
    return new Response('Story is temporarily unavailable.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  if (!response.ok) {
    return new Response('Story is temporarily unavailable.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
    });
  }

  const rows = await response.json();
  const article = Array.isArray(rows) ? rows[0] : null;
  if (!article) {
    return new Response('Story not found.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
    });
  }

  const assetResponse = await env.ASSETS.fetch(new URL('/', SITE_ORIGIN));
  if (!assetResponse.ok) return assetResponse;
  let html = await assetResponse.text();
  const title = `${article.title} — The Work`;
  const description = storyDescription(article);
  const canonical = `${SITE_ORIGIN}${storyPath(article)}`;
  const image = safeImageUrl(article.thumbnail);
  /* Two different jobs: the page itself wants a responsive source (renderImage()
     is applied to the raw object above), while the link preview needs one
     fixed, crawler-safe card. The card URL is derived exactly once so it cannot
     be feed back through itself. */
  const cardImage = socialCardUrl(image) || `${SITE_ORIGIN}/logo-tw.png`;
  const setMeta = (htmlText, pattern, attrs) => htmlText.replace(pattern, () => `<meta ${attrs}>`);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, /<meta name="description"[^>]*>/i, `name="description" content="${escapeHtml(description)}"`);
  html = setMeta(html, /<meta property="og:type"[^>]*>/i, 'property="og:type" content="article"');
  html = setMeta(html, /<meta property="og:title"[^>]*>/i, `property="og:title" content="${escapeHtml(title)}"`);
  html = setMeta(html, /<meta property="og:description"[^>]*>/i, `property="og:description" content="${escapeHtml(description)}"`);
  html = setMeta(html, /<meta property="og:url"[^>]*>/i, `property="og:url" content="${escapeHtml(canonical)}"`);
  html = setMeta(html, /<meta property="og:locale"[^>]*>/i, `property="og:locale" content="${OG_LOCALE}"`);
  html = setMeta(html, /<meta property="og:image"[^>]*>/i, `property="og:image" content="${escapeHtml(cardImage)}"`);
  html = setMeta(html, /<meta name="twitter:card"[^>]*>/i, 'name="twitter:card" content="summary_large_image"');
  html = html.replace(/<link rel="canonical"[^>]*>/i, () => `<link rel="canonical" href="${escapeHtml(canonical)}">`);

  /* Preview-crawler tags. These must REPLACE the generic homepage defaults that
     index.html ships with, not be appended - a crawler reads the first matching
     tag, so a leftover `og:image:secure_url` pointing at the logo would quietly
     win over the story image. og:image:width / height / type are deliberately
     never emitted; see socialCardUrl above. */
  html = setMeta(html, /<meta property="og:image:secure_url"[^>]*>/i, `property="og:image:secure_url" content="${escapeHtml(cardImage)}"`);
  html = setMeta(html, /<meta property="og:image:alt"[^>]*>/i, `property="og:image:alt" content="${escapeHtml(article.title)}"`);
  html = setMeta(html, /<meta name="twitter:image"[^>]*>/i, `name="twitter:image" content="${escapeHtml(cardImage)}"`);
  html = setMeta(html, /<meta name="twitter:image:alt"[^>]*>/i, `name="twitter:image:alt" content="${escapeHtml(article.title)}"`);

  /* Open Graph article namespace. og:type is "article", so these are the
     properties Facebook, Slack, Discord and Google News read to show a date and
     section alongside the card. article:author is intentionally omitted: the
     spec wants profile URLs and there are no author pages to point at, so a
     bare name would be worse than nothing. */
  const published = isoDateTime(article.date);
  const modified = isoDateTime(article.updated) || published;
  if (published) {
    html = html.replace('</head>', () =>
      `<meta property="article:published_time" content="${escapeHtml(published)}">\n` +
      (modified ? `<meta property="article:modified_time" content="${escapeHtml(modified)}">\n` : '') +
      `<meta property="article:section" content="${escapeHtml(CATEGORY_LABELS[article.cat] || article.cat || 'News')}">\n` +
      `</head>`);
  }

  /* Preload the hero the page will actually render. It used to preload the raw
     bucket object, which is a multi-megabyte upload, so the "optimisation" was
     fetching megabytes before first paint. */
  if (image && image !== `${SITE_ORIGIN}/logo-tw.png`) {
    const srcset = [800, 1200].map(w => `${imgUrl(image, w)} ${w}w`).join(', ');
    html = html.replace('</head>', () =>
      `<link rel="preload" as="image" href="${escapeHtml(imgUrl(image, 1200))}"` +
      ` imagesrcset="${escapeHtml(srcset)}" imagesizes="(max-width: 900px) 100vw, 900px" fetchpriority="high">\n</head>`);
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description,
    datePublished: article.date || undefined,
    dateModified: article.updated || article.date || undefined,
    articleSection: CATEGORY_LABELS[article.cat] || article.cat,
    author: { '@type': 'Person', name: [article.author, article.author2].filter(Boolean).join(' & ') || 'The Work Staff' },
    publisher: { '@type': 'Organization', name: 'The Work', logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/logo-tw.png` } },
    /* The same normalised card as og:image, so Google News picks up an image it
       can actually fetch rather than a multi-megabyte bucket upload. */
    image: cardImage,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }
  };
  const jsonLd = JSON.stringify(schema)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');
  html = html.replace('</head>', () => `<script type="application/ld+json">${jsonLd}</script>\n</head>`);
  html = html.replace(/<main id="view-home" class="view active">[\s\S]*?<\/main>/i, () => storyMarkup(article));

  const headers = new Headers(assetResponse.headers);
  for (const header of ['content-length', 'content-encoding', 'etag', 'last-modified']) headers.delete(header);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL * 2}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`);
  const storyResponse = new Response(request.method === 'HEAD' ? null : html, { status: 200, headers });
  if (request.method === 'GET') {
    const cache = caches.default;
    try { await cache.put(new Request(storyUrlKey), storyResponse.clone()); } catch (e) { /* cache failure is non-fatal */ }
  }
  return storyResponse;
}

async function renderSitemap(env, ctx) {
  const key = `${SITE_ORIGIN}/sitemap.xml`;
  return serveFreshOrStale(null, ctx, key, async () => {
    let rows;
    try {
      const response = await fetchArticles({
        select: 'id,title,date,updated',
        status: 'eq.published',
        order: 'date.desc',
        limit: '1000'
      });
      if (!response.ok) throw new Error('Sitemap query failed');
      rows = await response.json();
    } catch {
      return env.ASSETS.fetch(new URL('/sitemap.xml', SITE_ORIGIN));
    }

    const urls = [`<url><loc>${SITE_ORIGIN}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`];
    for (const article of Array.isArray(rows) ? rows : []) {
      const lastmod = article.updated || article.date;
      urls.push(`<url><loc>${SITE_ORIGIN}${storyPath(article)}</loc>${lastmod ? `<lastmod>${escapeHtml(lastmod)}</lastmod>` : ''}</url>`);
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
    const response = new Response(xml, {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL * 2}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`
      }
    });
    const cache = caches.default;
    try { await cache.put(new Request(key), response.clone()); } catch (e) { /* non-fatal */ }
    return response;
  });
}

/* Same-origin upload proxy.
   Supabase Storage lives on a different origin from the site, so browsers
   with strict privacy defaults (Brave Shields, Firefox ETP Strict, Safari ITP)
   classify the upload as third-party and drop the Authorization header - the
   request dies as an opaque ProgressEvent with no status. Proxying the PUT
   through this Worker makes it same-origin as far as the browser is
   concerned, so the auth header rides along normally.

   Only POST is accepted, the body is streamed straight through, and the
   response is returned unmodified. Auth is enforced by Supabase on the
   other side, so this is not an open proxy. */
async function handleThumbUpload(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const path = new URL(request.url).searchParams.get('path');
  if (!path || !/^[A-Za-z0-9._-]+$/.test(path)) {
    return new Response('Bad path', { status: 400 });
  }
  const auth = request.headers.get('authorization') || '';
  const contentType = request.headers.get('content-type') || 'application/octet-stream';

  const upstream = await fetch(
    `${SUPABASE_URL}/storage/v1/object/thumbnails/${encodeURIComponent(path)}`,
    {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'apikey': SUPABASE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'false',
        /* Supabase prefixes `max-age=` a second time if you send it, producing
           a malformed header. Send the value only, with immutable appended. */
        'cache-control': '31536000, immutable'
      },
      body: request.body
    }
  );
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' }
  });
}

/* Image cache proxy — Cloudflare edge caches every render URL so repeat
   views never touch Supabase. This is the single biggest egress saver. */
async function handleImageProxy(request, ctx) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  const PREFIX = SUPABASE_URL + '/storage/v1/render/';

  if (!target || !target.startsWith(PREFIX)) {
    return new Response('Bad target', { status: 400 });
  }

  const cache = caches.default;
  const cacheKey = new Request(target, { method: 'GET' });

  let response = await cache.match(cacheKey);
  if (response) return response;

  response = await fetch(target, { cf: { cacheEverything: true } });
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set('cache-control', 'public, max-age=2592000, immutable');

  const cached = new Response(response.body, { status: response.status, headers });
  /* Without this, cache.match() above always misses and every image still hits
     Supabase. This is the line that actually saves the egress. */
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, cached.clone()));
  } else {
    await cache.put(cacheKey, cached.clone());
  }
  return cached;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/sitemap.xml' && request.method === 'GET') return renderSitemap(env, ctx);

    if (url.pathname === '/api/upload-thumb') return handleThumbUpload(request);
    if (url.pathname === '/api/image-proxy') return handleImageProxy(request, ctx);

    const match = url.pathname.match(/^\/stories\/[^/]+\/([^/]+)\/?$/);
    if (match && (request.method === 'GET' || request.method === 'HEAD')) {
      let id;
      try { id = decodeURIComponent(match[1]); } catch { return new Response('Story not found.', { status: 404 }); }
      return renderStory(request, env, ctx, id);
    }

    const response = await env.ASSETS.fetch(request);
    const assetPath = url.pathname.toLowerCase();
    const isStaticAsset = /\.(css|js|png|jpe?g|gif|svg|webp|ico|json|xml|txt|map|woff2?|ttf|otf|mjs)(?:\?.*)?$/.test(assetPath);
    if (isStaticAsset && response && request.method === 'GET') {
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'public, max-age=0, must-revalidate, stale-while-revalidate=86400');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  }
};
