const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const app = fs.readFileSync(path.join(publicRoot, 'app.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'workers', 'prerender.js'), 'utf8');
const index = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(publicRoot, 'styles.css'), 'utf8');
const sw = fs.readFileSync(path.join(publicRoot, 'sw.js'), 'utf8');
const inlineScriptHashes = [...index.matchAll(/<script>([\s\S]*?)<\/script>/gi)]
  .map(match => "'sha256-" + crypto.createHash('sha256').update(match[1]).digest('base64') + "'");

const checks = [
  ['public columns include article status', /PUBLISHED_COLUMNS[^\n]*status/.test(app)],
  ['app hardens global article state', /function safeAllArticles\(/.test(app) && /function safePendingThumbFile\(/.test(app)],
  ['article proxy accepts only bounded projections', /const ARTICLE_PUBLIC_COLUMNS\s*=/.test(worker) && /const ARTICLE_ADMIN_COLUMNS\s*=/.test(worker) && /const ARTICLE_BODY_COLUMNS\s*= 'body'/.test(worker) && /ARTICLE_ALLOWED_SELECTS\.has\(select\)/.test(worker) && /ARTICLE_ALLOWED_QUERY_KEYS/.test(worker) && /Unsupported article projection/.test(worker)],
  ['public article proxy cannot dump drafts or unbounded bodies', /select === ARTICLE_BODY_COLUMNS && !idFilter/.test(worker) && /target\.searchParams\.set\('status', 'eq\.published'\)/.test(worker) && /target\.searchParams\.set\('deleted_at', 'is\.null'\)/.test(worker) && /target\.searchParams\.set\('limit', '1'\)/.test(worker) && /select === ARTICLE_ADMIN_COLUMNS && !isAuthenticated/.test(worker) && /clientToken\.split\('\.'\)\.length === 3/.test(worker)],
  ['public article cache key ignores the rolling publish-time filter', /const cacheKeyUrl = new URL\(url\.toString\(\)\)/.test(worker) && /cacheKeyUrl\.searchParams\.delete\('or'\)/.test(worker) && /cacheKeyUrl\.searchParams\.set\('status', 'eq\.published'\)/.test(worker)],
  ['worker revalidates static assets', /must-revalidate/.test(worker)],
  ['homepage projection is narrow and body-free', /const HOME_COLUMNS\s*=\s*'id,title,excerpt,thumbnail,date,cat,subcat,status,author,author2,read,views,featured,credits'/.test(worker) && /select: HOME_COLUMNS/.test(worker) && /status: 'eq\.published'/.test(worker) && /order: 'date\.desc'/.test(worker) && /limit: '20'/.test(worker)],
  ['root path uses versioned cached homepage prerender', /const HOME_CACHE_VERSION\s*=/.test(worker) && /const homeUrlKey = `\$\{SITE_ORIGIN\}\/\?__tw_home=\$\{HOME_CACHE_VERSION\}`/.test(worker) && /async function renderHome\(request, env, ctx\)/.test(worker) && /return serveFreshOrStale\(request, ctx, homeUrlKey/.test(worker) && /url\.pathname === '\/' && request\.method === 'GET'\) return renderHome\(request, env, ctx\)/.test(worker)],
  ['server homepage region is marked for hydration', /id="frontpageGrid" data-server-home="true"/.test(worker) && /data-server-home-story="true"/.test(worker)],
  ['homepage avoids claiming the query limit is the site total', /sidebar-section-title">Latest<\/div>/.test(worker) && !/sidebar-section-title">Latest <span>· \$\{articles\.length\} total/.test(worker)],
  ['homepage JSON bootstrap is escaped and identified', /function safeJsonForHtml\(/.test(worker) && /id="tw-home-data" type="application\/json" data-server-home="true"/.test(worker) && /JSON\.stringify\(value\)/.test(worker)],
  ['feed query avoids article bodies and thumbnails', /const FEED_COLUMNS\s*=\s*'id,title,excerpt,date,updated,cat,author,author2,credits'/.test(worker) && /select: FEED_COLUMNS/.test(worker)],
  ['public auxiliary data is allowlisted and edge-cached', /PUBLIC_DATA_RESOURCES\s*=\s*\{/.test(worker) && /'board-members'/.test(worker) && /'board-photos'/.test(worker) && /releases:/.test(worker) && /videos:/.test(worker) && /memoriam:/.test(worker) && /url\.pathname === '\/api\/public-data'/.test(worker) && /function renderPublicData\(/.test(worker)],
  ['Worker cache writes carry SWR timestamps', /function stampCacheResponse\(/.test(worker) && /headers\.set\('tw-swr-at'/.test(worker) && (worker.match(/cache\.put\(/g) || []).length >= 5],
  ['malformed story IDs return 404 before Supabase', /function isUuid\(/.test(worker) && /if \(!isUuid\(id\)\) return new Response\('Story not found\.', \{ status: 404 \}\)/.test(worker)],
  ['thumbnail uploads are bounded and type-checked', /MAX_UPLOAD_BYTES\s*=\s*8 \* 1024 \* 1024/.test(worker) && /readBoundedBody\(/.test(worker) && /Content-Type is required/.test(worker) && /status: 413/.test(worker) && /image\/webp/.test(worker)],
  ['thumbnail and social images use owned HTTPS origins', /function isOwnedImageUrl\(/.test(worker) && /url\.protocol === 'https:'.*SITE_ORIGIN_URL\.origin.*SUPABASE_ORIGIN/.test(worker) && /targetUrl\.protocol !== 'https:'.*targetUrl\.origin !== SUPABASE_ORIGIN/.test(worker)],
  ['image proxy has a free-tier raw-object fallback', /Image transformations are not available on every Supabase plan/.test(worker) && /storage\/v1\/render\/image\/public\//.test(worker) && /storage\/v1\/object\/public\//.test(worker) && /response\.status\)\)/.test(worker)],
  ['NewsArticle JSON-LD uses normalized dates and all authors', /datePublished: published \|\| undefined/.test(worker) && /dateModified: modified \|\| undefined/.test(worker) && /authors\.map\(String\)\.filter\(Boolean\)/.test(worker) && /map\(name => \(\{ '@type': 'Person', name \}\)\)/.test(worker)],
  ['enforcing CSP covers app resources and embeds', /'content-security-policy': CSP_POLICY/.test(worker) && /https:\/\/cdn\.jsdelivr\.net/.test(worker) && /https:\/\/cloud\.umami\.is/.test(worker) && /https:\/\/fonts\.googleapis\.com/.test(worker) && /https:\/\/fonts\.gstatic\.com/.test(worker) && /https:\/\/heyzine\.com/.test(worker) && /https:\/\/e\.issuu\.com/.test(worker) && /https:\/\/www\.youtube\.com/.test(worker) && /https:\/\/player\.vimeo\.com/.test(worker) && /https:\/\/www\.facebook\.com/.test(worker) && /object-src 'none'/.test(worker) && /base-uri 'self'/.test(worker) && /frame-ancestors 'none'/.test(worker) && /form-action 'self'/.test(worker)],
  ['CSP hashes match inline boot scripts', inlineScriptHashes.length === 2 && inlineScriptHashes.every(hash => worker.includes(hash))],
  ['HSTS does not claim preload', /strict-transport-security': 'max-age=31536000; includeSubDomains'/.test(worker) && !/strict-transport-security': '[^']*preload/.test(worker)],
  ['article bodies use the shared Supabase allowlist', /const ALLOWED_IMG_ORIGINS\s*=\s*\[[\s\S]*https:\/\/fgojhhgqpvnwtcqkornz\.supabase\.co/.test(app) && /const ALLOWED_IMG_ORIGINS\s*=\s*\[[\s\S]*https:\/\/fgojhhgqpvnwtcqkornz\.supabase\.co/.test(worker)],
  ['article image toolbar button is present', /data-format="image"/.test(index) && /insertBlockImage\(\)/.test(app)],
  ['article image upload flow uses Data.uploadThumb', /Data\.uploadThumb\(file\)/.test(app)],
  ['word meter is present and wired', /id="wordMeter"/.test(index) && /function countWords\(/.test(app) && /function updateWordMeter\(/.test(app) && /updateWordMeter\(\)/.test(app)],
  ['share preview is present and wired', /id="sharePreviewPanel"/.test(index) && /function updateSharePreview\(/.test(app) && /sharePreviewTitle/.test(app) && /share-preview/.test(styles)],
  ['article notes panel and handlers are present', /id="notesPanel"/.test(index) && /function twLoadNotes\(/.test(app) && /function twPostNote\(/.test(app) && /function twDeleteNote\(/.test(app) && /\.from\('article_notes'\)/.test(app) && /notes-list/.test(styles)]
  ,['reading progress is wired', /TW_READING_KEY/.test(app) && /twShowContinueBar/.test(app) && /twIsArticleFinished/.test(app) && /article-read-mark/.test(app) && /tw-continue-bar/.test(styles)]
  ,['story text controls are wired', /twStoryControls/.test(index) && /twSetStoryControlsVisible/.test(app) && /tw_story_text_size/.test(app) && /tw_story_width/.test(app) && /tw-story-controls/.test(styles)]
    ,['admin dashboard context and editor progress are wired', /id="dashboardContext"/.test(index) && /function dashboardArticles\(/.test(app) && /id="editorProgress"/.test(index) && /function updateEditorProgress\(/.test(app) && /editor-group/.test(styles)]
    ,['admin loading, error, and filtered-empty states are wired', /function renderAdminLoading\(/.test(app) && /function renderAdminError\(/.test(app) && /data-admin-retry/.test(app) && /data-clear-article-filters/.test(app) && /admin-state/.test(styles)]
    ,['article import flow is present and safe', /id="importOverlay"/.test(index) && /parseImportedArticle\(/.test(app) && /renderArticleBody\(parsed\.body\)/.test(app) && /data-import-article/.test(index)]
    ,['admin upload surfaces are keyboard-accessible', /id="thumbUploader"[^>]*role="button"/.test(index) && /closest\?\.\('\.thumb-uploader'\)/.test(app) && /thumb-uploader:focus-visible/.test(styles)]
     ,['role matrix and shared identity matching are aligned', /users:\s*\{\s*dev:\s*'Full',\s*eb:\s*'Full',\s*member:\s*'—'/.test(app) && /twGetEditorFromStorage\(\)/.test(app) && /function twRefreshMemberDashboard\(/.test(app)]
     ,['restricted admin writes have defense-in-depth guards', /twRequireRole\('dev'\)/.test(app) && /twRequireRole\('eb', 'dev'\)/.test(app) && /Data\.uploadThumb\(blob\)/.test(app) && !/storage\.from\('thumbnails'\)\.upload\(/.test(app)]
     ,['board members load lazily after the initial route', /function ensureBoardMembers\(/.test(app) && /ensureBoardMembers\(\)/.test(app) && !/async function init\(\)[\s\S]*?Data\.listBoardMembers\(/.test(app)]
     ,['admin article list is metadata-only and editor bodies stay lazy', /const ADMIN_ARTICLE_COLUMNS\s*=/.test(app) && /select: ADMIN_ARTICLE_COLUMNS/.test(app) && /async function loadIntoForm\(/.test(app) && /a\.body = await Data\.fetchBody\(id\)/.test(app)]
     ,['drafts are scoped and cleared on auth loss', /function twDraftScope\(/.test(app) && /return `\$\{String\(userId\)/.test(app) && (app.match(/twClearAllDrafts\(\);/g) || []).length >= 2]
     ,['session debug hook is local-only', /location\.hostname === 'localhost'/.test(app) && /window\.__twSession/.test(app) && /Normal visitors never receive this global/.test(app)]
     ,['reduced motion disables carousel autoplay and progress animation', /function twCarouselApplyMotionPreference\(/.test(app) && /query\.addEventListener\('change'/.test(app) && /if \(twCarouselPrefersReducedMotion\(\)\) return;/.test(app) && /animate: !twCarouselPrefersReducedMotion\(\)/.test(app)]
     ,['service worker caches same-origin image proxy but not Supabase REST', /function isImageProxy\(/.test(sw) && /if \(isImageProxy\(url\)\)/.test(sw) && /cacheFirst\(request, IMAGE_CACHE\)/.test(sw) && /if \(isApi\(url\)\) return;/.test(sw)]
     ,['public auxiliary reads use the Worker cache', /async publicResource\(resource, options\)/.test(app) && /publicResource\('board-members'/.test(app) && /publicResource\('board-photos'/.test(app) && /publicResource\('releases'/.test(app) && /publicResource\('videos'/.test(app) && /publicResource\('memoriam'/.test(app)]
     ,['analytics loads independently of app boot', /<script async src="https:\/\/cloud\.umami\.is\/script\.js"/.test(index) && /app\.js\?v=\d+/.test(index)]
     ,['client hydrates the server-rendered homepage without a duplicate public read', /function readServerHomeData\(/.test(app) && /async function renderHome\(options\)/.test(app) && /published = initial \|\| await Data\.listPublished\(\)/.test(app) && /const serverHome = readServerHomeData\(\)/.test(app)]

    /* Guards for the two failure modes that shipped silently before:
       a stray page in the public asset root (a fake "update your Zoom client"
       lure was served from this domain), and the Worker's regex replacement of
       the shell markup silently matching nothing. */
    ,['asset root has no stray HTML', (() => {
        const allowed = ['index.html', '404.html'];
        const stray = fs.readdirSync(publicRoot)
          .filter(f => /\.html?$/i.test(f) && !allowed.includes(f));
        if (stray.length) console.error('  stray HTML would be publicly served:', stray.join(', '));
        return stray.length === 0;
      })()]
    ,['Worker can still find the shell markup it replaces', /<main id="view-home" class="view active">/.test(index)]
    ,['versioned assets carry a cache-buster', /(?:app\.js|styles\.css)\?v=\d+/.test(index)]
  ];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Smoke checks failed:');
  for (const [name] of failed) console.error('-', name);
  process.exit(1);
}

console.log('Smoke checks passed');
