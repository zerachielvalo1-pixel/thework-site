const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'workers', 'prerender.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const checks = [
  ['public columns include article status', /PUBLISHED_COLUMNS[^\n]*status/.test(app)],
  ['app hardens global article state', /function safeAllArticles\(/.test(app) && /function safePendingThumbFile\(/.test(app)],
  ['worker revalidates static assets', /must-revalidate/.test(worker)],
  ['article bodies use the shared Supabase allowlist', /const ALLOWED_IMG_ORIGINS\s*=\s*\[[\s\S]*https:\/\/fgojhhgqpvnwtcqkornz\.supabase\.co/.test(app) && /const ALLOWED_IMG_ORIGINS\s*=\s*\[[\s\S]*https:\/\/fgojhhgqpvnwtcqkornz\.supabase\.co/.test(worker)],
  ['article image toolbar button is present', /data-format="image"/.test(index) && /insertBlockImage\(\)/.test(app)],
  ['article image upload flow uses Data.uploadThumb', /Data\.uploadThumb\(file\)/.test(app)]
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Smoke checks failed:');
  for (const [name] of failed) console.error('-', name);
  process.exit(1);
}

console.log('Smoke checks passed');
