const SITE_ORIGIN = 'https://thework.tw78.workers.dev';
const SUPABASE_URL = 'https://fgojhhgqpvnwtcqkornz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UiH_F3V2tFE1doecIb337w__hYVQIQf';
const SITE_ORIGIN_URL = new URL(SITE_ORIGIN);
const SUPABASE_ORIGIN = new URL(SUPABASE_URL).origin;
const CACHE_TTL = 600; // 10 minutes
const STALE_WHILE_REVALIDATE_SECONDS = 172800; // revalidate up to 2 days stale
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif'
]);
const ARTICLE_COLUMNS = 'id,title,excerpt,body,thumbnail,date,updated,cat,subcat,author,author2,photojournalist,photojournalist_2,photo_courtesy,graphics_by,layout_by,layout_by_2,read,credits';
const FEED_COLUMNS = 'id,title,excerpt,date,updated,cat,author,author2,credits';
const PUBLIC_DATA_RESOURCES = {
  'board-members': {
    table: 'board_members',
    select: 'id,name,role,program,member_group,subgroup,initials,sort_order',
    order: 'sort_order.asc'
  },
  'board-photos': {
    table: 'board_photos',
    select: 'name,photo_url',
    order: 'name.asc'
  },
  releases: {
    table: 'issues',
    select: 'id,title,volume,issue_date,category,heyzine_url,cover_url',
    status: 'eq.published',
    order: 'issue_date.desc.nullslast'
  },
  videos: {
    table: 'videos',
    select: 'id,title,video_url,thumbnail_url,platform,published_at,description,broadcasters,broadcaster_2,videojournalist,videojournalist_2,videojournalist_3,video_courtesy,video_courtesy_2,director,director_2,writer,writer_2,writer_3,animator,animator_2,editor,technicians,subcategory,orientation,sort_order',
    status: 'eq.published',
    order: 'sort_order.asc'
  },
  memoriam: {
    table: 'memoriam',
    select: 'id,school_year,term_label,caption,photo_url,sort_order',
    order: 'sort_order.asc'
  }
};
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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function storyDescription(article) {
  const value = article.excerpt || article.body || '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 300);
}

/* Estimated reading time. Mirror of estimateReadTime() in app.js so the
   prerendered story page and the SPA-rendered one agree byte-for-byte.
   200 wpm, rounded to the nearest minute, minimum "1 min". Empty string
   for empty input so a byline with no body stays bare. */
function estimateReadTime(text) {
  const raw = String(text || '');
  if (!raw.trim()) return '';
  const clean = raw
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*#>`_~]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean).length;
  if (!words) return '';
  return Math.max(1, Math.round(words / 200)) + ' min';
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
  const src = isOwnedImageUrl(url) ? new URL(url).href : '';
  if (!src || src.indexOf(IMG_OBJECT_PATH) === -1) return src;
  const sep = src.indexOf('?') === -1 ? '?' : '&';
  const supabaseUrl = src.replace(IMG_OBJECT_PATH, IMG_RENDER_PATH) + sep +
    'width=' + width + '&resize=contain&quality=' + IMG_QUALITY + '&format=webp';
  return '/api/image-proxy?url=' + encodeURIComponent(supabaseUrl);
}

function imgTag(url, widths, sizes, attrs) {
  const src = isOwnedImageUrl(url) ? new URL(url).href : '';
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

/* Normalize thumbnail URLs before they reach page markup or social metadata. */
function safeImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && (url.origin === SITE_ORIGIN_URL.origin || url.origin === SUPABASE_ORIGIN)) {
      return url.href;
    }
  } catch {
    /* Invalid thumbnail URLs use the site's own logo below. */
  }
  return `${SITE_ORIGIN}/logo-tw.png`;
}

function isOwnedImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.origin === SITE_ORIGIN_URL.origin || url.origin === SUPABASE_ORIGIN);
  } catch {
    return false;
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
  if (!isOwnedImageUrl(src) || src.indexOf(OBJECT_PATH) === -1) return isOwnedImageUrl(src) ? src : '';
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
  const src = isOwnedImageUrl(url) ? new URL(url).href : '';
  if (!src || src.indexOf(IMG_OBJECT_PATH) === -1) return src;
  const sep = src.indexOf('?') === -1 ? '?' : '&';
  /* Must stay byte-for-byte in sync with socialCardUrl() in app.js: no format
     param (that would 400), no width/height attributes downstream.
     Routed through the same-origin Worker proxy so social crawlers hit
     Cloudflare's edge cache instead of Supabase. Absolute URL is required
     because crawlers don't honour <base href="/">. */
  const supabaseUrl = src.replace(IMG_OBJECT_PATH, IMG_RENDER_PATH) + sep +
    `width=${OG_CARD.width}&height=${OG_CARD.height}&resize=cover&quality=${OG_CARD.quality}`;
  return SITE_ORIGIN + '/api/image-proxy?url=' + encodeURIComponent(supabaseUrl);
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
  const authors = norm(creds.authors).length
    ? norm(creds.authors)
    : [article.author, article.author2].filter(Boolean);
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
  lines.push({ label: 'Writer', value: authors.length ? authors.join(', ') : 'The Work Staff' });
  if (photographers.length) lines.push({ label: 'Photos',   value: photographers.join(' & ') });
  if (courtesy.length)      lines.push({ label: 'Courtesy', value: courtesy.join(', ') });
  if (graphics.length)      lines.push({ label: 'Graphics', value: graphics.join(' & ') });
  if (layout.length)        lines.push({ label: 'Layout',   value: layout.join(' & ') });
  return `<div class="article-credits">${lines.map(l =>
    `<div class="credit-row"><span class="credit-label">${escapeHtml(l.label)}</span><span>${escapeHtml(l.value)}</span></div>`
  ).join('')}</div>`;
}

