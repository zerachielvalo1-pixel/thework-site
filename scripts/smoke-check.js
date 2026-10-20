const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const app = fs.readFileSync(path.join(publicRoot, 'app.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'workers', 'prerender.js'), 'utf8');
const index = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(publicRoot, 'styles.css'), 'utf8');

const checks = [
  ['public columns include article status', /PUBLISHED_COLUMNS[^\n]*status/.test(app)],
  ['app hardens global article state', /function safeAllArticles\(/.test(app) && /function safePendingThumbFile\(/.test(app)],
  ['worker revalidates static assets', /must-revalidate/.test(worker)],
  ['article bodies use the shared Supabase allowlist', /const ALLOWED_IMG_ORIGINS\s*=\s*\[[\s\S]*https:\/\/fgojhhgqpvnwtcqkornz\.supabase\.co/.test(app) && /const ALLOWED_IMG_ORIGINS\s*=\s*\[[\s\S]*https:\/\/fgojhhgqpvnwtcqkornz\.supabase\.co/.test(worker)],
  ['article image toolbar button is present', /data-format="image"/.test(index) && /insertBlockImage\(\)/.test(app)],
  ['article image upload flow uses Data.uploadThumb', /Data\.uploadThumb\(file\)/.test(app)],
  ['word meter is present and wired', /id="wordMeter"/.test(index) && /function countWords\(/.test(app) && /function updateWordMeter\(/.test(app) && /updateWordMeter\(\)/.test(app)],
  ['share preview is present and wired', /id="sharePreviewPanel"/.test(index) && /function updateSharePreview\(/.test(app) && /sharePreviewTitle/.test(app) && /share-preview/.test(styles)],
  ['article notes panel and handlers are present', /id="notesPanel"/.test(index) && /function twLoadNotes\(/.test(app) && /function twPostNote\(/.test(app) && /function twDeleteNote\(/.test(app) && /\.from\('article_notes'\)/.test(app) && /notes-list/.test(styles)]
  ,['reading progress is wired', /TW_READING_KEY/.test(app) && /twShowContinueBar/.test(app) && /twIsArticleFinished/.test(app) && /article-read-mark/.test(app) && /tw-continue-bar/.test(styles)]
  ,['story text controls are wired', /twStoryControls/.test(index) && /twSetStoryControlsVisible/.test(app) && /tw_story_text_size/.test(app) && /tw_story_width/.test(app) && /tw-story-controls/.test(styles)]

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
