/* Read-only production smoke test.
 *
 * Usage:
 *   node scripts/live-check.js
 *   THEWORK_ORIGIN=http://127.0.0.1:8787 node scripts/live-check.js
 *
 * It never signs in, writes data, uploads a file, or prints response bodies.
 */

const origin = (process.env.THEWORK_ORIGIN || 'https://thework.tw78.workers.dev').replace(/\/$/, '');

const PUBLIC_ARTICLE_COLUMNS = 'id,title,excerpt,thumbnail,date,cat,subcat,status,author,author2,read,views,featured,updated,publish_at,photojournalist,photojournalist_2,photo_courtesy,layout_by,layout_by_2,graphics_by,credits';

const failures = [];

function assert(name, condition, detail) {
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

async function get(path, options) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(origin + path, options);
      const text = await response.text();
      return { response, text };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw new Error(`${path}: ${lastError ? lastError.message : 'fetch failed'}`);
}

function header(response, name) {
  return response.headers.get(name) || '';
}

async function main() {
  const homepage = await get('/');
  const homeHtml = homepage.text;
  assert('homepage status', homepage.response.status === 200);
  assert('homepage HTML type', /text\/html/i.test(header(homepage.response, 'content-type')));
  assert('homepage is server-rendered', homeHtml.includes('data-server-home="true"'));
  assert('homepage bootstraps article metadata', homeHtml.includes('id="tw-home-data"'));
  assert('homepage is edge-cached', !!header(homepage.response, 'tw-swr-at'));
  assert('homepage has security headers', header(homepage.response, 'content-security-policy').includes("default-src 'self'") && header(homepage.response, 'x-content-type-options') === 'nosniff');

  let bootstrap = null;
  const bootstrapMatch = homeHtml.match(/<script id="tw-home-data"[^>]*>([\s\S]*?)<\/script>/i);
  try { bootstrap = JSON.parse(bootstrapMatch ? bootstrapMatch[1] : 'null'); } catch (_) {}
  assert('homepage bootstrap is JSON', Array.isArray(bootstrap));
  assert('homepage bootstrap omits article bodies', !((bootstrap || []).some(row => Object.prototype.hasOwnProperty.call(row, 'body'))));
  assert('homepage does not call the query limit a site total', !/sidebar-section-title">Latest <span>· \d+ total/.test(homeHtml));

  const homepageAgain = await get('/');
  assert('homepage cache timestamp is stable', !!header(homepageAgain.response, 'tw-swr-at') && header(homepageAgain.response, 'tw-swr-at') === header(homepage.response, 'tw-swr-at'));

  const storyPath = homeHtml.match(/href="(\/stories\/[^"#]+)"/i)?.[1];
  assert('homepage exposes a story URL', !!storyPath);
  if (storyPath) {
    const story = await get(storyPath);
    assert('story status', story.response.status === 200);
    assert('story is prerendered', story.text.includes('data-server-story="true"') && story.text.includes('property="og:type" content="article"'));
    assert('story has structured data', story.text.includes('application/ld+json'));
    assert('story uses an owned preview image', new RegExp(`property="og:image" content="${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/image-proxy\\?url=`).test(story.text));
    const storyHead = await get(storyPath, { method: 'HEAD' });
    assert('story HEAD is bodyless', storyHead.response.status === 200 && storyHead.text.length === 0);
  }

  const articleDump = await get('/api/articles?select=*&status=eq.published&limit=1');
  assert('article proxy rejects wildcard projections', articleDump.response.status === 400);

  const bodyWithoutId = await get('/api/articles?select=body&limit=1');
  assert('article proxy requires an id for body reads', bodyWithoutId.response.status === 400);

  const publicQuery = `/api/articles?select=${encodeURIComponent(PUBLIC_ARTICLE_COLUMNS)}&status=eq.published&deleted_at=is.null&or=${encodeURIComponent('(publish_at.is.null,publish_at.lte.2099-01-01T00:00:00.000Z)')}&limit=1`;
  const publicArticles = await get(publicQuery);
  assert('public article projection status', publicArticles.response.status === 200);
  assert('article proxy does not forward Supabase cookies', !header(publicArticles.response, 'set-cookie'));
  let publicRows = null;
  try { publicRows = JSON.parse(publicArticles.text); } catch (_) {}
  assert('public article projection is JSON', Array.isArray(publicRows));
  assert('public article projection omits bodies', !((publicRows || []).some(row => Object.prototype.hasOwnProperty.call(row, 'body'))));
  const publicArticlesAgain = await get(publicQuery.replace('2099-01-01T00:00:00.000Z', '2099-01-01T00:00:01.000Z'));
  assert('public article cache ignores rolling publish-time values', header(publicArticlesAgain.response, 'x-cache') === 'HIT');

  for (const resource of ['board-members', 'board-photos', 'releases', 'videos', 'memoriam']) {
    const result = await get(`/api/public-data?resource=${resource}`);
    assert(`${resource} public data`, result.response.status === 200 && !!header(result.response, 'tw-swr-at'));
  }
  const unknownResource = await get('/api/public-data?resource=not-real');
  assert('unknown public data resource is rejected', unknownResource.response.status === 404);

  const sitemap = await get('/sitemap.xml');
  assert('sitemap', sitemap.response.status === 200 && /<urlset/.test(sitemap.text));
  const feed = await get('/feed.xml');
  assert('feed', feed.response.status === 200 && /<feed/.test(feed.text));
  const robots = await get('/robots.txt');
  assert('robots', robots.response.status === 200 && /Sitemap:\s*https:\/\/thework\.tw78\.workers\.dev\/sitemap\.xml/i.test(robots.text));

  const notFound = await get('/definitely-not-a-real-page');
  assert('unknown path is a real 404', notFound.response.status === 404);
  const malformedStory = await get('/stories/not-a-story/not-a-uuid');
  assert('malformed story id is a real 404', malformedStory.response.status === 404);
  const badImageTarget = await get('/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fimage.jpg');
  assert('image proxy rejects foreign origins', badImageTarget.response.status === 400);
  const uploadGet = await get('/api/upload-thumb?path=probe.png', { method: 'GET' });
  assert('upload proxy rejects GET', uploadGet.response.status === 405);
  const uploadBadPath = await get('/api/upload-thumb?path=../probe.png', { method: 'POST', headers: { 'content-type': 'image/png' }, body: Buffer.from([1]) });
  assert('upload proxy rejects bad paths', uploadBadPath.response.status === 400);

  const app = await get('/app.js?v=84');
  assert('versioned app asset', app.response.status === 200 && header(app.response, 'cache-control').includes('immutable') && app.text.includes('readServerHomeData'));
  const styles = await get('/styles.css?v=53');
  assert('versioned styles asset', styles.response.status === 200 && header(styles.response, 'cache-control').includes('immutable'));

  if (failures.length) {
    console.error('Live checks failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`Live checks passed for ${origin}`);
}

main().catch(error => {
  console.error(`Live checks could not run: ${error.message}`);
  process.exit(1);
});
