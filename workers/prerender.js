const SITE_ORIGIN = 'https://thework.tw78.workers.dev';
const SUPABASE_URL = 'https://fgojhhgqpvnwtcqkornz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UiH_F3V2tFE1doecIb337w__hYVQIQf';
const ARTICLE_COLUMNS = 'id,title,excerpt,body,thumbnail,date,updated,cat,author,author2,photojournalist,graphics_by,layout_by,layout_by_2,read';
const CATEGORY_LABELS = {
  news: 'News', editorial: 'Editorial', opinion: 'Opinion',
  features: 'Features', literary: 'Literary', sports: 'Sports'
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

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : `${SITE_ORIGIN}/logo-tw.png`;
  } catch {
    return `${SITE_ORIGIN}/logo-tw.png`;
  }
}

function storyMarkup(article) {
  const authors = [article.author, article.author2].filter(Boolean).join(' & ') || 'The Work Staff';
  const category = CATEGORY_LABELS[article.cat] || article.cat || 'Story';
  const paragraphs = String(article.body || '').split(/\n\s*\n/).filter(part => part.trim());
  const dateMarkup = article.date ? `<time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time>` : '';
  const readTime = article.read ? ` · ${escapeHtml(article.read)} read` : '';
  const hero = article.thumbnail
    ? `<figure class="story-hero"><img src="${escapeHtml(safeImageUrl(article.thumbnail))}" alt="" fetchpriority="high" decoding="async"></figure>`
    : '';
  const body = paragraphs.map(part => `<p>${escapeHtml(part.trim()).replace(/\n/g, '<br>')}</p>`).join('')
    || (article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : '');

  return `<main id="view-story" class="view active" data-server-story="true">
    <article class="story-page">
      <div class="wrap story-page-inner">
        <a class="story-back" href="/#/">← All stories</a>
        <div class="story-category">${escapeHtml(category)}</div>
        <h1>${escapeHtml(article.title)}</h1>
        ${article.excerpt ? `<p class="story-deck">${escapeHtml(article.excerpt)}</p>` : ''}
        <div class="story-byline">By ${escapeHtml(authors)}${dateMarkup ? ` · ${dateMarkup}` : ''}${readTime}</div>
        ${hero}
        <div class="story-content">${body}</div>
      </div>
    </article>
  </main>`;
}

async function fetchArticles(query) {
  const url = new URL('/rest/v1/articles', SUPABASE_URL);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json'
    },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
}

async function renderStory(request, env, id) {
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
  // If thumbnail is WebP, force convert to JPEG for Messenger compatibility
  let image = safeImageUrl(article.thumbnail);
  if (image.includes('.webp')) {
    // Facebook/Messenger prefer JPEG — proxy via Supabase image transform
    image = image.replace(/\.webp(\?.*)?$/, '.jpg$1');
  }
  const setMeta = (htmlText, pattern, attrs) => htmlText.replace(pattern, `<meta ${attrs}>`);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, /<meta name="description"[^>]*>/i, `name="description" content="${escapeHtml(description)}"`);
  html = setMeta(html, /<meta property="og:type"[^>]*>/i, 'property="og:type" content="article"');
  html = setMeta(html, /<meta property="og:title"[^>]*>/i, `property="og:title" content="${escapeHtml(title)}"`);
  html = setMeta(html, /<meta property="og:description"[^>]*>/i, `property="og:description" content="${escapeHtml(description)}"`);
  html = setMeta(html, /<meta property="og:url"[^>]*>/i, `property="og:url" content="${escapeHtml(canonical)}"`);
  html = setMeta(html, /<meta property="og:image"[^>]*>/i, `property="og:image" content="${escapeHtml(image)}"`);
    html = html.replace('</head>', `<meta property="og:image:secure_url" content="${escapeHtml(image)}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:type" content="${image.endsWith('.webp') ? 'image/webp' : 'image/jpeg'}">\n</head>`);
  html = setMeta(html, /<meta name="twitter:card"[^>]*>/i, 'name="twitter:card" content="summary_large_image"');
  html = html.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escapeHtml(canonical)}">`);

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
    image,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }
  };
  const jsonLd = JSON.stringify(schema).replace(/</g, '\u003c');
  html = html.replace('</head>', `<script type="application/ld+json">${jsonLd}</script>\n</head>`);
  html = html.replace(/<main id="view-home" class="view active">[\s\S]*?<\/main>/i, storyMarkup(article));

  const headers = new Headers(assetResponse.headers);
  for (const header of ['content-length', 'content-encoding', 'etag', 'last-modified']) headers.delete(header);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');
  return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers });
}

async function renderSitemap(env) {
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
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/sitemap.xml' && request.method === 'GET') return renderSitemap(env);

    const match = url.pathname.match(/^\/stories\/[^/]+\/([^/]+)\/?$/);
    if (match && (request.method === 'GET' || request.method === 'HEAD')) {
      let id;
      try { id = decodeURIComponent(match[1]); } catch { return new Response('Story not found.', { status: 404 }); }
      return renderStory(request, env, id);
    }

    return env.ASSETS.fetch(request);
  }
};