function isoDateTime(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return '';
    return `${raw}T00:00:00+08:00`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

/* Long date for display: "Sunday, October 11, 2026".
   Mirror of fmtDateLong() in app.js. The SPA story view and this prerendered
   page must agree, and they did NOT: this page printed the raw `2026-10-11`
   straight from the database while app.js printed the long form, so visitors
   arriving from a shared link (and every crawler) saw a different byline date
   than a reader who opened the story from the site. Same class of drift as
   the other mirrored helpers in this file; see the note on ALLOWED_IMG_ORIGINS.

   Hand-rolled rather than toLocaleDateString() on purpose: the Worker and the
   reader's browser could resolve ICU data differently, which would reintroduce
   exactly the drift this fixes. The weekday is computed in UTC so the result
   never shifts with the Worker's timezone.

   Returns the input unchanged when it is not a bare YYYY-MM-DD, so a value
   that arrived as a timestamp behaves exactly as app.js's version does. */
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday'];

function formatDateLong(value) {
  const raw = String(value == null ? '' : value).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return raw;
  const weekday = DAYS_LONG[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${MONTHS_LONG[month - 1]} ${day}, ${year}`;
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

/* ---------- Block image allowlist ----------
   Mirror of the same const in app.js. Only https:// URLs from these hosts
   render as <figure> images inside article bodies; anything else falls
   through to the text renderer. Must stay in sync with the client-side
   copy so prerendered and SPA-rendered bodies agree byte-for-byte. */
const ALLOWED_IMG_ORIGINS = [
  'https://fgojhhgqpvnwtcqkornz.supabase.co'
];

function isAllowedImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ALLOWED_IMG_ORIGINS.indexOf(url.origin) !== -1;
  } catch (e) {
    return false;
  }
}

function renderArticleBody(text) {
  const raw = String(text || '');
  const parts = raw.split(/\n\s*\n/).filter(p => p.trim());
  if (!parts.length) return '';
  return parts.map(part => {
    const trimmed = part.trim();
    /* Block image: a paragraph that is exactly `![alt](url)`. Checked
       before the paragraph fallback so the link regex never half-matches
       `[alt](url)` and emits `!<a ...>alt</a>`. Strict allowlist + https
       check; on any failure the block falls through to text. Must stay
       in sync with the same function in app.js. */
    const im = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
    if (im && isAllowedImageUrl(im[2])) {
      const altText = im[1] || '';
      const safeAlt = escapeHtml(altText);
      const src = im[2];
      const inner = src.indexOf(IMG_OBJECT_PATH) !== -1
        ? imgTag(src, [600, 1200], '(max-width: 900px) 100vw, 900px', ' alt="' + safeAlt + '" loading="lazy" decoding="async"')
        : '<img src="' + escapeHtml(src) + '" alt="' + safeAlt + '" loading="lazy" decoding="async">';
      const caption = altText ? '<figcaption>' + safeAlt + '</figcaption>' : '';
      return '<figure class="article-image">' + inner + caption + '</figure>';
    }
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
  const dateMarkup = article.date ? `<time datetime="${escapeHtml(article.date)}">${escapeHtml(formatDateLong(article.date))}</time>` : '';
  /* Prefer the stored value; estimate from the body for pre-migration
     articles whose read column is still empty. */
  const readValue = article.read || estimateReadTime(article.body);
  const readTime = readValue ? ` · ${escapeHtml(readValue)} read` : '';

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
        <div class="story-byline">${dateMarkup}${dateMarkup && readTime ? ' · ' : ''}${readTime.replace(/^ · /, '')}</div>
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

async function fetchPublicData(resource) {
  const config = PUBLIC_DATA_RESOURCES[resource];
  if (!config) return null;
  const url = new URL(`/rest/v1/${config.table}`, SUPABASE_URL);
  for (const [key, value] of Object.entries(config)) {
    if (key === 'table' || value == null) continue;
    url.searchParams.set(key, value);
  }
  return fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    }
  });
}

async function serveFreshOrStale(request, ctx, key, render) {
  const cache = caches.default;
  const cacheKey = new Request(key);
  const cached = await cache.match(cacheKey);
  const cachedAt = cached ? Number(cached.headers.get('tw-swr-at') || 0) : 0;
  const ageMs = cached && Number.isFinite(cachedAt) ? Date.now() - cachedAt : Infinity;
  if (cached && ageMs < CACHE_TTL * 1000) return cached;
  if (cached) {
    // Serve stale instantly, refresh the cache in the background
    ctx.waitUntil(render(true));
    return cached;
  }
  return render(false);
}

async function renderPublicData(request, ctx, resource) {
  const config = PUBLIC_DATA_RESOURCES[resource];
  if (!config) return new Response('Unknown public resource.', { status: 404 });

  const key = `${SITE_ORIGIN}/api/public-data?resource=${encodeURIComponent(resource)}`;
  const refresh = request.url && new URL(request.url).searchParams.has('refresh')
    && (request.headers.get('authorization') || '').startsWith('Bearer ');
  if (refresh) {
    const response = await fetchPublicData(resource);
    if (!response || !response.ok) return new Response('Public data is temporarily unavailable.', { status: 503 });
    const rows = await response.text();
    const fresh = stampCacheResponse(new Response(rows, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL * 2}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`
      }
    }));
    try { await caches.default.put(new Request(key), fresh.clone()); } catch (_) {}
    return fresh;
  }

  return serveFreshOrStale(request, ctx, key, async () => {
    let response;
    try { response = await fetchPublicData(resource); } catch (_) {
      return new Response('Public data is temporarily unavailable.', { status: 503 });
    }
    if (!response || !response.ok) return new Response('Public data is temporarily unavailable.', { status: 503 });
    const rows = await response.text();
    const fresh = stampCacheResponse(new Response(rows, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL * 2}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`
      }
    }));
    try { await caches.default.put(new Request(key), fresh.clone()); } catch (_) {}
    return fresh;
  });
}

function stampCacheResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('tw-swr-at', String(Date.now()));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
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

  let rows;
  try {
    rows = await response.json();
  } catch {
    return new Response('Story is temporarily unavailable.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
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
    datePublished: published || undefined,
    dateModified: modified || undefined,
    articleSection: CATEGORY_LABELS[article.cat] || article.cat,
    author: (() => {
      const creds = (article.credits && typeof article.credits === 'object') ? article.credits : {};
      const authors = Array.isArray(creds.authors) && creds.authors.length
        ? creds.authors.map(String).filter(Boolean)
        : [article.author, article.author2].filter(Boolean);
      return (authors.length ? authors : ['The Work Staff'])
        .map(name => ({ '@type': 'Person', name }));
    })(),
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
    const cacheable = stampCacheResponse(storyResponse);
    try { await cache.put(new Request(storyUrlKey), cacheable.clone()); } catch (e) { /* cache failure is non-fatal */ }
    return cacheable;
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
    const cacheable = stampCacheResponse(response);
    const cache = caches.default;
    try { await cache.put(new Request(key), cacheable.clone()); } catch (e) { /* non-fatal */ }
    return cacheable;
  });
}

/* Atom feed of the 20 newest published articles. Same caching strategy as
   the sitemap: serve stale instantly, refresh in the background, so the
   feed is fast for subscribers and cheap for Supabase. The query uses
   fetchArticles({status:'eq.published'}) which auto-applies the
   deleted_at=is.null and publish_at<=now filters - identical semantics
   to renderSitemap() and renderStory(). */
async function renderFeed(env, ctx) {
  const key = `${SITE_ORIGIN}/feed.xml`;
  return serveFreshOrStale(null, ctx, key, async () => {
    let rows;
    try {
      const response = await fetchArticles({
        select: FEED_COLUMNS,
        status: 'eq.published',
        order: 'date.desc',
        limit: '20'
      });
      if (!response.ok) throw new Error('Feed query failed');
      rows = await response.json();
    } catch {
      return env.ASSETS.fetch(new URL('/feed.xml', SITE_ORIGIN));
    }

    const articles = Array.isArray(rows) ? rows : [];
    const nowIso = new Date().toISOString();
    /* <updated> on the feed element must be the newest entry's timestamp,
       per RFC 4287. Fall back to "now" only when the feed is empty. */
    const feedUpdated = articles.length
      ? (isoDateTime(articles[0].updated || articles[0].date) || nowIso)
      : nowIso;

    const entries = articles.map(article => {
      const link = `${SITE_ORIGIN}${storyPath(article)}`;
      const published = isoDateTime(article.date) || '';
      const updated = isoDateTime(article.updated) || published || feedUpdated;
      const summary = storyDescription(article);
      const title = article.title || '';

      /* Prefer the JSONB credits array; fall back to the legacy two-slot
         columns for pre-migration articles. Same precedence as getCredits()
         in app.js and storyMarkup() in this file. */
      const creds = (article.credits && typeof article.credits === 'object') ? article.credits : {};
      const authorsArr = Array.isArray(creds.authors) && creds.authors.length
        ? creds.authors.map(String).filter(Boolean)
        : [article.author, article.author2].filter(Boolean);
      const authorName = authorsArr.join(', ') || 'The Work Staff';

      const category = CATEGORY_LABELS[article.cat] || article.cat || '';

      return `<entry>
    <title>${escapeHtml(title)}</title>
    <link href="${escapeHtml(link)}"/>
    <id>${escapeHtml(link)}</id>
    <updated>${escapeHtml(updated)}</updated>
    ${published ? `<published>${escapeHtml(published)}</published>` : ''}
    <summary type="text">${escapeHtml(summary)}</summary>
    <author><name>${escapeHtml(authorName)}</name></author>
    ${category ? `<category term="${escapeHtml(category)}"/>` : ''}
  </entry>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-PH">
  <title>The Work — Tarlac State University</title>
  <subtitle>The official student publication of Tarlac State University. Founded 1948.</subtitle>
  <link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="${SITE_ORIGIN}/"/>
  <id>${SITE_ORIGIN}/</id>
  <updated>${escapeHtml(feedUpdated)}</updated>
  <author>
    <name>The Work</name>
    <email>tsu.tw78@gmail.com</email>
  </author>
  <rights>© ${new Date().getFullYear()} The Work · Tarlac State University</rights>
  ${entries}
</feed>`;

    const response = new Response(xml, {
      headers: {
        'content-type': 'application/atom+xml; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL * 2}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`
      }
    });
    const cacheable = stampCacheResponse(response);
    const cache = caches.default;
    try { await cache.put(new Request(key), cacheable.clone()); } catch (e) { /* non-fatal */ }
    return cacheable;
  });
}

