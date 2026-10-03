const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'workers', 'prerender.js'), 'utf8');

const checks = [
  ['public columns include article status', /PUBLISHED_COLUMNS[^\n]*status/.test(app)],
  ['app hardens global article state', /function safeAllArticles\(/.test(app) && /function safePendingThumbFile\(/.test(app)],
  ['worker revalidates static assets', /must-revalidate/.test(worker)]
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Smoke checks failed:');
  for (const [name] of failed) console.error('-', name);
  process.exit(1);
}

console.log('Smoke checks passed');