/* Same-origin upload proxy.
   Supabase Storage lives on a different origin from the site, so browsers
   with strict privacy defaults (Brave Shields, Firefox ETP Strict, Safari ITP)
   classify the upload as third-party and drop the Authorization header - the
   request dies as an opaque ProgressEvent with no status. Proxying the PUT
   through this Worker makes it same-origin as far as the browser is
   concerned, so the auth header rides along normally.

   Only POST is accepted, the body is read into a bounded buffer, and the
   response status is returned unmodified. Auth is enforced by Supabase on the
   other side, so this is not an open proxy. */
async function readBoundedBody(request, maxBytes) {
  if (!request.body) return { body: new Uint8Array(0), tooLarge: false };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        try { await reader.cancel(); } catch { /* the request is already over the limit */ }
        return { body: null, tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body, tooLarge: false };
}

async function handleThumbUpload(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const path = new URL(request.url).searchParams.get('path');
  if (!path || !/^[A-Za-z0-9._-]+$/.test(path)) {
    return new Response('Bad path', { status: 400 });
  }
  const auth = request.headers.get('authorization') || '';
  const rawContentType = request.headers.get('content-type');
  if (!rawContentType) {
    return new Response('Content-Type is required.', { status: 400 });
  }
  const contentType = rawContentType.split(';', 1)[0].trim().toLowerCase();
  if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(contentType)) {
    return new Response('Unsupported image content type.', { status: 415 });
  }

  const rawLength = request.headers.get('content-length');
  if (rawLength !== null) {
    const declaredLength = rawLength.trim();
    if (!/^\d+$/.test(declaredLength) || !Number.isSafeInteger(Number(declaredLength))) {
      return new Response('Invalid Content-Length.', { status: 400 });
    }
    if (Number(declaredLength) > MAX_UPLOAD_BYTES) {
      return new Response('Image upload is too large. Maximum size is 8 MiB.', { status: 413 });
    }
  }

  let bounded;
  try {
    bounded = await readBoundedBody(request, MAX_UPLOAD_BYTES);
  } catch {
    return new Response('Could not read image upload.', { status: 400 });
  }
  if (bounded.tooLarge) {
    return new Response('Image upload is too large. Maximum size is 8 MiB.', { status: 413 });
  }
  if (!bounded.body.byteLength) {
    return new Response('Image upload body is required.', { status: 400 });
  }

  let upstream;
  try {
    upstream = await fetch(
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
        body: bounded.body
      },
    );
  } catch {
    return new Response('Upload service is temporarily unavailable.', { status: 503 });
  }
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store'
    }
  });
}

/* Image cache proxy — Cloudflare edge caches every render URL so repeat
   views never touch Supabase. This is the single biggest egress saver. */
/* Articles REST proxy - Cloudflare edge caches every Supabase REST
   response for 5 minutes, so the majority of reads never touch
   Supabase at all. This is the single biggest egress saver for
   PostgREST traffic, which was 89% of total egress on Oct 4 (127 MB
   out of 143 MB).

   Only GET is accepted. Query string is passed straight through to
   Supabase with apikey + Authorization headers attached server-side,
   so no credential is ever exposed to the browser. The cache key is
   the full target URL, meaning each distinct query (select, filter,
   order) gets its own cache entry. */
async function handleArticlesProxy(request, ctx) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const target = new URL(SUPABASE_URL + '/rest/v1/articles');
  /* Copy every query param the browser sent, EXCEPT the `_` cache-buster.
     PostgREST treats unknown params as column filters and would error on
     `_` since it is not a real column. The `_` stays in the cache key
     (see cacheKey below) so a unique admin URL always misses the cache,
     but it never reaches Supabase. */
  for (const [key, value] of url.searchParams.entries()) {
    if (key === '_') continue;
    target.searchParams.set(key, value);
  }

  /* The signed-in staff member's JWT arrives here in the standard
     Authorization header. Forwarding it to Supabase lets the
     `articles_auth_read_all` RLS policy run under the authenticated
     role, which is the only way scheduled articles and drafts become
     visible — the `articles_public_read` policy that anon requests
     hit filters them out (`publish_at <= now()`). */
  const clientAuth = request.headers.get('authorization') || '';
  const isAuthenticated = clientAuth.startsWith('Bearer ');

  /* Admin sends a `_` cache-buster (see listAll() in app.js) so an edit
     shows up immediately instead of waiting for the 5-minute edge cache
     to expire. Either that or a valid JWT forces the cache to be
     skipped entirely. The public read path (no `_`, no auth header)
     keeps its cache as before. */
  const bypassCache = url.searchParams.has('_') || isAuthenticated;

  const cache = caches.default;
  /* The cache key includes a fragment that distinguishes authed from
     anon reads. Fragments are stripped before the fetch is made, so
     Supabase never sees them; only the local Cache API is affected.
     This prevents an authed read from poisoning the anon cache entry
     (and vice versa) now that the two paths produce different
     result sets under RLS. */
  const cacheKey = new Request(url.toString() + (isAuthenticated ? '#auth' : '#anon'), { method: 'GET' });

  let response = bypassCache ? null : await cache.match(cacheKey);
  if (response) {
    /* CF cache HIT - served without touching Supabase at all. */
    const headers = new Headers(response.headers);
    headers.set('x-cache', 'HIT');
    return new Response(response.body, { status: response.status, headers });
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      /* Forward the client's JWT when present. Anonymous callers keep the
         publishable key, which restricts them to the public-read subset. */
      Authorization: isAuthenticated ? clientAuth : `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    },
    cf: { cacheEverything: true }
  });

  if (!upstream.ok) return upstream;

  const headers = new Headers(upstream.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('x-cache', bypassCache ? 'BYPASS' : 'MISS');
  if (bypassCache) {
    /* Do not let anything cache this response — not the browser, not the
       Cloudflare edge, not the Worker's own Cache API. */
    headers.set('cache-control', 'no-store, must-revalidate');
    return new Response(upstream.body, { status: 200, headers });
  }

  headers.set('cache-control', 'public, max-age=300, s-maxage=300');
  const cached = stampCacheResponse(new Response(upstream.body, { status: 200, headers }));
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, cached.clone()));
  } else {
    await cache.put(cacheKey, cached.clone());
  }
  return cached;
}

async function handleImageProxy(request, ctx) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  let targetUrl;
  try { targetUrl = new URL(target); } catch { targetUrl = null; }
  if (!targetUrl || targetUrl.protocol !== 'https:' || targetUrl.origin !== SUPABASE_ORIGIN || !targetUrl.pathname.startsWith('/storage/v1/render/')) {
    return new Response('Bad target', { status: 400 });
  }

  const cache = caches.default;
  const cacheKey = new Request(target, { method: 'GET' });

  let response = await cache.match(cacheKey);
  if (response) return response;

  response = await fetch(target, { cf: { cacheEverything: true } });
  if (!response.ok && [400, 404, 501].includes(response.status)) {
    /* Image transformations are not available on every Supabase plan. Fall
       back to the owned raw object so the free-tier deployment still renders
       the story, while the Worker continues to cache the result at the edge. */
    const rawPath = targetUrl.pathname.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
    const rawUrl = new URL(SUPABASE_URL);
    rawUrl.pathname = rawPath;
    rawUrl.search = '';
    response = await fetch(rawUrl.toString(), { cf: { cacheEverything: true } });
  }
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set('cache-control', 'public, max-age=2592000, immutable');

  const cached = stampCacheResponse(new Response(response.body, { status: response.status, headers }));
  /* Without this, cache.match() above always misses and every image still hits
     Supabase. This is the line that actually saves the egress. */
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(cache.put(cacheKey, cached.clone()));
  } else {
    await cache.put(cacheKey, cached.clone());
  }
  return cached;
}

/* ---------- Response hardening ----------
   Every response the Worker returns leaves through withSecurityHeaders(), so
   the shell, prerendered stories, generated XML and static assets all carry
   the same policy.

    The two hashes below are the inline story-text-size and theme bootstrap
    scripts in index.html. Recompute the hashes if either inline block changes:
     node -e "const c=require('crypto');console.log('sha256-'+c.createHash('sha256').update(process.argv[1]).digest('base64'))" '<script body>'

   `style-src` retains `unsafe-inline` because the existing shell and app
   generate many style attributes. Moving those declarations to classes would
   allow that exception to be removed without changing the public markup. */
 const CSP_HASHES = [
    "'sha256-x9r5k91+P90X/tWgCcGnwIQuMaVEn5+zH9QoifD1k+4='",
    "'sha256-9Fg/G4fUH05y1mBrkKLzALOSNHL2Gbd+SlKIRo+/254='"
 ];
 const CSP_POLICY = [
   "default-src 'self'",
   "base-uri 'self'",
   "object-src 'none'",
   "frame-ancestors 'none'",
   "form-action 'self'",
   "script-src 'self' " + CSP_HASHES.join(' ') + " https://cdn.jsdelivr.net https://cloud.umami.is",
   "script-src-attr 'unsafe-hashes' 'sha256-MhtPZXr7+LpJUY5qtMutB+qWfQtMaPccfe7QXtCcEYc='",
   /* Existing templates use style attributes throughout the shell and admin;
      keep this narrow exception until those declarations move to CSS classes. */
   "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
   "font-src 'self' https://fonts.gstatic.com",
   "img-src 'self' data: blob: " + SUPABASE_ORIGIN + " https://i.ytimg.com",
   "connect-src 'self' " + SUPABASE_ORIGIN + " https://cloud.umami.is https://fonts.googleapis.com https://fonts.gstatic.com",
   "frame-src 'self' https://heyzine.com https://*.heyzine.com https://issuu.com https://e.issuu.com https://youtube.com https://www.youtube.com https://player.vimeo.com https://vimeo.com https://facebook.com https://www.facebook.com",
   "worker-src 'self'",
   "manifest-src 'self'"
 ].join('; ');

const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'x-frame-options': 'DENY',
  'content-security-policy': CSP_POLICY
};

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  /* 101/204/205/304 must not carry a body; Response(null, ...) is valid there. */
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/sitemap.xml' && request.method === 'GET') return renderSitemap(env, ctx);
  if (url.pathname === '/feed.xml' && request.method === 'GET') return renderFeed(env, ctx);

  if (url.pathname === '/api/upload-thumb') return handleThumbUpload(request);
  if (url.pathname === '/api/image-proxy') return handleImageProxy(request, ctx);
  if (url.pathname === '/api/articles') return handleArticlesProxy(request, ctx);
  if (url.pathname === '/api/public-data' && request.method === 'GET') {
    return renderPublicData(request, ctx, url.searchParams.get('resource') || '');
  }

  const match = url.pathname.match(/^\/stories\/[^/]+\/([^/]+)\/?$/);
  if (match && (request.method === 'GET' || request.method === 'HEAD')) {
    let id;
    try { id = decodeURIComponent(match[1]); } catch { return new Response('Story not found.', { status: 404 }); }
    if (!isUuid(id)) return new Response('Story not found.', { status: 404 });
    return renderStory(request, env, ctx, id);
  }

  const response = await env.ASSETS.fetch(request);
  const assetPath = url.pathname.toLowerCase();
  const isStaticAsset = /\.(css|js|png|jpe?g|gif|svg|webp|ico|json|xml|txt|map|woff2?|ttf|otf|mjs)(?:\?.*)?$/.test(assetPath);

  /* Only rewrite caching for responses that actually succeeded - a 404 for a
     missing .js must not be handed a long cache lifetime. */
  if (isStaticAsset && response.ok && request.method === 'GET') {
    const headers = new Headers(response.headers);
    /* Versioned assets (?v=N) are safe to cache forever: the URL changes
       whenever the file does, which is the whole point of the manual
       cache-buster. Everything else keeps the short revalidating lifetime.
       Serving max-age=0 for ?v= URLs made every page view revalidate
       app.js and styles.css for no benefit. */
    headers.set('cache-control', url.searchParams.has('v')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate, stale-while-revalidate=86400');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  /* Unknown paths land here. wrangler.jsonc sets not_found_handling to
     "404-page", so env.ASSETS answers with 404.html and a real 404 status.
     It used to be "single-page-application", which returned the homepage with
     HTTP 200 for every unknown URL - a soft 404 that search engines penalise. */
  return response;
}

export default {
  async fetch(request, env, ctx) {
    return withSecurityHeaders(await route(request, env, ctx));
  }
};
