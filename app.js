const SUPABASE_URL = 'https://fgojhhgqpvnwtcqkornz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UiH_F3V2tFE1doecIb337w__hYVQIQf';

(function(){
'use strict';

const sb = (window.supabase && SUPABASE_URL.startsWith('https://'))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

console.log(sb ? '[The Work] Supabase connected' : '[The Work] Demo mode');

const $ = (s,c) => (c||document).querySelector(s);
const $$ = (s,c) => Array.from((c||document).querySelectorAll(s));
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,10));

/* ---------- Responsive image delivery ----------
   Thumbnails in the Storage bucket are full-resolution uploads. Served from
   /storage/v1/object/public/ they are both huge (measured: one JPEG at 4.5 MB,
   one PNG at 552 KB) and uncacheable, because that endpoint answers
   `Cache-Control: no-cache` and forces a revalidation on every page view.

   Supabase also exposes an on-the-fly renderer at /storage/v1/render/image/,
   which resizes and re-encodes server-side and replies with
   `Cache-Control: max-age=31536000`. Routing thumbnails through it with a
   display-appropriate width and an explicit webp output (PNG sources otherwise
   stay PNG and stay enormous) removes 75-95% of the bytes.

   Non-Supabase URLs - external embeds and pasted links - pass through as-is. */
const IMG_OBJECT_PATH = '/storage/v1/object/public/';
const IMG_RENDER_PATH = '/storage/v1/render/image/public/';
const IMG_QUALITY = 68;

function imgUrl(url, width) {
  const src = String(url == null ? '' : url);
  if (!src || src.indexOf(IMG_OBJECT_PATH) === -1) return src;
  const sep = src.indexOf('?') === -1 ? '?' : '&';
  /* resize=contain is required, not cosmetic. With only `width` and no resize
     mode the renderer *stretches* the image to that width and leaves the height
     alone - a 1400x1400 upload came back as 640x1400. `contain` scales
     proportionally, which is what object-fit:cover in the CSS then crops. */
  return src.replace(IMG_OBJECT_PATH, IMG_RENDER_PATH) + sep +
    'width=' + width + '&resize=contain&quality=' + IMG_QUALITY + '&format=webp';
}

/* Emits <img> with srcset so phones fetch the small variant and wide screens
   fetch the larger one. Falls back to a plain tag for untransformable URLs. */
function imgTag(url, widths, sizes, attrs) {
  const src = String(url == null ? '' : url);
  const extra = attrs || '';
  if (!src) return '';
  if (src.indexOf(IMG_OBJECT_PATH) === -1) {
    return `<img src="${esc(src)}"${extra}>`;
  }
  const largest = widths[widths.length - 1];
  const set = widths.map(w => `${imgUrl(src, w)} ${w}w`).join(', ');
  const sizeAttr = sizes ? ` sizes="${esc(sizes)}"` : '';
  return `<img src="${esc(imgUrl(src, largest))}" srcset="${esc(set)}"${sizeAttr}${extra}>`;
}

/* Link-preview card. Mirrors socialCardUrl() in workers/prerender.js so the
   client-rendered and server-prerendered versions of a story agree.
   Note there is no `format` argument: that makes the renderer transcode the
   .webp uploads to JPEG, which is what the social crawlers can actually read.
   No size is declared either, because the renderer never upscales and so the
   output is not reliably 1200x630. */
function socialCardUrl(url) {
  const src = String(url == null ? '' : url);
  if (!src || src.indexOf(IMG_OBJECT_PATH) === -1) return src;
  const sep = src.indexOf('?') === -1 ? '?' : '&';
  return src.replace(IMG_OBJECT_PATH, IMG_RENDER_PATH) + sep +
    'width=1200&height=630&resize=cover&quality=80';
}

/* Common `sizes` hints, kept in one place so layouts stay in sync. */
const SIZES = {
  lead:    '(max-width: 900px) 100vw, 700px',
  card:    '(max-width: 580px) 100vw, (max-width: 900px) 50vw, 380px',
  video:   '(max-width: 560px) 100vw, (max-width: 900px) 50vw, 380px',
  preview: '(max-width: 480px) 100vw, (max-width: 900px) 50vw, 380px',
  hero:    '(max-width: 900px) 100vw, 900px',
  modal:   '(max-width: 780px) 100vw, 720px'
};

/* ---------- Overlay scroll lock ----------
   Every full-screen overlay needs the page behind it to stop scrolling. The
   previous approach set `body.style.overflow` directly, which had two faults:
   iOS Safari largely ignores it, and closing one overlay released the lock even
   when another (article modal opened from the board profile, say) was still
   open. A counter plus a class on <html> - which Safari does honour - fixes
   both, and keeps the CSS overflow guard on <body> intact. */
let twScrollLocks = 0;
function lockScroll() {
  twScrollLocks++;
  if (twScrollLocks === 1) document.documentElement.classList.add('tw-locked');
}
function unlockScroll() {
  if (twScrollLocks === 0) return;
  twScrollLocks--;
  if (twScrollLocks === 0) document.documentElement.classList.remove('tw-locked');
}
const todayISO = () => new Date().toISOString().slice(0,10);
const fmtDate = iso => { if(!iso) return '—'; const d=new Date(iso+'T00:00:00'); return isNaN(d)?iso:d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };
const fmtDateLong = iso => { if(!iso) return '—'; const d=new Date(iso+'T00:00:00'); return isNaN(d)?iso:d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}); };
const fmtDateTimeLive = d => d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) + ' · ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
const timeAgo = ts => { if(!ts) return '—'; const diff=Date.now()-new Date(ts).getTime(); if(diff<60000) return 'just now'; const m=Math.floor(diff/60000); if(m<60) return m+'m ago'; const h=Math.floor(m/60); if(h<24) return h+'h ago'; return Math.floor(h/24)+'d ago'; };
const toLocalDateTimeInput = iso => { if(!iso) return ''; const d=new Date(iso); if(isNaN(d)) return ''; const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes()); };
// ---------- subtle entrance animations ----------
const TW_FADE_TARGETS = '.article,.lead-story,.sidebar-item,.board-card,.release-card,.video-card,.memoriam-item,.panel,.stat-card';
let twFadeObs = null;
function twInitFade() {
  if (!('IntersectionObserver' in window)) return;
  twFadeObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        twFadeObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });
}
function twApplyFade() {
  if (!twFadeObs) return;
  const els = document.querySelectorAll(TW_FADE_TARGETS);
  let i = 0;
  els.forEach((el) => {
    if (el.classList.contains('tw-fade')) return;
    el.classList.add('tw-fade');
    el.style.transitionDelay = Math.min((i % 8) * 45, 315) + 'ms';
    twFadeObs.observe(el);
    i++;
  });
}
let twFadePending = false;
function twScheduleFade() {
  if (twFadePending) return;
  twFadePending = true;
  requestAnimationFrame(() => {
    twFadePending = false;
    twApplyFade();
  });
}
const CAT_LABELS = { news:'News', opinion:'Opinion', features:'Features', literary:'Literary', sports:'Sports', devcom:'DevCom', entertainment:'Entertainment' };
const SECTION_ORDER = ['news','opinion','features','literary','devcom','sports','entertainment'];
const SUBCAT_OPTIONS = {
  news: [
    { id:'university', label:'University' },
    { id:'local',      label:'Local' },
    { id:'national',   label:'National' },
    { id:'politics',   label:'Politics' }
  ],
  opinion: [
    { id:'editorial',   label:'Editorial' },
    { id:'column',      label:'Column' },
    { id:'standpoints', label:'Standpoints' }
  ]
};
const SUBCAT_LABELS = {};
Object.values(SUBCAT_OPTIONS).forEach(arr => arr.forEach(o => { SUBCAT_LABELS[o.id] = o.label; }));
const RELEASE_CATEGORIES = [
  { id:'magazine',   label:'Magazine',       example:'Metanoia' },
  { id:'tabloid',    label:'Tabloid',        example:'' },
  { id:'newsletter', label:'Newsletter',     example:'' },
  { id:'literary',   label:'Literary Folio', example:'Obra' },
  { id:'minizine',   label:'Zine',            example:'' }
];
const RELEASE_CAT_LABELS = Object.fromEntries(RELEASE_CATEGORIES.map(c => [c.id, c.label]));
const BOARD = [
  { group:'Editorial Board', subgroup:null, name:'Clarisse T. Fajardo',          role:'Editor-in-Chief',                    program:'Bachelor of Science in Education Major in English',              initials:'CF' },
  { group:'Editorial Board', subgroup:null, name:'Allan P. Tipon Jr.',           role:'Associate Editor-in-Chief',          program:'Bachelor of Science in Mechanical Engineering',                   initials:'AT' },
  { group:'Editorial Board', subgroup:null, name:'Ivan Kerht P. Manguera',       role:'Managing Editor',                    program:'Bachelor of Science in Chemistry',                                initials:'IK' },
  { group:'Editorial Board', subgroup:null, name:'Renz Joshua D.T. De Vera',     role:'Associate Managing Editor',          program:'Bachelor of Science in Mathematics',                              initials:'RJ' },
  { group:'Editorial Board', subgroup:null, name:'Andrei P. Opeña',              role:'News Editor',                        program:'Bachelor of Public Administration',                               initials:'AO' },
  { group:'Editorial Board', subgroup:null, name:'Warren B. Altre',              role:'Opinion-Editorial (Op-Ed) Editor',   program:'Bachelor of Science in Accountancy',                              initials:'WA' },
  { group:'Editorial Board', subgroup:null, name:'Kate Aira L. Mendoza',         role:'Features Editor',                    program:'Bachelor of Arts in Psychology',                                  initials:'KA' },
  { group:'Editorial Board', subgroup:null, name:'Melissa O. Yuson',             role:'Literary and Culture Editor',        program:'Bachelor of Science in Chemistry',                                initials:'MY' },
  { group:'Editorial Board', subgroup:null, name:'Wildred G. Lamintao',          role:'Development Communication Editor',   program:'Bachelor of Science in Accountancy',                              initials:'WL' },
  { group:'Editorial Board', subgroup:null, name:'Lord Baron F. Barcia',         role:'Sports Editor',                      program:'Bachelor of Science in Civil Engineering Major in Structural Engineering', initials:'LB' },
  { group:'Editorial Board', subgroup:null, name:'Ian Luiz R. Escamos',          role:'Senior Cartoonist',                  program:'Bachelor of Science in Mechanical Engineering',                   initials:'IL' },
  { group:'Editorial Board', subgroup:null, name:'Gwend G. Magbalot',            role:'Graphics Editor',                    program:'Bachelor of Science in Architecture',                             initials:'GM' },
  { group:'Editorial Board', subgroup:null, name:'Alyssa L. Cerezo',             role:'Senior Photojournalist',             program:'Bachelor of Science in Architecture',                             initials:'AC' },
  { group:'Editorial Board', subgroup:null, name:'Rhian Justine A.D. Dela Cruz', role:'Layout Editor',                      program:'Bachelor of Science in Information Technology Major in Web and Mobile Application', initials:'RJ' },
  { group:'Editorial Board', subgroup:null, name:'Sheena C. Panelo',             role:'Multimedia Editor',                  program:'Bachelor of Science in Computer Science',                         initials:'SP' },
  { group:'Editorial Board', subgroup:null, name:'Roberto Luiz G. Macapagal',    role:'Broadcast Director',                 program:'Bachelor of Arts in Communication',                               initials:'RL' },

  { group:'Writing Department', subgroup:'Senior Correspondents', name:'Patricia Liana G. Lomboy',      role:'Senior Correspondent', program:'Bachelor of Science in Accountancy',                                   initials:'PL' },
  { group:'Writing Department', subgroup:'Senior Correspondents', name:'Alelie Jade J. Mallari',        role:'Senior Correspondent', program:'Bachelor of Arts in Psychology',                                       initials:'AJ' },
  { group:'Writing Department', subgroup:'Senior Correspondents', name:'Nicolle C. Garcia',             role:'Senior Correspondent', program:'Bachelor of Science in Chemistry',                                     initials:'NC' },
  { group:'Writing Department', subgroup:'Senior Correspondents', name:'Janeth G. Gamboa',              role:'Senior Correspondent', program:'Bachelor of Science in Information Technology Major in Networking and Administration', initials:'JG' },
  { group:'Writing Department', subgroup:'Senior Correspondents', name:'Joshua Adrian N. Castro',       role:'Senior Correspondent', program:'Bachelor of Arts in Psychology',                                       initials:'JC' },
  { group:'Writing Department', subgroup:'Senior Correspondents', name:'Leanne Chrizelle C. Sarmiento', role:'Senior Correspondent', program:'Bachelor of Arts in English Language Studies',                         initials:'LC' },
  { group:'Writing Department', subgroup:'Senior Correspondents', name:'Danica L. Burce',               role:'Senior Correspondent', program:'Bachelor of Science in Accounting Information System',                 initials:'DB' },
  { group:'Writing Department', subgroup:'Senior Correspondents', name:'Vincent Jayne B. Pallasigui',   role:'Senior Correspondent', program:'Bachelor of Arts in English Language Studies',                         initials:'VP' },
  { group:'Writing Department', subgroup:'Writers',               name:'Trixie L. Galulu',              role:'Writer',               program:'Bachelor of Secondary Education Major in English',                     initials:'TG' },
  { group:'Writing Department', subgroup:'Writers',               name:'Vhenus Abigail T. Bagay',       role:'Writer',               program:'Bachelor of Arts in Communication',                                    initials:'VA' },
  { group:'Writing Department', subgroup:'Trainee Writer',        name:'Jhermel B. Dagalea',            role:'Trainee Writer',       program:'Bachelor of Science in Architecture',                                  initials:'JB' },

  { group:'Art Department', subgroup:'Cartoonists/Graphic Artists', name:'Benny Dick D. Paraso',        role:'Graphic Artist', program:'—',                                                              initials:'BP' },
  { group:'Art Department', subgroup:'Cartoonists/Graphic Artists', name:'Reina Jyneh L. Sapigao',     role:'Graphic Artist', program:'Bachelor of Science in Architecture',                            initials:'RJ' },
  { group:'Art Department', subgroup:'Cartoonists/Graphic Artists', name:'Nikka I. Salamanca',         role:'Graphic Artist', program:'Bachelor of Science in Environmental Science',                   initials:'NS' },
  { group:'Art Department', subgroup:'Cartoonists/Graphic Artists', name:'Stephaney Joy C. Sarmiento', role:'Artist',         program:'Bachelor of Science in Business Administration',                 initials:'SJ' },
  { group:'Art Department', subgroup:'Trainee Artist',  name:'John Hermie M. Sarceda',     role:'Trainee Artist', program:'Bachelor of Science in Information Technology Major in Web and Mobile Applications', initials:'JH' },

  { group:'Layout Department', subgroup:'Layout Artists', name:'Nathaniel P. Tintero',  role:'Layout Artist', program:'Bachelor of Science in Accountancy',                                 initials:'NP' },
  { group:'Layout Department', subgroup:'Layout Artists', name:'Noah Justin B. Pascua', role:'Layout Artist', program:'Bachelor of Science in Civil Engineering Major in Structural Engineering', initials:'NJ' },

  { group:'Lens Department', subgroup:'Photojournalists',        name:'Clarisse R. Ekstrom',        role:'Photojournalist',         program:'Bachelor of Science in Civil Engineering',  initials:'CE' },
  { group:'Lens Department', subgroup:'Photojournalists',        name:'Alejandro C. Enjambre',      role:'Photojournalist',         program:'Bachelor of Public Administration',         initials:'AE' },
  { group:'Lens Department', subgroup:'Photojournalists',        name:'Trisha Lorraine B. Capala',  role:'Photojournalist',         program:'Bachelor of Arts in Psychology',            initials:'TC' },
  { group:'Lens Department', subgroup:'Photojournalists',        name:'Genesis Gale D. Noe',        role:'Photojournalist',         program:'Bachelor of Science in Nursing',            initials:'GG' },
  { group:'Lens Department', subgroup:'Photojournalists',        name:'Ariza Reyn P. Pascual',      role:'Photojournalist',         program:'Bachelor of Science in Nursing',            initials:'AP' },
  { group:'Lens Department', subgroup:'Trainee Photojournalist', name:'John Albert Kyle M. Pineda', role:'Trainee Photojournalist', program:'Bachelor of Arts in Psychology',            initials:'JP' },

  { group:'Broadcast Department', subgroup:'Broadcaster',          name:'Andrea Jeanel M. Mandap',   role:'Broadcaster',         program:'Bachelor of Arts in Communication',       initials:'AJ' },
  { group:'Broadcast Department', subgroup:'Trainee Broadcasters', name:'Kestan Rafael L. Oniate',   role:'Trainee Broadcaster', program:'Bachelor of Arts in Communication',       initials:'KO' },
  { group:'Broadcast Department', subgroup:'Trainee Broadcasters', name:'Paulene Vhenice S. Flores', role:'Trainee Broadcaster', program:'Bachelor of Science in Architecture',     initials:'PV' },
  { group:'Broadcast Department', subgroup:'Trainee Broadcasters', name:'Khen P. Diaz',              role:'Trainee Broadcaster', program:'Bachelor of Arts in Psychology',          initials:'KD' },
  { group:'Broadcast Department', subgroup:'Technical Producer',   name:'Mark Adrianne M. Capulong', role:'Technical Producer',  program:'Bachelor of Science in Computer Science', initials:'MC' },

  { group:'Adviser', subgroup:null, name:'Gladie Natherine G. Cabanizas', role:'Adviser', program:'Faculty Adviser', initials:'DC' }
];

/* ---------- Site credits ----------
   Who built the website is a fact about the site, not a property of the
   editorial roster, so it lives here rather than in board_members. That also
   means it survives a member being renamed, re-grouped or re-sorted in the
   admin panel.

   Matching is deliberately forgiving: names are compared with case, punctuation
   and spacing stripped, so "Mark Adrianne M. Capulong" still matches
   "Mark Adrianne Capulong" or "mark capulong". The row id is accepted as a
   second key in case the display name is ever edited.

   To credit someone else, add an entry here. */
const BOARD_CREDITS = [
  {
    names: [
      'Mark Adrianne M. Capulong',
      'Mark Adrianne Capulong',
      'Mark Capulong'
    ],
    ids: ['c1703be1-8e65-47a7-87fb-38453ee31816'],
    label: 'Built this website',
    short: 'Website'
  }
];

const normalizePersonName = (s) => String(s == null ? '' : s)
  .toLowerCase()
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function boardCreditFor(member) {
  if (!member) return null;
  const name = normalizePersonName(member.name);
  const id = member.id ? String(member.id) : '';
  return BOARD_CREDITS.find(c =>
    (id && (c.ids || []).indexOf(id) !== -1) ||
    (name && (c.names || []).some(n => normalizePersonName(n) === name))
  ) || null;
}

let articles = [];
let releases = [];
let boardMembers = BOARD.slice();
const appCache = { publishedArticles: null, allArticles: null };
let session = null;
let currentRole = null;
let activeFilter = 'all';
let searchTerm = '';
let editingId = null;
let pendingThumbnail = null;
let searchQuery = '';
let statusFilter = '';
let catFilter = '';
let confirmCb = null;
let lastFocused = null;
let articleReturnUrl = '';
let articleModalSeo = false;
let boardPhotos = {};
let boardPhotosPromise = null;
let releasesPreviewPromise = null;
let sessionReady = Promise.resolve();
let pendingBoardUpload = null;
let boardProfileOpen = false;
let modalOpen = false;
let editingReleaseId = null;
let pendingReleaseCover = null;
let editingVideoId = null;
let pendingVideoThumb = null;
let videoThumbMode = 'auto';   // 'auto' | 'upload'
let releaseProvider = 'heyzine';
let archiveFilter = 'all';
let videoCatFilter = 'all';
let homeSort = 'recent';
let newsSubcat = 'all';
let editingMemoriamId = null;
let pendingMemoriamPhoto = null;
let draftTimer = null;
let selectedIds = new Set();

async function refreshPublicArticleState() {
  try {
    const published = await Data.listPublished();
    articles = Array.isArray(published) ? published : [];
  } catch (err) {
    console.warn('[The Work] Could not refresh published articles', err);
  }
  try {
    const all = await Data.listAll();
    window.__allArticles = Array.isArray(all) ? all : [];
  } catch (err) {
    console.warn('[The Work] Could not refresh all articles', err);
  }
}

function safeAllArticles() {
  if (!Array.isArray(window.__allArticles)) window.__allArticles = [];
  return window.__allArticles;
}

function safePendingThumbFile() {
  if (window.__pendingThumbFile instanceof File) return window.__pendingThumbFile;
  if (window.__pendingThumbFile && typeof window.__pendingThumbFile === 'object' && typeof window.__pendingThumbFile.name === 'string') return window.__pendingThumbFile;
  window.__pendingThumbFile = null;
  return null;
}

window.__allArticles = safeAllArticles();
window.__pendingThumbFile = safePendingThumbFile();

function twDraftKey(id = 'new') {
  return `tw_article_draft_${String(id || 'new')}`;
}

function twCollectDraft() {
  const form = $('#articleForm');
  if (!form) return null;
  return {
    id: editingId || 'new',
    title: $('#fTitle').value.trim(),
    cat: $('#fCat').value,
    author: $('#fAuthor').value.trim(),
    author2: $('#fAuthor2').value.trim(),
    photojournalist: $('#fPhoto').value.trim(),
    layout_by: $('#fLayout').value.trim(),
    layout_by_2: $('#fLayout2').value.trim(),
    graphics_by: $('#fGraphics').value.trim(),
    date: $('#fDate').value || todayISO(),
    read: $('#fRead').value.trim() || '1 min',
    publish_at: $('#fPublishAt').value || '',
    excerpt: $('#fExcerpt').value.trim(),
    body: $('#fBody').value.trim(),
    status: $('#fStatus').value,
    featured: $('#fFeatured').checked,
    thumbnail: pendingThumbnail || null,
    updated: new Date().toISOString()
  };
}

function twSaveDraft() {
  const draft = twCollectDraft();
  if (!draft) return;
  localStorage.setItem(twDraftKey(draft.id), JSON.stringify(draft));
}

function twLoadDraft(id = editingId || 'new') {
  try {
    const raw = localStorage.getItem(twDraftKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[The Work] Draft parse failed', err);
    return null;
  }
}

function twClearDraft(id = editingId || 'new') {
  localStorage.removeItem(twDraftKey(id));
}

function twApplyDraft(draft) {
  if (!draft || !$('#articleForm')) return;
  editingId = draft.id && draft.id !== 'new' ? draft.id : null;
  $('#fId').value = editingId || '';
  $('#fTitle').value = draft.title || '';
  $('#fCat').value = draft.cat || '';
  $('#fAuthor').value = draft.author || '';
  $('#fAuthor2').value = draft.author2 || '';
  $('#fPhoto').value = draft.photojournalist || '';
  $('#fLayout').value = draft.layout_by || '';
  $('#fLayout2').value = draft.layout_by_2 || '';
  $('#fGraphics').value = draft.graphics_by || '';
  $('#fDate').value = draft.date || todayISO();
  $('#fRead').value = draft.read || '';
  $('#fPublishAt').value = draft.publish_at || '';
  $('#fExcerpt').value = draft.excerpt || '';
  $('#fBody').value = draft.body || '';
  $('#fStatus').value = draft.status || 'published';
  $('#fFeatured').checked = !!draft.featured;
  $('#editorTitle').textContent = editingId ? 'Edit article' : 'New article';
  $('#deleteBtn').style.display = editingId ? 'inline-flex' : 'none';
  setThumbnail(draft.thumbnail || null, draft.thumbnail ? 'saved-draft.jpg' : '');
  if (typeof updateBodyMeter === 'function') updateBodyMeter();
}

function twOfferDraft(id = editingId || 'new') {
  const draft = twLoadDraft(id);
  if (!draft || !$('#articleForm')) return;
  const hasCurrent = $('#fTitle').value.trim() || $('#fBody').value.trim() || $('#fExcerpt').value.trim() || $('#fAuthor').value.trim();
  if (hasCurrent && !id) return;
  if (hasCurrent && id !== 'new' && editingId && editingId === id) return;
  twApplyDraft(draft);
  toast('Unsaved draft restored');
}

function twStartDraftTimer() {
  twStopDraftTimer();
  draftTimer = setInterval(() => {
    if (document.getElementById('articleForm')) twSaveDraft();
  }, 1800);
}

function twStopDraftTimer() {
  if (draftTimer) {
    clearInterval(draftTimer);
    draftTimer = null;
  }
}

const Data = {
  async listPublished() {
    if (appCache.publishedArticles) return appCache.publishedArticles.slice();
    if (!sb) {
      const result = JSON.parse(localStorage.getItem('tw_articles') || '[]').filter(a => a.status === 'published' && !a.deleted_at);
      appCache.publishedArticles = result;
      return result.slice();
    }
    /* `status` must stay in this list. Without it every public article has
       status === undefined, which silently broke three things that test for
       'published': the related-articles list in the modal, the view counter,
       and articleModalSeo - the flag that pushes /stories/<slug>/<id> into the
       address bar and updates the og:/canonical tags. */
    const PUBLISHED_COLUMNS = 'id,title,excerpt,thumbnail,date,cat,subcat,status,author,author2,read,views,featured,updated,publish_at,photojournalist,photojournalist_2,photo_courtesy,layout_by,layout_by_2,graphics_by';
    /* `publish_at` in the past (or null) means the article is live. A future
       publish_at keeps it out of the public list even though status='published'. */
    const nowIso = new Date().toISOString();
    const { data, error } = await sb.from('articles').select(PUBLISHED_COLUMNS).eq('status','published').is('deleted_at', null).or(`publish_at.is.null,publish_at.lte.${nowIso}`).order('date',{ascending:false, nullsFirst:false});
    if (error) { console.error(error); return []; }
    appCache.publishedArticles = data || [];
    return appCache.publishedArticles.slice();
  },
  async listAll() {
    if (appCache.allArticles) return appCache.allArticles.slice();
    if (!sb) {
      const result = JSON.parse(localStorage.getItem('tw_articles') || '[]').filter(a => !a.deleted_at);
      appCache.allArticles = result;
      return result.slice();
    }
    const { data, error } = await sb.from('articles').select('*').is('deleted_at', null).order('updated',{ascending:false});
    if (error) return [];
    appCache.allArticles = data || [];
    return appCache.allArticles.slice();
  },
  async upsert(article) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_articles') || '[]');
      const idx = list.findIndex(x => x.id === article.id);
      if (idx >= 0) list[idx] = article; else list.unshift(article);
      localStorage.setItem('tw_articles', JSON.stringify(list));
      appCache.publishedArticles = null;
      appCache.allArticles = null;
      return article;
    }
    const { data, error } = await sb.from('articles').upsert(article).select().single();
    if (error) throw error;
    appCache.publishedArticles = null;
    appCache.allArticles = null;
    return data;
  },
  async remove(id) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_articles') || '[]');
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) list[idx].deleted_at = new Date().toISOString();
      localStorage.setItem('tw_articles', JSON.stringify(list));
      appCache.publishedArticles = null;
      appCache.allArticles = null;
      return;
    }
    const { error } = await sb.from('articles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    appCache.publishedArticles = null;
    appCache.allArticles = null;
  },
  async restore(id) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_articles') || '[]');
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) delete list[idx].deleted_at;
      localStorage.setItem('tw_articles', JSON.stringify(list));
      appCache.publishedArticles = null;
      appCache.allArticles = null;
      return;
    }
    const { error } = await sb.from('articles').update({ deleted_at: null }).eq('id', id);
    if (error) throw error;
    appCache.publishedArticles = null;
    appCache.allArticles = null;
  },
  async hardRemove(id) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_articles') || '[]').filter(x => x.id !== id);
      localStorage.setItem('tw_articles', JSON.stringify(list));
      appCache.publishedArticles = null;
      appCache.allArticles = null;
      return;
    }
    const { error } = await sb.from('articles').delete().eq('id', id);
    if (error) throw error;
    appCache.publishedArticles = null;
    appCache.allArticles = null;
  },
  async listBoardMembers() {
    if (!sb) return BOARD.slice();
    const { data, error } = await sb.from('board_members').select('*').order('sort_order',{ascending:true});
    if (error) {
      /* Falling back silently to the hardcoded BOARD array loses the row ids,
         which turns every subsequent edit into an INSERT and duplicates the
         member. Say so out loud. */
      console.warn('[The Work] board_members fetch failed', error);
      toast('Could not load the EB roster — edits may duplicate members.', true);
      return BOARD.slice();
    }
    return (data || []).map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      program: r.program,
      group: r.member_group,
      subgroup: r.subgroup,
      initials: r.initials,
      sort_order: r.sort_order
    }));
  },
  async upsertBoardMember(m) {
    if (!sb) throw new Error('Offline');
    /* Articles and board_photos key off the member's name as a plain string,
       so a rename must rewrite those references or it orphans their photo and
       every byline/credit that mentioned the old name. */
    let oldName = null;
    if (m.id) {
      const { data: existing } = await sb.from('board_members').select('name').eq('id', m.id).maybeSingle();
      if (existing && existing.name && existing.name !== m.name) oldName = existing.name;
    }
    /* A row loaded from the hardcoded fallback has no id. If a member with the
       same name already exists in the table, adopt its id instead of inserting
       a duplicate row. */
    let resolvedId = m.id || null;
    if (!resolvedId && m.name) {
      const { data: byName } = await sb.from('board_members').select('id').eq('name', m.name).maybeSingle();
      if (byName && byName.id) resolvedId = byName.id;
    }
    const payload = {
      id: resolvedId || undefined,
      name: m.name,
      role: m.role,
      program: m.program || null,
      member_group: m.group,
      subgroup: m.subgroup || null,
      initials: m.initials || null,
      sort_order: m.sort_order || 100,
      updated: new Date().toISOString()
    };
    const { data, error } = await sb.from('board_members').upsert(payload).select().single();
    if (error) throw error;
    if (oldName) await Data.renameMemberReferences(oldName, m.name);
    return data;
  },
  async renameMemberReferences(oldName, newName) {
    if (!sb || !oldName || !newName || oldName === newName) return;

    /* --- board_photos: photo row is keyed by name. Move the key. --- */
    try {
      const { error: renameErr } = await sb.from('board_photos')
        .update({ name: newName, updated: new Date().toISOString() })
        .eq('name', oldName);
      if (renameErr) {
        /* If `name` is a PK and RLS blocks UPDATE, fall back to delete+insert. */
        const { data: row } = await sb.from('board_photos').select('*').eq('name', oldName).maybeSingle();
        if (row) {
          await sb.from('board_photos').delete().eq('name', oldName);
          await sb.from('board_photos').insert({ name: newName, photo_url: row.photo_url, updated: new Date().toISOString() });
        }
      }
    } catch (e) { console.warn('[The Work] Photo rename failed', e); }

    /* --- articles --- */
    const articleFields = ['author', 'author2', 'photojournalist', 'photojournalist_2', 'layout_by', 'layout_by_2', 'graphics_by'];
    for (const field of articleFields) await Data._cascadeName('articles', field, oldName, newName);

    /* --- videos (some fields may hold comma-separated names) --- */
    const videoFields = ['broadcasters', 'broadcaster_2', 'technicians',
      'videojournalist', 'videojournalist_2', 'videojournalist_3',
      'director', 'director_2', 'writer', 'writer_2', 'writer_3',
      'animator', 'animator_2', 'editor'];
    for (const field of videoFields) await Data._cascadeName('videos', field, oldName, newName);

    /* Client caches hold the old name until invalidated. */
    appCache.publishedArticles = null;
    appCache.allArticles = null;
  },
  async _cascadeName(table, field, oldName, newName) {
    if (!sb) return;
    try {
      /* ilike finds the row regardless of surrounding text; the split/compare
         below then only rewrites whole-token matches, so "John Doe" inside
         "John Doe, Jane Smith" is replaced but "John Doeson" is left alone. */
      const { data: rows, error } = await sb.from(table).select('id,' + field).ilike(field, '%' + oldName + '%');
      if (error || !rows || !rows.length) return;
      for (const row of rows) {
        const raw = String(row[field] || '');
        const parts = raw.split(',').map(s => s.trim());
        let changed = false;
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] === oldName) { parts[i] = newName; changed = true; }
        }
        if (changed) {
          const { error: upErr } = await sb.from(table).update({ [field]: parts.join(', ') }).eq('id', row.id);
          if (upErr) console.warn('[The Work] Cascade update failed', table, field, upErr.message);
        }
      }
    } catch (e) { console.warn('[The Work] Cascade failed for ' + table + '.' + field, e); }
  },
  async removeBoardMember(id) {
    if (!sb) throw new Error('Offline');
    /* board_photos is keyed by name, not by member id. Delete the member row
       first to fetch the name, then drop the photo so a future member with the
       same name cannot inherit it. */
    const { data: row } = await sb.from('board_members').select('name').eq('id', id).maybeSingle();
    const { error } = await sb.from('board_members').delete().eq('id', id);
    if (error) throw error;
    if (row && row.name) {
      await sb.from('board_photos').delete().eq('name', row.name);
    }
  },
  async listTrashed() {
    if (!sb) return JSON.parse(localStorage.getItem('tw_articles') || '[]').filter(a => a.deleted_at);
    const { data, error } = await sb.from('articles').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    if (error) return [];
    return data || [];
  },
  async fetchBody(id) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_articles') || '[]');
      const found = list.find(a => a.id === id);
      return found ? (found.body || '') : '';
    }
    const { data, error } = await sb.from('articles').select('body').eq('id', id).single();
    if (error) return '';
    return data ? (data.body || '') : '';
  },
  async uploadThumb(file) {
    if (!sb) return await resizeImage(file, 900, 0.82);
    const blob = await resizeImageToBlob(file, 1400, 0.85);
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '.' + ext;

    /* Upload via our own Worker (same origin as the site) rather than hitting
       Supabase Storage directly. Browsers with strict privacy defaults -
       Brave Shields, Firefox ETP Strict, Safari ITP - classify a direct
       request to *.supabase.co as third-party and strip the Authorization
       header, which surfaces as an opaque ProgressEvent with no status.
       Proxying through the Worker makes the request same-origin, so the auth
       header arrives intact.

       Falls back to an inline data URL if the proxy is unavailable, so an
       article can still be saved. */
    try {
      /* Force a fresh session first - a stale JWT is a second, unrelated
         reason uploads can 401. */
      try { await sb.auth.getSession(); } catch (_) { /* non-fatal */ }
      const { data: { session } } = await sb.auth.getSession();
      const token = (session && session.access_token) || '';

      const res = await fetch('/api/upload-thumb?path=' + encodeURIComponent(path), {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': blob.type
        },
        body: blob
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error('Upload ' + res.status + (body ? ': ' + body.slice(0, 200) : ''));
      }

      const { data } = sb.storage.from('thumbnails').getPublicUrl(path);
      if (data && data.publicUrl) return data.publicUrl;
      throw new Error('Upload returned no public URL.');
    } catch (err) {
      console.error('[The Work] Thumbnail upload failed:', err);
      toast('Image upload failed — using inline image. Try refreshing if this repeats.', true);
      return await resizeImage(file, 1200, 0.78);
    }
  },
  async loadBoardPhotos() {
    if (!sb) { try { return JSON.parse(localStorage.getItem('tw_board_photos') || '{}'); } catch(e) { return {}; } }
    const { data, error } = await sb.from('board_photos').select('*');
    if (error) return {};
    const map = {};
    (data || []).forEach(r => { map[r.name] = r.photo_url; });
    return map;
  },
  async saveBoardPhoto(name, url) {
    if (!sb) {
      const map = JSON.parse(localStorage.getItem('tw_board_photos') || '{}');
      map[name] = url;
      localStorage.setItem('tw_board_photos', JSON.stringify(map));
      return;
    }
    const { error } = await sb.from('board_photos').upsert({ name, photo_url: url, updated: new Date().toISOString() });
    if (error) throw error;
  },
  async deleteBoardPhoto(name) {
    if (!sb) {
      const map = JSON.parse(localStorage.getItem('tw_board_photos') || '{}');
      delete map[name];
      localStorage.setItem('tw_board_photos', JSON.stringify(map));
      return;
    }
    const { error } = await sb.from('board_photos').delete().eq('name', name);
    if (error) throw error;
  },
  async uploadBoardPhoto(blob) {
    if (!sb) {
      return await new Promise(resolve => {
        const r = new FileReader();
        r.onload = ev => resolve(ev.target.result);
        r.readAsDataURL(blob);
      });
    }
    const path = 'board-' + Date.now() + '-' + Math.random().toString(36).slice(2,8) + '.jpg';
    const { error } = await sb.storage.from('thumbnails').upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' });
    if (error) throw error;
    const { data } = sb.storage.from('thumbnails').getPublicUrl(path);
    return data.publicUrl;
  },
  async listPublishedReleases() {
    if (!sb) return JSON.parse(localStorage.getItem('tw_releases') || '[]').filter(i => i.status === 'published');
    const { data, error } = await sb.from('issues').select('*').eq('status','published').order('issue_date',{ascending:false, nullsFirst:false});
    if (error) return [];
    return data || [];
  },
  async listAllReleases() {
    if (!sb) return JSON.parse(localStorage.getItem('tw_releases') || '[]');
    const { data, error } = await sb.from('issues').select('*').order('updated',{ascending:false});
    if (error) return [];
    return data || [];
  },
  async upsertRelease(release) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_releases') || '[]');
      const idx = list.findIndex(x => x.id === release.id);
      if (idx >= 0) list[idx] = release; else list.unshift(release);
      localStorage.setItem('tw_releases', JSON.stringify(list));
      return release;
    }
    const { data, error } = await sb.from('issues').upsert(release).select().single();
    if (error) throw error;
    return data;
  },
  async removeRelease(id) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_releases') || '[]').filter(x => x.id !== id);
      localStorage.setItem('tw_releases', JSON.stringify(list));
      return;
    }
    const { error } = await sb.from('issues').delete().eq('id', id);
    if (error) throw error;
  },
  async listAllVideos() {
    if (!sb) return JSON.parse(localStorage.getItem('tw_videos') || '[]');
    const { data, error } = await sb.from('videos').select('*').order('sort_order',{ascending:true});
    if (error) return [];
    return data || [];
  },
  async listVideos() {
    if (!sb) return JSON.parse(localStorage.getItem('tw_videos') || '[]').filter(v => v.status === 'published');
    const { data, error } = await sb.from('videos').select('*').eq('status','published').order('sort_order',{ascending:true});
    if (error) return [];
    return data || [];
  },
  async upsertVideo(video) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_videos') || '[]');
      const idx = list.findIndex(x => x.id === video.id);
      if (idx >= 0) list[idx] = video; else list.unshift(video);
      localStorage.setItem('tw_videos', JSON.stringify(list));
      return video;
    }
    const { data, error } = await sb.from('videos').upsert(video).select().single();
    if (error) throw error;
    return data;
  },
  async removeVideo(id) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_videos') || '[]').filter(x => x.id !== id);
      localStorage.setItem('tw_videos', JSON.stringify(list));
      return;
    }
    const { error } = await sb.from('videos').delete().eq('id', id);
    if (error) throw error;
  },
  async listMemoriam() {
    if (!sb) return JSON.parse(localStorage.getItem('tw_memoriam') || '[]');
    const { data, error } = await sb.from('memoriam').select('*').order('sort_order',{ascending:true});
    if (error) return [];
    return data || [];
  },
  async upsertMemoriam(item) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_memoriam') || '[]');
      const idx = list.findIndex(x => x.id === item.id);
      if (idx >= 0) list[idx] = item; else list.unshift(item);
      localStorage.setItem('tw_memoriam', JSON.stringify(list));
      return item;
    }
    const { data, error } = await sb.from('memoriam').upsert(item).select().single();
    if (error) throw error;
    return data;
  },
  async removeMemoriam(id) {
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('tw_memoriam') || '[]').filter(x => x.id !== id);
      localStorage.setItem('tw_memoriam', JSON.stringify(list));
      return;
    }
    const { error } = await sb.from('memoriam').delete().eq('id', id);
    if (error) throw error;
  }
};

function ensureBoardPhotos() {
  if (!boardPhotosPromise) {
    boardPhotosPromise = Data.loadBoardPhotos().then(map => {
      boardPhotos = map || {};
      if ($('#view-board').classList.contains('active')) renderBoard();
      const boardPanel = $('#panel-board');
      if (boardPanel && boardPanel.classList.contains('active')) renderBoardAdmin();
    }).catch(err => {
      boardPhotosPromise = null;
      console.warn('[The Work] Could not load board photos', err);
    });
  }
  return boardPhotosPromise;
}

function ensureReleasesPreview() {
  if (!releasesPreviewPromise) {
    releasesPreviewPromise = renderReleasesPreview().catch(err => {
      releasesPreviewPromise = null;
      console.warn('[The Work] Could not load releases preview', err);
    });
  }
  return releasesPreviewPromise;
}

async function getSession() {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}
async function signIn(email, password) {
  if (!sb) return { ok: false, error: 'Connection error. Reload the page.' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data.session };
}
async function signOut() {
  if (!sb) return;
  await sb.auth.signOut();
}

// ---------- Role-based access ----------
const ROLE_LABELS = { dev: 'Developer', eb: 'Editorial Board', member: 'Member' };

const ROLE_PERMISSIONS = {
  articles:    { dev: 'Full',      eb: 'Full',      member: 'Full' },
  videos:      { dev: 'Full',      eb: 'Full',      member: 'Full' },
  releases:    { dev: 'Full',      eb: 'Full',      member: '—' },
  memoriam:    { dev: 'Full',      eb: 'Full',      member: '—' },
  boardPhotos: { dev: 'Full',      eb: 'Full',      member: '—' },
  ebRoster:    { dev: 'Full',      eb: 'Full',      member: '—' },
  trash:       { dev: 'Full',      eb: 'Restore',   member: 'Hidden' },
  purge:       { dev: 'Yes',       eb: 'No',        member: 'No' },
  settings:    { dev: 'Full',      eb: 'Full',      member: 'Full' },
  users:       { dev: 'Full',      eb: '—',         member: '—' }
};

async function loadRole() {
  if (!sb) { currentRole = null; return; }
  if (!session || !session.user) { currentRole = null; return; }
  try {
    const { data, error } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
    if (error || !data) { currentRole = 'member'; }
    else { currentRole = data.role || 'member'; }
  } catch (e) {
    currentRole = 'member';
  }
  applyRoleUI();
}

function canAccess(panel) {
  const r = currentRole || 'member';
  if (r === 'dev') return true;
  if (panel === 'releases' || panel === 'memoriam' || panel === 'board' || panel === 'roster') return r === 'eb';
  if (panel === 'trash') return r === 'eb';
  return true; // dashboard, articles, new, videos, settings, permissions
}

function applyRoleUI() {
  const r = currentRole;
  // Sidebar
  document.querySelectorAll('.admin-nav button[data-panel]').forEach(btn => {
    const p = btn.dataset.panel;
    if (p === 'back') return;
    btn.style.display = canAccess(p) ? '' : 'none';
  });
  // Purge buttons in trash (only dev)
  document.querySelectorAll('[data-trash-purge]').forEach(btn => {
    btn.style.display = (r === 'dev') ? '' : 'none';
  });
  // Role badge in settings
  const roleEl = document.getElementById('acRole');
  if (roleEl) roleEl.textContent = ROLE_LABELS[r] || r || '—';
}

function safeErrorText(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const direct = err.message || err.error?.message || err.target?.error?.message;
    if (typeof direct === 'string' && direct.trim() && direct !== '[object ProgressEvent]' && direct !== '[object Event]') return direct;
    if (typeof err.type === 'string' && err.type.trim()) return err.type;
    const stringVal = String(err);
    if (stringVal && stringVal !== '[object Object]' && stringVal !== '[object ProgressEvent]' && stringVal !== '[object Event]') return stringVal;
    if (err.name) return err.name;
  }
  return 'Request failed';
}

function toast(msg, isError) {
  $('#toastText').textContent = msg;
  $('#toast').classList.toggle('error', !!isError);
  $('#toast').classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => $('#toast').classList.remove('show'), 3200);
}
function resizeImageToBlob(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, (maxW || 1400) / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(blob => {
          if (!blob) { reject(new Error('Could not encode image')); return; }
          if (blob.type === 'image/webp' || blob.type === 'image/jpeg') {
            resolve(blob);
          } else {
            c.toBlob(b => resolve(b || blob), 'image/jpeg', quality || 0.85);
          }
        }, 'image/webp', quality || 0.85);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, (maxW||900)/img.width);
        const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
        const c = document.createElement('canvas');
        c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        resolve(c.toDataURL('image/jpeg', quality||0.82));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function openConfirm(title, msg, cb) {
  $('#confirmTitle').textContent = title;
  $('#confirmMsg').textContent = msg;
  confirmCb = cb;
  $('#confirmOverlay').classList.add('open');
}
function closeConfirm() { $('#confirmOverlay').classList.remove('open'); confirmCb = null; }
$('#confirmCancel').addEventListener('click', closeConfirm);
$('#confirmOverlay').addEventListener('click', e => { if (e.target === $('#confirmOverlay')) closeConfirm(); });
$('#confirmOk').addEventListener('click', () => { if (confirmCb) confirmCb(); closeConfirm(); });

/* The head ships prefers-color-scheme variants of theme-color. Once the user
   picks a theme by hand the OS preference is no longer the source of truth, so
   append a media-less meta - last in <head> wins - and keep it updated. */
function syncThemeColor(t) {
  let m = document.getElementById('themeColorMeta');
  if (!m) {
    m = document.createElement('meta');
    m.id = 'themeColorMeta';
    document.head.appendChild(m);
  }
  m.removeAttribute('media');
  m.setAttribute('name', 'theme-color');
  m.setAttribute('content', t === 'dark' ? '#0D0720' : '#FAF8FF');
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#iconSun').style.display = t==='dark'?'none':'block';
  $('#iconMoon').style.display = t==='dark'?'block':'none';
  syncThemeColor(t);
  try { localStorage.setItem('tw_theme', t); } catch(e){}
}
$('#themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});
(function initSortToggle(){
  const sortStrip = document.querySelector('.sort-strip');
  const btn = document.getElementById('sortToggle');
  if (!sortStrip || !btn) return;
  const saved = localStorage.getItem('tw_sort_visible');
  const visible = saved === null ? true : saved === '1';
  sortStrip.style.display = visible ? '' : 'none';
  btn.style.opacity = visible ? '1' : '0.5';
  btn.addEventListener('click', () => {
    const isVisible = sortStrip.style.display !== 'none';
    sortStrip.style.display = isVisible ? 'none' : '';
    btn.style.opacity = isVisible ? '0.5' : '1';
    try { localStorage.setItem('tw_sort_visible', isVisible ? '0' : '1'); } catch(e) {}
  });
})();
/* Single owner of the mobile menu so the burger, the links and the router can
   never disagree about its state - or about the scroll lock that goes with it. */
function setNavMenu(open) {
  const nav = $('#navSections');
  const burger = $('#burger');
  if (!nav) return;
  if (nav.classList.contains('open') === open) return;
  nav.classList.toggle('open', open);
  if (burger) burger.setAttribute('aria-expanded', String(open));
  if (open) lockScroll(); else unlockScroll();
}
$('#burger').addEventListener('click', () => {
  setNavMenu(!$('#navSections').classList.contains('open'));
});
$('#navSections').addEventListener('click', e => {
  if (e.target.tagName === 'A') setNavMenu(false);
});
window.addEventListener('scroll', () => {
  $('#nav').classList.toggle('stuck', window.scrollY > 6);
  const h = document.documentElement.scrollHeight - window.innerHeight;
  $('#progress').style.width = h > 0 ? (window.scrollY/h*100)+'%' : '0';
}, { passive: true });

function updateAuthUI() {
  const logged = !!session;
  $('#loginBtn').style.display = logged ? 'none' : 'inline-flex';
  $('#logoutBtn').style.display = logged ? 'inline-flex' : 'none';
  $('#userChip').style.display = logged ? 'inline-flex' : 'none';
  if (logged) {
    const email = session.user?.email || session.email || 'admin';
    $('#userName').textContent = email.split('@')[0];
    $('#userAvatar').textContent = email.charAt(0).toUpperCase();
    if ($('#acWho')) $('#acWho').textContent = email;
  }
}
$('#loginBtn').addEventListener('click', () => {
  $('#loginError').classList.remove('show');
  $('#loginForm').reset();
  $('#loginOverlay').classList.add('open');
  setTimeout(() => $('#loginEmail').focus(), 80);
});
$('#loginClose').addEventListener('click', () => $('#loginOverlay').classList.remove('open'));
$('#loginOverlay').addEventListener('click', e => { if (e.target === $('#loginOverlay')) $('#loginOverlay').classList.remove('open'); });
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#loginError').classList.remove('show');
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    const r = await signIn($('#loginEmail').value.trim(), $('#loginPw').value);
    if (!r.ok) {
      const el = $('#loginError');
      el.textContent = r.error;
      el.classList.add('show');
      return;
    }
    session = r.session;
    $('#loginOverlay').classList.remove('open');
    updateAuthUI();
    await loadRole();
    toast('Welcome back');
    location.hash = '#/admin';
  } finally {
    btn.disabled = false; btn.textContent = 'Sign In';
  }
});
$('#logoutBtn').addEventListener('click', async () => { await signOut(); session = null; currentRole = null; updateAuthUI(); location.hash = '#/'; toast('Signed out'); });
$('#signOutBtn').addEventListener('click', async () => { await signOut(); session = null; currentRole = null; updateAuthUI(); location.hash = '#/'; toast('Signed out'); });
$('#userChip').addEventListener('click', () => location.hash = '#/admin');

function setView(v) {
  $$('.view').forEach(el => el.classList.remove('active'));
  const el = $('#view-' + v);
  if (el) el.classList.add('active');
  const skipLink = $('.skip-link');
  if (skipLink) skipLink.href = '#view-' + v;
  $$('.nav-sections a').forEach(a => a.classList.toggle('active', a.dataset.route === v));
}

function slugifyStoryTitle(title) {
  return String(title || 'story').normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'story';
}

function storyUrl(article) {
  return `/stories/${slugifyStoryTitle(article.title)}/${encodeURIComponent(article.id)}`;
}

function storyRouteId() {
  const match = location.pathname.match(/^\/stories\/[^/]+\/([^/]+)\/?$/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch (e) { return null; }
}

function renderStoryPage(article) {
  let main = $('#view-story');
  if (!main) {
    main = document.createElement('main');
    main.id = 'view-story';
    main.className = 'view';
    $('#view-home').before(main);
  }
  const authors = [article.author, article.author2].filter(Boolean).join(' & ') || 'The Work Staff';
  const paragraphs = (article.body || '').split(/\n\s*\n/).filter(p => p.trim());
  main.dataset.serverStory = 'true';
  main.innerHTML = `
    <article class="story-page">
      <div class="wrap story-page-inner">
        <a class="story-back" href="/#/">← All stories</a>
        <div class="story-category">${esc(CAT_LABELS[article.cat] || article.cat || 'Story')}</div>
        <h1>${esc(article.title)}</h1>
        ${article.excerpt ? `<p class="story-deck">${esc(article.excerpt)}</p>` : ''}
        <div class="story-byline">By ${esc(authors)}${article.date ? ` · ${esc(fmtDateLong(article.date))}` : ''}${article.read ? ` · ${esc(article.read)} read` : ''}</div>
        ${article.thumbnail ? `<figure class="story-hero">${imgTag(article.thumbnail, [600, 1200], SIZES.hero, ' alt="" fetchpriority="high" decoding="async"')}</figure>` : ''}
        <div class="story-content">${paragraphs.map(p => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('') || `<p>${esc(article.excerpt || '')}</p>`}</div>
      </div>
    </article>`;
}

function updateArticleMeta(article) {
  const title = article ? `${article.title} — The Work` : 'The Work — Tarlac State University';
  const description = article
    ? (article.excerpt || (article.body || '').slice(0, 160))
    : 'The official student publication of Tarlac State University. Founded 1948.';
  const canonicalUrl = article ? new URL(storyUrl(article), location.origin).href : `${location.origin}/`;
  document.title = title;
  const meta = (selector, value, attr = 'content') => {
    let el = document.querySelector(selector);
    if (!el) {
      /* Opening a story from the list never reloads the page, so tags the
         prerender worker would have injected do not exist yet. Create them,
         otherwise the SPA silently advertises nothing. */
      const parsed = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
      if (!parsed) return;
      el = document.createElement('meta');
      el.setAttribute(parsed[1], parsed[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value || '');
  };
  meta('meta[name="description"]', description);
  meta('meta[property="og:type"]', article ? 'article' : 'website');
  meta('meta[property="og:title"]', title);
  meta('meta[property="og:description"]', description);
  meta('meta[property="og:url"]', canonicalUrl);
  const cardImage = article && article.thumbnail
    ? socialCardUrl(article.thumbnail)
    : `${location.origin}/logo-tw.png`;
  meta('meta[property="og:image"]', cardImage);
  meta('meta[property="og:image:secure_url"]', cardImage);
  meta('meta[property="og:image:alt"]', article ? article.title : 'The Work');
  meta('meta[name="twitter:card"]', 'summary_large_image');
  meta('meta[name="twitter:image"]', cardImage);
  meta('meta[name="twitter:image:alt"]', article ? article.title : 'The Work');
  meta('link[rel="canonical"]', canonicalUrl, 'href');
}

function fmtViews(n) {
  const v = Number(n) || 0;
  if (v === 0) return '';
  if (v < 1000) return v + ' ' + (v === 1 ? 'view' : 'views');
  if (v < 1000000) return (v / 1000).toFixed(v < 10000 ? 1 : 0).replace(/\.0$/, '') + 'k views';
  return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M views';
}

function buildArticleCard(a) {
  const thumbHtml = a.thumbnail
    ? imgTag(a.thumbnail, [320, 640], SIZES.card, ' alt="" loading="lazy" decoding="async"')
    : `<div class="article-thumb-text">${esc((CAT_LABELS[a.cat]||'?').charAt(0))}</div>`;
  const SUBCAT_LABELS = { university:'University', local:'Local', national:'National', politics:'Politics' };
  const subcatBadge = (a.cat === 'news' && a.subcat && SUBCAT_LABELS[a.subcat])
    ? `<span class="article-subcat">${esc(SUBCAT_LABELS[a.subcat])}</span>`
    : '';
  const byline = a.author2 ? `${a.author} & ${a.author2}` : (a.author || 'The Work');
  return `
    <div class="article-thumb">${thumbHtml}<span class="article-cat">${esc(CAT_LABELS[a.cat]||a.cat)}</span>${subcatBadge}</div>
    <div class="article-body">
      <h3 class="article-title"><a data-story-link href="${esc(storyUrl(a))}">${esc(a.title)}</a></h3>
      <p class="article-excerpt">${esc(a.excerpt||(a.body||'').split('\n\n')[0]||'')}</p>
      <div class="article-foot">
        <span class="article-author">${esc(byline)}</span>
        <span>${esc(fmtDate(a.date))}${a.read?' · '+esc(a.read):''}${a.views ? ' · '+esc(fmtViews(a.views)) : ''}</span>
      </div>
    </div>
    ${twSavedButtonHtml(a.id)}
  `;
}

/* ---------- Hero carousel ----------
   Replaces the old lead-story slot. The visible slide advances on a timer;
   the circular ring inside each thumbnail fills over the same interval so the
   reader can see how long is left and which story is next. Pauses on hover,
   on tab-blur, and disables itself entirely under prefers-reduced-motion. */
const TW_CAROUSEL = {
  duration: 5500,
  maxSlides: 5,
  /* Ring lives in a 64×64 viewBox, r=30, so circumference = 2π·30. */
  ringCircumference: 2 * Math.PI * 30
};
let twCarousel = { index: 0, timer: null, ringAnim: null, items: [], paused: false };

function twCarouselPrefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function twBuildCarousel(items) {
  const root = document.getElementById('twCarousel');
  if (!root) return;
  twCarouselStop();
  twCarousel.index = 0;
  twCarousel.paused = false;
  twCarousel.items = (items || []).slice(0, TW_CAROUSEL.maxSlides);
  if (!twCarousel.items.length) { root.style.display = 'none'; return; }
  root.style.display = '';

  const track = root.querySelector('.tw-carousel-track');
  const thumbs = root.querySelector('.tw-carousel-thumbs');

  track.innerHTML = twCarousel.items.map((a, i) => {
    const cat = CAT_LABELS[a.cat] || a.cat;
    const byline = a.author2 ? `${a.author} & ${a.author2}` : (a.author || 'The Work');
    const bg = a.thumbnail ? imgUrl(a.thumbnail, 1200) : '';
    return `
      <div class="tw-slide${i === 0 ? ' active' : ''}" data-index="${i}" data-article-id="${esc(a.id)}">
        ${bg ? `<img class="tw-slide-bg" src="${esc(bg)}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async"${i === 0 ? ' fetchpriority="high"' : ''}>` : ''}
        <div class="tw-slide-shade"></div>
        <div class="tw-slide-content">
          <span class="tw-slide-cat">${esc(cat)}</span>
          <h2 class="tw-slide-title"><a data-story-link href="${esc(storyUrl(a))}">${esc(a.title)}</a></h2>
          ${a.excerpt ? `<p class="tw-slide-excerpt">${esc(a.excerpt)}</p>` : ''}
          <div class="tw-slide-meta">By ${esc(byline)} · ${esc(fmtDateLong(a.date))}</div>
        </div>
      </div>`;
  }).join('');

  /* pathLength="100" turns the rect's perimeter into a 0-100 scale, so
     stroke-dasharray/dashoffset are plain percentages and don't need to
     track the exact geometry. */
  thumbs.innerHTML = twCarousel.items.map((a, i) => {
    const thumb = a.thumbnail ? imgUrl(a.thumbnail, 200) : '';
    const cat = CAT_LABELS[a.cat] || a.cat;
    return `
      <button class="tw-thumb${i === 0 ? ' active' : ''}" type="button" data-index="${i}" role="tab" aria-selected="${i === 0}" aria-label="${esc(a.title)}">
        <span class="tw-thumb-img">
          ${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" decoding="async">` : `<span class="tw-thumb-fallback">${esc((cat||'?').charAt(0))}</span>`}
        </span>
        <svg class="tw-thumb-ring" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="3" y="3" width="94" height="94" rx="18" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="4"/>
          <rect class="tw-thumb-progress" x="3" y="3" width="94" height="94" rx="18" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
        </svg>
      </button>`;
  }).join('');

  if (twCarousel.items.length < 2) {
    root.querySelectorAll('.tw-carousel-arrow').forEach(b => b.style.display = 'none');
    thumbs.style.display = 'none';
  }

  root.querySelectorAll('.tw-carousel-arrow').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dir = btn.classList.contains('next') ? 1 : -1;
      twCarouselGo(twCarousel.index + dir);
    });
  });
  thumbs.querySelectorAll('.tw-thumb').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      twCarouselGo(parseInt(btn.dataset.index, 10) || 0);
    });
  });

  /* Swipe gestures for touch. passive:true so vertical page scroll still
     works; horizontal swipes with |dx| > |dy| and a minimum distance win. */
  let tStartX = 0, tStartY = 0, tStartT = 0, tTracking = false;
  root.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    tStartX = e.touches[0].clientX;
    tStartY = e.touches[0].clientY;
    tStartT = Date.now();
    tTracking = true;
  }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (!tTracking) return;
    tTracking = false;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - tStartX;
    const dy = t.clientY - tStartY;
    const dt = Date.now() - tStartT;
    if (dt > 700) return;                    // too slow — probably a scroll
    if (Math.abs(dx) < 40) return;           // too short
    if (Math.abs(dy) > Math.abs(dx)) return; // vertical — let the page scroll
    twCarouselGo(twCarousel.index + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* Autoplay runs regardless of hover. Reduced-motion only disables the
     transition animations, not the advance itself. */
  twCarouselSetActive(0, { animate: false });
  twCarouselScheduleNext();
}

function twCarouselClearTimer() {
  if (twCarousel.timer) { clearTimeout(twCarousel.timer); twCarousel.timer = null; }
  if (twCarousel.ringAnim) { try { twCarousel.ringAnim.cancel(); } catch (_) {} twCarousel.ringAnim = null; }
}

function twCarouselScheduleNext() {
  twCarouselClearTimer();
  if (twCarousel.paused || document.hidden) return;
  if (twCarousel.items.length < 2) return;
  twCarousel.timer = setTimeout(() => {
    twCarouselGo(twCarousel.index + 1);
  }, TW_CAROUSEL.duration);
}

function twCarouselGo(index) {
  const n = twCarousel.items.length;
  if (!n) return;
  const next = ((index % n) + n) % n;
  twCarouselSetActive(next, { animate: true });
  twCarouselScheduleNext();
}

function twCarouselSetActive(index, opts) {
  opts = opts || {};
  const root = document.getElementById('twCarousel');
  if (!root) return;
  twCarousel.index = index;

  root.querySelectorAll('.tw-slide').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.index, 10) === index);
  });
  root.querySelectorAll('.tw-thumb').forEach(el => {
    const isActive = parseInt(el.dataset.index, 10) === index;
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-selected', String(isActive));
  });

  const activeRing = root.querySelector('.tw-thumb.active .tw-thumb-progress');
  if (!activeRing) return;
  /* Every progress rect uses pathLength="100" so dash values are percentages.
     Cancel any in-flight animation first — fill:'forwards' pins the rect at
     its end value and would beat the inline style otherwise. */
  root.querySelectorAll('.tw-thumb-progress').forEach(r => {
    if (r.getAnimations) {
      try { r.getAnimations().forEach(a => a.cancel()); } catch (_) {}
    }
    r.style.strokeDashoffset = '100';
  });
  if (twCarousel.items.length < 2) {
    activeRing.style.strokeDashoffset = '0';
    return;
  }
  activeRing.style.strokeDashoffset = '0';
  if (typeof activeRing.animate === 'function') {
    try {
      twCarousel.ringAnim = activeRing.animate(
        [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }],
        { duration: TW_CAROUSEL.duration, easing: 'linear', fill: 'forwards' }
      );
    } catch (_) {}
  } else {
    activeRing.style.transition = 'stroke-dashoffset ' + TW_CAROUSEL.duration + 'ms linear';
    activeRing.style.strokeDashoffset = '0';
  }
}

function twCarouselStop() { twCarouselClearTimer(); }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) twCarouselClearTimer();
  else twCarouselScheduleNext();
});

async function renderHome() {
  const fpGrid = $('#frontpageGrid');
  fpGrid.innerHTML = twSkelHome();

  let published = [];
  try {
    published = await Data.listPublished();
  } catch (err) {
    twShowError(fpGrid, 'Could not load stories.', () => renderHome());
    return;
  }
  if (!published.length && !navigator.onLine) {
    twShowError(fpGrid, 'No connection.', () => renderHome());
    return;
  }
  articles = published;

  // Dynamic subcat strip for sections with SUBCAT_OPTIONS
  const subcatStrip = document.getElementById('subcatStrip');
  const subcatInner = document.getElementById('subcatStripInner');
  const subcatOpts = SUBCAT_OPTIONS[activeFilter] || [];
  if (subcatStrip && subcatInner) {
    if (subcatOpts.length) {
      if (newsSubcat === 'all' || !subcatOpts.some(o => o.id === newsSubcat)) newsSubcat = 'all';
      subcatInner.innerHTML = `<span class="subcat-label">${esc(CAT_LABELS[activeFilter] || activeFilter)}</span>` +
        `<button class="subcat-tab ${newsSubcat === 'all' ? 'active' : ''}" data-subcat="all" type="button">All</button>` +
        subcatOpts.map(o => `<button class="subcat-tab ${newsSubcat === o.id ? 'active' : ''}" data-subcat="${o.id}" type="button">${esc(o.label)}</button>`).join('');
      subcatStrip.style.display = 'block';
      subcatInner.querySelectorAll('.subcat-tab').forEach(t => {
        t.addEventListener('click', () => {
          newsSubcat = t.dataset.subcat || 'all';
          renderHome();
        });
      });
    } else {
      subcatStrip.style.display = 'none';
      newsSubcat = 'all';
    }
  }

  let list = activeFilter === 'all' ? published : published.filter(a => a.cat === activeFilter);
  if (newsSubcat !== 'all' && subcatOpts.length) {
    list = list.filter(a => (a.subcat || '') === newsSubcat);
  }
  if (searchTerm) {
    list = list.filter(a => {
      const hay = ((a.title||'')+' '+(a.excerpt||'')+' '+(a.author||'')+' '+(a.author2||'')+' '+(a.photojournalist||'')+' '+(a.photojournalist_2||'')+' '+(a.photo_courtesy||'')+' '+(a.layout_by||'')+' '+(a.layout_by_2||'')+' '+(a.graphics_by||'')+' '+(CAT_LABELS[a.cat]||'')).toLowerCase();
      return hay.includes(searchTerm);
    });
  }

  // Apply homepage sort
  if (homeSort === 'viewed') {
    list = list.slice().sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (homeSort === 'featured') {
    list = list.slice().sort((a, b) => {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if (fb !== fa) return fb - fa;
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
  }
  // else 'recent' — data already sorted by date desc from Data.listPublished()

  if (!list.length) {
    if (searchTerm) {
      fpGrid.innerHTML = `<div class="search-empty" style="grid-column:1/-1"><strong>No results for "${esc(searchTerm)}"</strong>Try a different word.</div>`;
    } else {
      fpGrid.innerHTML = `<div class="frontpage-empty" style="grid-column:1/-1"><h3>No stories yet</h3><p>Check back soon.</p></div>`;
    }
    $('#moreStories').style.display = 'none';
    $('#sectionPreviews').innerHTML = '';
    return;
  }

  /* Stories 0-4 rotate in the hero carousel; the sidebar shows the next six;
     the grid shows the rest. */
  const carouselItems = list.slice(0, 5);
  const sidebar = list.slice(5, 11); // This gives exactly 6 items
  const gridArticles = list.slice(11); 

  const sidebarHtml = sidebar.map(a => `
    <div class="sidebar-item" data-article-id="${esc(a.id)}">
      <div class="sidebar-item-thumb">
        ${a.thumbnail ? imgTag(a.thumbnail, [240], '', ' alt="" loading="lazy" decoding="async"') : esc((CAT_LABELS[a.cat]||'?').charAt(0))}
      </div>
      <div class="sidebar-item-content">
        <span class="sidebar-item-cat">${esc(CAT_LABELS[a.cat]||a.cat)}</span>
        <a class="sidebar-item-title" data-story-link href="${esc(storyUrl(a))}">${esc(a.title)}</a>
        <div class="sidebar-item-meta">${esc(a.author||'Staff')} · ${esc(fmtDate(a.date))}${a.views ? ' · ' + esc(fmtViews(a.views)) : ''}</div>
      </div>
    </div>
  `).join('');

  fpGrid.innerHTML = `
    <div class="tw-carousel" id="twCarousel" role="region" aria-roledescription="carousel" aria-label="Featured stories">
      <div class="tw-carousel-track"></div>
      <button class="tw-carousel-arrow prev" type="button" aria-label="Previous story">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <button class="tw-carousel-arrow next" type="button" aria-label="Next story">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
      <div class="tw-carousel-thumbs" role="tablist" aria-label="Choose story"></div>
    </div>
    <aside>
      <div class="sidebar-section-title">Latest <span>· ${published.length} total</span></div>
      <div class="sidebar-list">${sidebarHtml || '<p style="color:var(--ink-3);font-family:var(--sans);font-size:.85rem">No other stories yet.</p>'}</div>
    </aside>
  `;
  twBuildCarousel(carouselItems);

  fpGrid.querySelectorAll('[data-article-id]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('a[data-story-link]')) e.preventDefault();
      if (e.target.closest('.tw-save-btn')) return;
      openArticle(el.dataset.articleId);
    });
  });
  twWireSaveButtons(fpGrid);
  twWirePrefetch(fpGrid);

  const moreSection = $('#moreStories');
  const grid = $('#articleGrid');
  if (gridArticles.length) {
    moreSection.style.display = 'block';
    grid.innerHTML = '';
    gridArticles.forEach(a => {
      const el = document.createElement('article');
      el.className = 'article';
      el.innerHTML = buildArticleCard(a);
      el.addEventListener('click', e => {
        if (e.target.closest('a[data-story-link]')) e.preventDefault();
        if (e.target.closest('.tw-save-btn')) return;
        openArticle(a.id);
      });
      grid.appendChild(el);
    });
    twWireSaveButtons(grid);
    twWirePrefetch(grid);
  } else {
    moreSection.style.display = 'none';
  }

  const previewContainer = $('#sectionPreviews');
  previewContainer.innerHTML = '';
  if (activeFilter === 'all' && !searchTerm && homeSort === 'recent' && published.length > 3) {
    SECTION_ORDER.forEach(cat => {
      const items = published.filter(a => a.cat === cat).slice(0, 4);
      if (!items.length) return;
      const section = document.createElement('section');
      section.className = 'section-preview';
      section.innerHTML = `
        <div class="wrap">
          <div class="section-preview-head">
            <h2><span class="cat-dot"></span>${esc(CAT_LABELS[cat])}</h2>
            <button class="see-all" data-jump="${esc(cat)}">See all ${esc(CAT_LABELS[cat])} →</button>
          </div>
          <div class="preview-grid"></div>
        </div>
      `;
      const pGrid = section.querySelector('.preview-grid');
      items.forEach(a => {
        const el = document.createElement('article');
        el.className = 'article';
        el.innerHTML = buildArticleCard(a);
        el.addEventListener('click', e => {
          if (e.target.closest('a[data-story-link]')) e.preventDefault();
          if (e.target.closest('.tw-save-btn')) return;
          openArticle(a.id);
        });
        pGrid.appendChild(el);
      });
      twWireSaveButtons(section);
      twWirePrefetch(section);
      previewContainer.appendChild(section);
    });
    previewContainer.querySelectorAll('.see-all').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.jump;
        const tab = document.querySelector(`.section-tab[data-filter="${cat}"]`);
        if (tab) { tab.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      });
    });
  }
}

const PROVIDERS = {
  heyzine: {
    label: 'Heyzine',
    fieldLabel: 'Heyzine flipbook URL',
    placeholder: 'https://heyzine.com/flip-book/XXXXXXXXXX.html',
    hint: 'Paste the share link from your Heyzine flip-book — e.g. <code>https://heyzine.com/flip-book/abc123.html</code>'
  },
  issuu: {
    label: 'Issuu',
    fieldLabel: 'Issuu publication URL',
    placeholder: 'https://issuu.com/username/docs/publication-name',
    hint: 'Paste the Issuu publication link — it is converted to an embed automatically — e.g. <code>https://issuu.com/myuser/docs/my-zine</code>'
  }
};

function detectProvider(url) {
  const u = String(url || '').trim();
  if (!u) return null;
  if (/issuu\.com/i.test(u)) return 'issuu';
  if (/heyzine\.com/i.test(u)) return 'heyzine';
  return null;
}

function issuuEmbedUrl(url) {
  const u = String(url || '').trim();
  if (!u) return u;
  if (/e\.issuu\.com\/embed/i.test(u)) return u;
  const m = u.match(/issuu\.com\/([^\/]+)\/docs\/([^\/\?#]+)/i);
  if (!m) return u;
  return 'https://e.issuu.com/embed.html?d=' + encodeURIComponent(m[2]) + '&u=' + encodeURIComponent(m[1]);
}

function flipbookEmbedUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  return detectProvider(u) === 'issuu' ? issuuEmbedUrl(u) : u;
}

function setReleaseProvider(provider, opts) {
  opts = opts || {};
  releaseProvider = PROVIDERS[provider] ? provider : 'heyzine';
  $$('#releaseProviderToggle .provider-opt').forEach(btn => {
    const on = btn.dataset.provider === releaseProvider;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  const cfg = PROVIDERS[releaseProvider];
  const label = $('#releaseUrlLabel');
  if (label) label.innerHTML = esc(cfg.fieldLabel) + ' <span class="hint">*</span>';
  const input = $('#releaseFlipUrl');
  if (input) {
    input.placeholder = cfg.placeholder;
    if (!opts.keepValue) input.value = '';
  }
  const hint = $('#releaseUrlHint');
  if (hint) hint.innerHTML = cfg.hint;
}

async function renderReleasesPreview() {
  const grid = $('#releasesPreviewGrid');
  if (!grid) return;
  releases = await Data.listPublishedReleases();
  const list = releases.slice(0, 4);
  const section = $('#releasesPreview');
  if (!list.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  grid.innerHTML = list.map(releaseCardHtml).join('');
  wireReleaseCards(grid);
}

function releaseCardHtml(issue) {
  const cover = issue.cover_url || '';
  const coverHtml = cover
    ? imgTag(cover, [280, 560], '(max-width: 480px) 100vw, (max-width: 900px) 50vw, 280px', ' alt="" loading="lazy" decoding="async"')
    : `<div class="release-cover-text">${esc((issue.title||'?').charAt(0))}</div>`;
  const prov = detectProvider(issue.heyzine_url);
  const catLabel = RELEASE_CAT_LABELS[issue.category] || 'Magazine';
  return `
    <div class="release-card" data-release-id="${esc(issue.id)}" data-release-cat="${esc(issue.category||'magazine')}" role="button" tabindex="0">
      <div class="release-cover">
        ${coverHtml}
        <span class="release-cat-badge">${esc(catLabel)}</span>
      </div>
      <div class="release-info">
        <h3>${esc(issue.title)}</h3>
        <div class="release-meta">${esc(issue.volume || '')}${issue.volume && issue.issue_date ? ' · ' : ''}${esc(fmtDate(issue.issue_date))}</div>
        ${prov ? `<div style="margin-top:6px"><span class="platform-tag">${esc(PROVIDERS[prov].label)}</span></div>` : ''}
        <div class="release-open-hint">Open reader →</div>
      </div>
    </div>
  `;
}

function wireReleaseCards(container) {
  container.querySelectorAll('[data-release-id]').forEach(el => {
    el.addEventListener('click', () => openReader(el.dataset.releaseId));
  });
  twWirePrefetch(container);
}

async function renderReleasesPage() {
  const grid = $('#releasesGrid');
  grid.innerHTML = twSkelGrid(8);
  try {
    releases = await Data.listPublishedReleases();
  } catch (err) {
    twShowError(grid, 'Could not load archives.', () => renderReleasesPage());
    return;
  }
  if (!releases.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--ink-3)"><h3 style="font-family:var(--serif);color:var(--ink-2);font-weight:500">No archives yet</h3><p style="font-family:var(--sans);font-size:.85rem">Issues will appear here as they are uploaded.</p></div>';
    return;
  }
  const filtered = archiveFilter === 'all' ? releases : releases.filter(r => (r.category||'magazine') === archiveFilter);
  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--ink-3)"><h3 style="font-family:var(--serif);color:var(--ink-2);font-weight:500">No ${esc(RELEASE_CAT_LABELS[archiveFilter]||archiveFilter)} issues yet</h3></div>`;
    return;
  }
  grid.innerHTML = filtered.map(releaseCardHtml).join('');
  wireReleaseCards(grid);
}

async function renderVideosPage() {
  const grid = $('#videoGrid');
  if (!grid) return;
  grid.innerHTML = twSkelGrid(6);
  let list = [];
  try {
    list = await Data.listVideos();
  } catch (err) {
    twShowError(grid, 'Could not load videos.', () => renderVideosPage());
    return;
  }
  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--ink-3)"><h3 style="font-family:var(--serif);color:var(--ink-2);font-weight:500">No videos yet</h3><p style="font-family:var(--sans);font-size:.85rem">Broadcast segments and reels will appear here.</p></div>';
    return;
  }
  // filter by chosen sub-category (videoCatFilter), defaulting stored subcategory to 'tvb'
  const filtered = list.filter(v => {
    const sub = (v.subcategory || 'tvb');
    return videoCatFilter === 'all' || sub === videoCatFilter;
  });

  const SUBCAT_LABELS = { tvb:'News Broadcast', mojo:'MoJo', reels:'Reels', animations:'Animations' };
  grid.innerHTML = filtered.map(v => {
    const thumb = v.thumbnail_url || youtubeThumb(v);
    const credits = [];
    const j = (arr) => arr.filter(Boolean).join(', ');
    const vj = j([v.videojournalist, v.videojournalist_2, v.videojournalist_3]);
    const bc = j([v.broadcasters, v.broadcaster_2]);
    const ct = j([v.video_courtesy, v.video_courtesy_2]);
    const dr = j([v.director, v.director_2]);
    const wr = j([v.writer, v.writer_2, v.writer_3]);
    const an = j([v.animator, v.animator_2]);
    if (vj) credits.push('VJ: ' + esc(vj));
    if (bc) credits.push('Broadcaster: ' + esc(bc));
    if (dr) credits.push('Director: ' + esc(dr));
    if (wr) credits.push('Writer: ' + esc(wr));
    if (an) credits.push('Animator: ' + esc(an));
    if (v.editor) credits.push('Editor: ' + esc(v.editor));
    if (v.technicians) credits.push('Technical: ' + esc(v.technicians));
    if (ct) credits.push('Courtesy: ' + esc(ct));
    const isPortrait = (v.orientation || 'landscape') === 'portrait';
    const subLabel = SUBCAT_LABELS[v.subcategory || 'tvb'] || 'TVB';
    return `
      <div class="video-card${isPortrait ? ' portrait' : ''}" data-video-id="${esc(v.id)}" role="button" tabindex="0">
        <div class="video-thumb">
          ${thumb ? imgTag(thumb, [320, 640], SIZES.video, ' alt="" loading="lazy" decoding="async"') : ''}
          <span class="video-cat-badge">${esc(subLabel)}</span>
          <div class="video-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
        <div class="video-body">
          <h3>${esc(v.title)}</h3>
          ${credits.length ? `<div class="video-credits">${credits.join(' · ')}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-video-id]').forEach(el => {
    el.addEventListener('click', () => openVideo(el.dataset.videoId, filtered));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideo(el.dataset.videoId, filtered); } });
  });
  window.__videosCache = filtered;
  twWirePrefetch(grid);
}

async function renderMemoriamPage() {
  const list = $('#memoriamList');
  if (!list) return;
  const items = await Data.listMemoriam();
  if (!items.length) {
    list.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--ink-3)"><h3 style="font-family:var(--serif);color:var(--ink-2);font-weight:500">No terms yet</h3><p style="font-family:var(--sans);font-size:.85rem">Past editorial boards will appear here.</p></div>';
    return;
  }
  list.innerHTML = items.map(m => `
    <div class="memoriam-item" data-memoriam-id="${esc(m.id)}" role="button" tabindex="0">
      <div class="memoriam-photo">
        ${m.photo_url ? imgTag(m.photo_url, [400], '(max-width: 420px) 100vw, (max-width: 720px) 50vw, 260px', ' alt="" loading="lazy" decoding="async"') : `<div class="memoriam-fallback">${esc((m.school_year||'?').slice(0,4))}</div>`}
      </div>
      <div class="memoriam-body">
        <div class="memoriam-year">${esc(m.school_year||'')}</div>
        ${m.term_label ? `<div class="memoriam-term">${esc(m.term_label)}</div>` : ''}
      </div>
    </div>
  `).join('');
  list.querySelectorAll('[data-memoriam-id]').forEach(el => {
    el.addEventListener('click', () => openMemoriam(el.dataset.memoriamId, items));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMemoriam(el.dataset.memoriamId, items); }
    });
  });
}

function openMemoriam(id, list) {
  const m = list.find(x => x.id === id);
  if (!m) return;
  lastFocused = document.activeElement;
  const photo = document.getElementById('memoriamModalPhoto');
  photo.innerHTML = m.photo_url
    ? imgTag(m.photo_url, [480, 960], '(max-width: 780px) 100vw, 520px', ' alt="" loading="lazy" decoding="async"')
    : `<div class="memoriam-fallback">${esc((m.school_year||'?').slice(0,4))}</div>`;
  document.getElementById('memoriamModalYear').textContent = m.school_year || '';
  document.getElementById('memoriamModalTerm').textContent = m.term_label || '';
  const cap = document.getElementById('memoriamModalCaption');
  if (m.caption) { cap.textContent = m.caption; cap.style.display = 'block'; }
  else { cap.textContent = ''; cap.style.display = 'none'; }
  document.getElementById('memoriamOverlay').classList.add('open');
  lockScroll();
}
function closeMemoriam() {
  document.getElementById('memoriamOverlay').classList.remove('open');
  unlockScroll();
  if (lastFocused) lastFocused.focus();
}

function openReader(releaseId) {
  const issue = releases.find(i => i.id === releaseId);
  if (!issue) return;
  if (window.umami) window.umami.track('Release Opened', { title: issue.title || '' });
  const embed = flipbookEmbedUrl(issue.heyzine_url);
  if (!embed) { toast('No flipbook for this release yet', true); return; }
  lastFocused = document.activeElement;
  $('#readerTitle').textContent = issue.title || 'Release';
  $('#readerSub').textContent = (issue.volume ? issue.volume + ' · ' : '') + fmtDate(issue.issue_date);
  const ext = $('#readerExtLink');
  ext.classList.remove('show');
  ext.href = '#';
  const stage = $('#readerStage');
  stage.innerHTML = '<div class="reader-loading"><div class="spinner"></div>Loading flipbook…</div>';
  $('#readerOverlay').classList.add('open');
  lockScroll();
  const iframe = document.createElement('iframe');
  iframe.src = embed;
  iframe.setAttribute('allowfullscreen', 'allowfullscreen');
  iframe.setAttribute('allow', 'autoplay; fullscreen; clipboard-write');
  iframe.className = 'fp-iframe';
  iframe.addEventListener('load', () => {
    const loader = stage.querySelector('.reader-loading');
    if (loader) loader.remove();
  });
  stage.appendChild(iframe);
}

function closeReader() {
  $('#readerOverlay').classList.remove('open');
  unlockScroll();
  $('#readerStage').innerHTML = '';
  if (lastFocused) lastFocused.focus();
}
$('#readerClose').addEventListener('click', closeReader);

function extractYouTubeId(url) {
  if (!url) return '';
  const u = String(url).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/live\/([A-Za-z0-9_-]{11})/,
    /\/v\/([A-Za-z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) return m[1];
  }
  return '';
}

function youtubeThumb(v) {
  if (!v || !v.video_url) return '';
  const id = extractYouTubeId(v.video_url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

function isFacebookUrl(u) {
  return /facebook\.com|fb\.watch/i.test(String(u || ''));
}

function toEmbedUrl(url, platform) {
  const u = String(url || '').trim();
  if (!u) return '';
  platform = platform || (/youtu/i.test(u) ? 'youtube' : (/facebook|fb\.watch/i.test(u) ? 'facebook' : 'vimeo'));
  if (platform === 'youtube') {
    const id = extractYouTubeId(u);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` : u;
  }
  if (platform === 'vimeo') {
    const m = u.match(/vimeo\.com\/(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : u;
  }
  return u;
}

function openVideo(id, list) {
  const v = list.find(x => x.id === id);
  if (!v) return;
  if (window.umami) window.umami.track('Video Opened', { title: v.title || '', platform: v.platform || '' });
  lastFocused = document.activeElement;
  $('#readerTitle').textContent = v.title || 'Video';
  $('#readerSub').textContent = v.published ? fmtDate(v.published) : '';

  const stage = $('#readerStage');
  const ext = $('#readerExtLink');

  if (isFacebookUrl(v.video_url)) {
    const thumb = v.thumbnail_url || '';
    stage.innerHTML = `
      <div class="fb-fallback-wrap">
        <div class="fb-fallback-inner">
          ${thumb ? imgTag(thumb, [400], '(max-width: 640px) 90vw, 400px', ' class="fb-fallback-img" alt="" decoding="async"') : ''}
          <div class="fb-fallback-label">Facebook video</div>
          <h3 class="fb-fallback-title">${esc(v.title||'')}</h3>
          ${v.description ? `<p class="fb-fallback-desc">${esc(v.description)}</p>` : ''}
          <a href="${esc(v.video_url)}" target="_blank" rel="noopener" class="btn btn-primary fb-fallback-btn">
            Watch on Facebook
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M7 17 17 7M9 7h8v8"/></svg>
          </a>
          <div class="fb-fallback-note">Facebook doesn't allow embedding this video. It will open in a new tab.</div>
        </div>
      </div>`;
    ext.classList.remove('show');
    $('#readerOverlay').classList.add('open');
    lockScroll();
    return;
  }

  const embed = toEmbedUrl(v.video_url, v.platform);
  if (!embed) { toast('Cannot embed this video', true); return; }
  if (v.video_url) { ext.href = v.video_url; ext.classList.add('show'); }
  else { ext.classList.remove('show'); ext.href = '#'; }
  stage.innerHTML = '<div class="reader-loading"><div class="spinner"></div>Loading video…</div>';
  $('#readerOverlay').classList.add('open');
  lockScroll();
  const iframe = document.createElement('iframe');
  iframe.src = embed;
  iframe.setAttribute('allowfullscreen','allowfullscreen');
  iframe.setAttribute('allow','autoplay; fullscreen; picture-in-picture');
  iframe.className = 'fp-iframe';
  iframe.addEventListener('load', () => { const l = stage.querySelector('.reader-loading'); if (l) l.remove(); });
  stage.appendChild(iframe);
}

function renderBoard() {
  const grid = $('#boardGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const totalEl = document.getElementById('boardTotalCount');
  if (totalEl) totalEl.textContent = String(boardMembers.length);

  const seenDepts = new Set();
  boardMembers.forEach(p => {
    const dept = p.group;
    if (seenDepts.has(dept)) return;
    seenDepts.add(dept);

    const deptMembers = boardMembers.filter(x => x.group === dept);

    const deptHead = document.createElement('div');
    const isFirst = seenDepts.size === 1;
    deptHead.style.cssText = `grid-column:1/-1;margin:${isFirst?'0':'28px'} 0 6px;padding-top:${isFirst?'0':'22px'};${isFirst?'':'border-top:1px solid var(--line)'}`;
    deptHead.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><h3 style="font-family:var(--serif);font-size:1.4rem;font-weight:900;margin:0;letter-spacing:-.02em;color:var(--ink)">${esc(dept)}</h3><span style="font-family:var(--sans);font-size:.7rem;font-weight:750;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-4)">${deptMembers.length} ${deptMembers.length === 1 ? 'member' : 'members'}</span></div>`;
    grid.appendChild(deptHead);

    const seenSubs = new Set();
    deptMembers.forEach(m => {
      const sg = m.subgroup || null;
      if (seenSubs.has(sg)) return;
      seenSubs.add(sg);

      const members = deptMembers.filter(x => (x.subgroup || null) === sg);

      if (sg) {
        const sgHead = document.createElement('div');
        sgHead.style.cssText = 'grid-column:1/-1;margin:12px 0 2px';
        sgHead.innerHTML = `<span style="font-family:var(--sans);font-size:.66rem;font-weight:750;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)">${esc(sg)}</span>`;
        grid.appendChild(sgHead);
      }

      members.forEach(m => {
        const el = document.createElement('div');
        el.className = 'board-card';
        el.setAttribute('tabindex','0');
        el.setAttribute('role','button');
        const photo = boardPhotos[m.name];
        const avatarHtml = photo ? imgTag(photo, [160], '', ' alt="" loading="lazy" decoding="async"') : esc(m.initials);
        const credit = boardCreditFor(m);
        // A small marker on the card too, so the credit is discoverable without
        // having to open the profile first.
        const creditMark = credit
          ? `<span class="board-credit-mark" title="${esc(credit.label)}" aria-label="${esc(credit.label)}">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 6-6 6 6 6"/><path d="m16 6 6 6-6 6"/></svg>
             </span>`
          : '';
        el.innerHTML = `<div class="board-avatar">${avatarHtml}</div><h3>${esc(m.name)}${creditMark}</h3><div class="board-role">${esc(m.role)}</div><div class="board-program" style="font-family:var(--sans);font-size:.68rem;color:var(--ink-4);margin-top:6px;line-height:1.35">${esc(m.program||'')}</div>`;
        el.addEventListener('click', () => openBoardProfile(m.name));
        grid.appendChild(el);
      });
    });
  });
}

function renderBoardAdmin() {
  const grid = $('#boardAdminGrid');
  if (!grid) return;
  // (Board data is static, no loading needed — just render immediately)
  grid.innerHTML = boardMembers.map(p => {
    const photo = boardPhotos[p.name];
    const avatarHtml = photo ? imgTag(photo, [160], '', ' alt="" loading="lazy" decoding="async"') : esc(p.initials);
    return `
      <div class="board-admin-card">
        <div class="board-admin-photo">${avatarHtml}</div>
        <h4>${esc(p.name)}</h4>
        <small>${esc(p.role)}</small>
        ${p.program && p.program !== '—' ? `<small style="opacity:.75">${esc(p.program)}</small>` : ''}
        <div class="board-admin-actions">
          <button class="btn btn-ghost btn-sm" data-upload-board="${esc(p.name)}">${photo ? 'Change' : 'Upload'}</button>
          ${photo ? `<button class="btn btn-ghost btn-sm" data-remove-board="${esc(p.name)}">Remove</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function populateBoardNames() {
  const dl = document.getElementById('boardNames');
  if (!dl) return;
  dl.innerHTML = boardMembers.map(p => `<option value="${esc(p.name)}">${esc(p.role)}</option>`).join('');
}

async function openBoardProfile(name) {
  const member = boardMembers.find(m => m.name === name);
  if (!member) return;
  lastFocused = document.activeElement;
  const published = await Data.listPublished();
  published.sort((a, b) => {
    const fa = a.featured ? 1 : 0;
    const fb = b.featured ? 1 : 0;
    return fb - fa;
  });
  articles = published;

  const byAuthor = published.filter(a => a.author === name || a.author2 === name);
  const byPhoto = published.filter(a => a.photojournalist === name || a.photojournalist_2 === name);
  const byLayout = published.filter(a => a.layout_by === name || a.layout_by_2 === name);
  const byGraphics = published.filter(a => a.graphics_by === name);

  let allVideos = [];
  try { allVideos = await Data.listVideos(); } catch (e) { allVideos = []; }
  const nameLower = name.toLowerCase();
  const matchField = (val) => {
    if (!val) return false;
    return String(val).toLowerCase().split(',').map(s => s.trim()).includes(nameLower);
  };
  const hasAny = (v, keys) => keys.some(k => matchField(v[k]));
  const videoBroadcast = allVideos.filter(v => hasAny(v, ['broadcasters', 'broadcaster_2']));
  const videoTech      = allVideos.filter(v => matchField(v.technicians));
  const videoVJ        = allVideos.filter(v => hasAny(v, ['videojournalist', 'videojournalist_2', 'videojournalist_3']));
  const videoDirector  = allVideos.filter(v => hasAny(v, ['director', 'director_2']));
  const videoWriter    = allVideos.filter(v => hasAny(v, ['writer', 'writer_2', 'writer_3']));
  const videoAnimator  = allVideos.filter(v => hasAny(v, ['animator', 'animator_2']));
  const videoEditor    = allVideos.filter(v => matchField(v.editor));

  const photo = boardPhotos[name];
  $('#bpAvatar').innerHTML = photo ? imgTag(photo, [200], '', ' alt="" decoding="async"') : esc(member.initials);
  $('#bpName').textContent = member.name;
  $('#bpRole').textContent = member.role;
  if (member.program && member.program !== '—') {
    $('#bpGroup').textContent = member.group + ' · ' + member.program;
  } else {
    $('#bpGroup').textContent = member.group;
  }

  /* Credit badge, shown only for members listed in BOARD_CREDITS. Cleared here
     rather than on close so switching straight from a credited profile to an
     uncredited one cannot leave a stale badge behind. */
  const credit = boardCreditFor(member);
  const creditEl = $('#bpCredit');
  if (creditEl) {
    creditEl.innerHTML = credit
      ? `<span class="bp-credit-badge" title="${esc(credit.label)}">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 6-6 6 6 6"/><path d="m16 6 6 6-6 6"/></svg>
           <span>${esc(credit.label)}</span>
         </span>`
      : '';
  }

  const sections = [];
  if (byAuthor.length) sections.push({ label: 'As Author', items: byAuthor });
  if (byPhoto.length) sections.push({ label: 'As Photojournalist', items: byPhoto });
  if (byGraphics.length) sections.push({ label: 'As Graphics Artist', items: byGraphics });
  if (byLayout.length) sections.push({ label: 'As Layout Artist', items: byLayout });
  if (videoBroadcast.length) sections.push({ label: 'As Broadcaster', items: videoBroadcast, isVideo: true });
  if (videoVJ.length)        sections.push({ label: 'As Video Journalist', items: videoVJ, isVideo: true });
  if (videoDirector.length)  sections.push({ label: 'As Director', items: videoDirector, isVideo: true });
  if (videoWriter.length)    sections.push({ label: 'As Writer', items: videoWriter, isVideo: true });
  if (videoAnimator.length)  sections.push({ label: 'As Animator', items: videoAnimator, isVideo: true });
  if (videoEditor.length)    sections.push({ label: 'As Editor', items: videoEditor, isVideo: true });
  if (videoTech.length)      sections.push({ label: 'As Technical', items: videoTech, isVideo: true });

  if (!sections.length) {
    $('#bpBody').innerHTML = `<div class="bp-empty">No published works yet.</div>`;
  } else {
    $('#bpBody').innerHTML = sections.map(sec => `
      <div class="bp-section">
        <div class="bp-section-title">${esc(sec.label)} <span class="bp-section-count">· ${sec.items.length}</span></div>
        ${sec.items.map(a => {
          const isVideo = sec.isVideo;
          const thumbSrc = isVideo ? (a.thumbnail_url || youtubeThumb(a)) : a.thumbnail;
          const thumbHtml = thumbSrc ? imgTag(thumbSrc, [480, 960], SIZES.modal, ' alt="" decoding="async"') : esc(((isVideo ? a.title : (CAT_LABELS[a.cat]||'?'))||'?').charAt(0));
          const metaText = isVideo
            ? 'Video · ' + esc(fmtDate(a.published || a.updated))
            : esc(CAT_LABELS[a.cat]||a.cat) + ' · ' + esc(fmtDate(a.date));
          return `
            <div class="bp-article" ${isVideo ? `data-video-id="${esc(a.id)}"` : `data-article-id="${esc(a.id)}"`}>
              <div class="bp-article-thumb">${thumbHtml}</div>
              <div class="bp-article-info">
                <div class="bp-article-title">${esc(a.title)}</div>
                <div class="bp-article-meta">${metaText}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');
    $$('#bpBody [data-article-id]').forEach(el => {
      el.addEventListener('click', () => { closeBoardProfile(); openArticle(el.dataset.articleId); });
    });
    $$('#bpBody [data-video-id]').forEach(el => {
      el.addEventListener('click', () => {
        closeBoardProfile();
        const v = allVideos.find(x => String(x.id) === String(el.dataset.videoId));
        if (v) openVideo(v.id, allVideos);
      });
    });
  }

  $('#boardProfileOverlay').classList.add('open');
  boardProfileOpen = true;
  lockScroll();
}

function closeBoardProfile() {
  $('#boardProfileOverlay').classList.remove('open');
  boardProfileOpen = false;
  unlockScroll();
  if (lastFocused) lastFocused.focus();
}
$('#boardProfileClose').addEventListener('click', closeBoardProfile);
$('#boardProfileOverlay').addEventListener('click', e => { if (e.target === $('#boardProfileOverlay')) closeBoardProfile(); });
$('#memoriamClose').addEventListener('click', closeMemoriam);
$('#memoriamOverlay').addEventListener('click', e => { if (e.target === $('#memoriamOverlay')) closeMemoriam(); });

function twGetShareUrl(a) {
  /* Derived from the current origin rather than a hardcoded workers.dev host, so
     shared links keep working on a custom domain (and in local testing). The
     path form matters: crawlers ignore #fragments, so a hash route would always
     preview the generic homepage card. */
  return location.origin + storyUrl(a);
}
function twRenderRelated(a) {
  const el = document.getElementById('modalRelated');
  if (!el) return;
  const pool = Array.isArray(articles) && articles.length > 1 ? articles : [];
  const related = pool
    .filter(x => x && x.id !== a.id && x.cat === a.cat && x.status === 'published' && !x.deleted_at)
    .sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0))
    .slice(0, 3);
  if (!related.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = `
    <div class="related-label">More from ${esc(CAT_LABELS[a.cat] || a.cat || 'The Work')}</div>
    <div class="related-list">
      ${related.map(r => `
        <div class="related-item" data-related-id="${esc(r.id)}" role="button" tabindex="0">
          <div class="related-thumb">${r.thumbnail ? imgTag(r.thumbnail, [160], '', ' alt="" loading="lazy" decoding="async"') : esc((CAT_LABELS[r.cat]||'?').charAt(0))}</div>
          <div class="related-info">
            <div class="related-title">${esc(r.title)}</div>
            <div class="related-meta">${esc(r.author || 'Staff')} · ${esc(fmtDate(r.date))}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  el.querySelectorAll('[data-related-id]').forEach(item => {
    item.addEventListener('click', () => openArticle(item.dataset.relatedId));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArticle(item.dataset.relatedId); }
    });
  });
}
function twRenderShare(a) {
  const el = document.getElementById('modalShare');
  if (!el) return;
  const url = twGetShareUrl(a);
  const enc = encodeURIComponent(url);
  const encTitle = encodeURIComponent(a.title || 'The Work');
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  const hasNativeShare = typeof navigator.share === 'function';

  el.innerHTML = `
    <div class="modal-share-label">Share this story</div>
    <div class="modal-share-buttons">
      ${hasNativeShare ? `
        <button class="share-btn" data-share="native" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>
          <span>Share</span>
        </button>
      ` : ''}
      <button class="share-btn" data-share="messenger" type="button">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm1 12.4l-2.6-2.7-5 2.7L8.2 11l2.6 2.7 4.9-2.7-2.7 3.4z"/></svg>
        <span>Messenger</span>
      </button>
      <button class="share-btn" data-share="facebook" type="button">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>
        <span>Facebook</span>
      </button>
      <button class="share-btn" data-share="x" type="button">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        <span>X</span>
      </button>
      <button class="share-btn" data-share="copy" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy link</span>
      </button>
    </div>
  `;

  el.querySelectorAll('[data-share]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.share;
      if (type === 'copy') {
        try {
          await navigator.clipboard.writeText(url);
          toast('Link copied');
        } catch (e) {
          const ta = document.createElement('textarea');
          ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); toast('Link copied'); }
          catch (err) { toast('Could not copy link', true); }
          document.body.removeChild(ta);
        }
        return;
      }
      if (type === 'native') {
        try {
          await navigator.share({ title: a.title || 'The Work', text: a.excerpt || '', url: url });
        } catch (e) { /* user cancelled */ }
        return;
      }
      if (type === 'messenger') {
        if (isMobile) { window.location.href = 'fb-messenger://share?link=' + enc; }
        else { window.open('https://www.facebook.com/dialog/send?link=' + enc + '&redirect_uri=' + enc, '_blank', 'noopener,noreferrer,width=600,height=500'); }
        return;
      }
      if (type === 'facebook') {
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + enc, '_blank', 'noopener,noreferrer,width=600,height=500');
        return;
      }
      if (type === 'x') {
        window.open('https://twitter.com/intent/tweet?url=' + enc + '&text=' + encTitle, '_blank', 'noopener,noreferrer,width=600,height=500');
        return;
      }
    });
  });
}

/* ---------- Image lightbox ----------
   Opened by clicking a story hero or an article-modal hero. The story hero
   caps at 70vh and the modal hero caps at 60vh, so this is where the reader
   can actually see a full-size infographic. */
let twLightboxOpen = false;
let twLightboxReturnFocus = null;

function twOpenLightbox(src, alt) {
  if (!src) return;
  const overlay = document.getElementById('twLightbox');
  const img = document.getElementById('twLightboxImg');
  if (!overlay || !img) return;
  twLightboxReturnFocus = document.activeElement;
  img.src = src;
  img.alt = alt || '';
  overlay.classList.add('open');
  twLightboxOpen = true;
  lockScroll();
  const closeBtn = document.getElementById('twLightboxClose');
  if (closeBtn) closeBtn.focus();
}

function twCloseLightbox() {
  const overlay = document.getElementById('twLightbox');
  if (!overlay || !twLightboxOpen) return;
  overlay.classList.remove('open');
  const img = document.getElementById('twLightboxImg');
  if (img) { img.removeAttribute('src'); img.alt = ''; }
  twLightboxOpen = false;
  unlockScroll();
  if (twLightboxReturnFocus && typeof twLightboxReturnFocus.focus === 'function') {
    try { twLightboxReturnFocus.focus(); } catch (_) {}
  }
  twLightboxReturnFocus = null;
}

document.addEventListener('click', (e) => {
  if (!twLightboxOpen) return;
  if (e.target === document.getElementById('twLightbox')) {
    twCloseLightbox();
    return;
  }
});
document.getElementById('twLightboxClose')?.addEventListener('click', twCloseLightbox);

/* Delegated listener so the images injected by renderStoryPage() and by the
   article modal both pick this up without re-wiring on every render. */
document.addEventListener('click', (e) => {
  const heroImg = e.target.closest('.story-hero img, .modal-hero img');
  if (heroImg) {
    const src = heroImg.currentSrc || heroImg.getAttribute('src');
    twOpenLightbox(src, heroImg.getAttribute('alt') || '');
    return;
  }
  /* Clicking the padding around a contained image also opens it. */
  const heroBox = e.target.closest('.story-hero, .modal-hero');
  if (heroBox && !e.target.closest('a, button')) {
    const inner = heroBox.querySelector('img');
    if (inner) {
      const src = inner.currentSrc || inner.getAttribute('src');
      twOpenLightbox(src, inner.getAttribute('alt') || '');
    }
  }
});


let articleOpenToken = 0;
async function openArticle(id) {
  /* The body fetch below is awaited while the modal is already opening. Click
     card A then card B quickly and A's body can land inside B's modal. Each
     open takes a token; if a newer open has started, bail before writing. */
  const myToken = ++articleOpenToken;
  const a = articles.find(x => x.id === id);
  if (!a) return;
  // Reading a story is the strongest signal that this is worth installing.
  window.dispatchEvent(new CustomEvent('tw:article-open'));
  if (window.umami) window.umami.track('Article Read', { title: a.title || '', cat: a.cat || '' });

  // Fetch body on demand if not already loaded (list query no longer includes it)
  if (!a.body && sb) {
    try { a.body = await Data.fetchBody(a.id); } catch (e) { a.body = ''; }
    if (myToken !== articleOpenToken) return;
  }

  // Fire-and-forget view counter, deduped per browser for 6 hours
  if (sb && a.status === 'published') {
    try {
      const key = 'tw_viewed_' + a.id;
      const last = parseInt(localStorage.getItem(key) || '0', 10);
      const now = Date.now();
      if (now - last > 6 * 60 * 60 * 1000) {
        sb.rpc('increment_article_views', { article_id: a.id })
          .then(() => { try { localStorage.setItem(key, String(now)); } catch(e) {} })
          .catch(() => {});
      }
    } catch(e) {}
  }

  lastFocused = document.activeElement;
  articleModalSeo = a.status === 'published' && !location.hash.startsWith('#/admin');
  if (articleModalSeo) {
    articleReturnUrl = location.pathname + location.search + location.hash;
    if (location.pathname !== storyUrl(a)) history.pushState({ twStoryId: a.id }, '', storyUrl(a));
    updateArticleMeta(a);
  }
  $('#modalCat').textContent = CAT_LABELS[a.cat] || a.cat;
  $('#modalTitle').textContent = a.title;
  $('#modalTitle').dataset.articleId = String(a.id);
  document.querySelector('[data-current-story-id]')?.setAttribute('data-current-story-id', String(a.id));
  const excerptEl = document.getElementById('modalExcerpt');
  if (excerptEl) {
    const exc = String(a.excerpt || '').trim();
    const bodyLower = String(a.body || '').replace(/\s+/g, ' ').toLowerCase();
    const excLower = exc.replace(/\s+/g, ' ').toLowerCase();
    // Hide excerpt if its opening ~80 chars already appear in the body's first 250 chars
    const isDup = excLower && bodyLower && bodyLower.slice(0, 250).indexOf(excLower.slice(0, 80)) !== -1;
    if (exc && !isDup) { excerptEl.textContent = exc; excerptEl.style.display = 'block'; }
    else { excerptEl.textContent = ''; excerptEl.style.display = 'none'; }
  }

  const authorLine = a.author2 ? `${a.author} & ${a.author2}` : a.author;
  const creditLines = [];
  if (authorLine) {
    creditLines.push({ label: 'Writer', value: authorLine, names: [a.author, a.author2].filter(Boolean) });
  }
  const photoArr = [a.photojournalist, a.photojournalist_2].filter(Boolean);
  if (photoArr.length) {
    creditLines.push({ label: 'Photos', value: photoArr.join(' & '), names: photoArr });
  } else if (a.photo_courtesy) {
    creditLines.push({ label: 'Photos', value: a.photo_courtesy, names: [] });
  }
  if (photoArr.length && a.photo_courtesy) {
    creditLines.push({ label: 'Courtesy', value: a.photo_courtesy, names: [] });
  }
  if (a.graphics_by) creditLines.push({ label: 'Graphics', value: a.graphics_by, names: [a.graphics_by] });
  const layoutArr = [a.layout_by, a.layout_by_2].filter(Boolean);
  if (layoutArr.length) creditLines.push({ label: 'Layout', value: layoutArr.join(' & '), names: layoutArr });

  const metaBits = [];
  if (a.date) metaBits.push(fmtDate(a.date));
  if (a.read) metaBits.push(a.read + ' read');

  $('#modalMeta').innerHTML = `
    <div class="modal-credits">
      ${creditLines.map(c => `<div class="modal-credit-row"><span class="modal-credit-label">${esc(c.label)}</span><span class="modal-credit-value">${esc(c.value)}</span></div>`).join('')}
    </div>
    ${metaBits.length ? `<div style="width:100%;font-size:.72rem;color:var(--ink-4);margin-top:10px">${esc(metaBits.join(' · '))}</div>` : ''}
  `;

  const letter = esc((CAT_LABELS[a.cat]||'?').charAt(0));
  $('#modalHero').innerHTML = a.thumbnail
    ? `<div class="modal-hero-bg" style="background-image:url('${esc(imgUrl(a.thumbnail, 160))}')"></div>${imgTag(a.thumbnail, [480, 1080], SIZES.modal, ' alt="" loading="lazy" decoding="async"')}`
    : `<span class="modal-hero-text">${letter}</span>`;
  const paras = (a.body||'').split(/\n\s*\n/).filter(p => p.trim());
  const content = paras.map(p => `<p>${esc(p.trim()).replace(/\n/g,'<br>')}</p>`).join('');
  $('#modalContent').innerHTML = content || `<p>${esc(a.excerpt||'')}</p>`;
  twRenderRelated(a);
  twRenderShare(a);

  try {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: a.title,
      description: a.excerpt || (a.body || '').slice(0, 160),
      datePublished: a.date || undefined,
      dateModified: a.updated || a.date || undefined,
      articleSection: CAT_LABELS[a.cat] || a.cat,
      author: {
        '@type': 'Person',
        name: a.author2 ? (a.author + ' & ' + a.author2) : a.author
      },
      publisher: {
        '@type': 'Organization',
        name: 'The Work',
        logo: {
          '@type': 'ImageObject',
          url: 'https://thework.tw78.workers.dev/logo-tw.png'
        }
      },
      image: a.thumbnail || undefined,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': new URL(storyUrl(a), location.origin).href
      }
    };
    let ld = document.getElementById('tw-article-jsonld');
    if (!ld) {
      ld = document.createElement('script');
      ld.id = 'tw-article-jsonld';
      ld.type = 'application/ld+json';
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify(schema);
  } catch (e) { /* silent */ }

  $('#modalOverlay').classList.add('open');
  modalOpen = true;
  lockScroll();
  $('#modalClose').focus();
}
function closeArticle(syncUrl = true) {
  $('#modalOverlay').classList.remove('open');
  modalOpen = false;
  unlockScroll();
  if (articleModalSeo) {
    if (syncUrl && storyRouteId()) history.replaceState(null, '', articleReturnUrl || '/#/');
    updateArticleMeta(null);
  }
  articleReturnUrl = '';
  articleModalSeo = false;
  if (lastFocused) lastFocused.focus();
}
$('#modalClose').addEventListener('click', closeArticle);
const modalGoArticleBtn = document.getElementById('modalGoArticle');
if (modalGoArticleBtn) {
  modalGoArticleBtn.addEventListener('click', () => {
    const titleEl = document.getElementById('modalTitle');
    const id = (titleEl && titleEl.dataset && titleEl.dataset.articleId)
      ? String(titleEl.dataset.articleId)
      : '';
    if (!id) return;
    /* Look up the full story so the slug in the URL matches the title.
       Fall back to a generic slug if the list is out of sync - the worker
       only uses the id portion of the path to fetch the article, so the
       slug is purely cosmetic. */
    const story = Array.isArray(articles)
      ? articles.find(x => String(x.id) === String(id))
      : null;
    const slug = story ? slugifyStoryTitle(story.title) : 'story';
    window.location.assign(`/stories/${slug}/${encodeURIComponent(id)}`);
  });
}
$('#modalOverlay').addEventListener('click', e => { if (e.target === $('#modalOverlay')) closeArticle(); });

document.addEventListener('keydown', e => {
  const dialog = $('.modal-overlay.open, .reader-overlay.open');
  if (e.key === 'Tab' && dialog) {
    const focusable = Array.from(dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(el => el.getClientRects().length > 0);
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      e.preventDefault(); first.focus();
    }
    return;
  }
  if (e.key !== 'Escape') return;
  if (twLightboxOpen) { twCloseLightbox(); return; }
  if ($('#readerOverlay').classList.contains('open')) { closeReader(); return; }
  if ($('#cropOverlay').classList.contains('open')) { closeCropModal(); return; }
  if ($('#memoriamOverlay').classList.contains('open')) { closeMemoriam(); return; }
  if (boardProfileOpen) closeBoardProfile();
  else if (modalOpen) closeArticle();
  else if ($('#loginOverlay').classList.contains('open')) $('#loginOverlay').classList.remove('open');
  else if ($('#confirmOverlay').classList.contains('open')) closeConfirm();
});

const crop = { img:null, natW:0, natH:0, baseScale:1, zoom:1, offsetX:0, offsetY:0, name:null, dragging:false, startX:0, startY:0, origOffsetX:0, origOffsetY:0 };

function openCropModal(file, name) {
  if (!file || !file.type.startsWith('image/')) { toast('Not an image', true); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      crop.img = img; crop.natW = img.width; crop.natH = img.height;
      crop.name = name; crop.zoom = 1; crop.offsetX = 0; crop.offsetY = 0;
      const imgEl = document.getElementById('cropImg');
      imgEl.src = e.target.result;
      document.getElementById('cropZoom').value = 1;
      document.getElementById('cropOverlay').classList.add('open');
      lockScroll();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const stage = document.getElementById('cropStage');
        const rect = stage.getBoundingClientRect();
        if (rect.width && rect.height) {
          const bs = Math.max(rect.width / crop.natW, rect.height / crop.natH);
          const imgH = crop.natH * bs;
          const overflowY = Math.max(0, imgH - rect.height);
          crop.offsetY = overflowY * 0.15;
        }
        applyCropTransform();
      }));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function applyCropTransform(retries) {
  retries = retries || 0;
  if (!crop.img) return;
  const stage = document.getElementById('cropStage');
  const imgEl = document.getElementById('cropImg');
  const rect = stage.getBoundingClientRect();
  if ((!rect.width || !rect.height) && retries < 10) { setTimeout(() => applyCropTransform(retries + 1), 30); return; }
  if (!rect.width || !rect.height) return;
  const bs = Math.max(rect.width / crop.natW, rect.height / crop.natH);
  const s = bs * crop.zoom;
  imgEl.style.width = crop.natW + 'px';
  imgEl.style.height = crop.natH + 'px';
  imgEl.style.transform = `translate(calc(-50% + ${crop.offsetX}px), calc(-50% + ${crop.offsetY}px)) scale(${s})`;
  drawCropPreview();
}

function drawCropPreview() {
  if (!crop.img) return;
  const canvas = document.getElementById('cropPreview');
  if (!canvas) return;
  const stage = document.getElementById('cropStage');
  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const OUT = canvas.width;
  const k = OUT / rect.width;
  const bs = Math.max(rect.width / crop.natW, rect.height / crop.natH);
  const s = bs * crop.zoom * k;
  const dw = crop.natW * s;
  const dh = crop.natH * s;
  const cx = OUT / 2 + crop.offsetX * k;
  const cy = OUT / 2 + crop.offsetY * k;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, OUT, OUT);
  ctx.save();
  ctx.beginPath();
  ctx.arc(OUT/2, OUT/2, OUT/2 - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, OUT, OUT);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(crop.img, cx - dw/2, cy - dh/2, dw, dh);
  ctx.restore();
}

function closeCropModal() {
  document.getElementById('cropOverlay').classList.remove('open');
  unlockScroll();
  crop.img = null; crop.name = null;
}

async function saveCrop() {
  if (!crop.img || !crop.name) return;
  const stage = document.getElementById('cropStage');
  const rect = stage.getBoundingClientRect();
  const OUT = 600;
  const k = OUT / rect.width;
  const bs = Math.max(rect.width / crop.natW, rect.height / crop.natH);
  const s = bs * crop.zoom * k;
  const dw = crop.natW * s, dh = crop.natH * s;
  const cx = OUT / 2 + crop.offsetX * k;
  const cy = OUT / 2 + crop.offsetY * k;
  const canvas = document.createElement('canvas');
  canvas.width = OUT; canvas.height = OUT;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,OUT,OUT);
  ctx.drawImage(crop.img, cx - dw/2, cy - dh/2, dw, dh);
  const blob = await new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.9));
  if (!blob) { toast('Could not process image', true); return; }
  const name = crop.name;
  closeCropModal();
  try {
    toast('Uploading…');
    const url = await Data.uploadBoardPhoto(blob);
    await Data.saveBoardPhoto(name, url);
    boardPhotos[name] = url;
    renderBoardAdmin(); renderBoard();
    toast('Photo saved');
  } catch (err) { toast('Upload failed: ' + safeErrorText(err), true); }
}

document.getElementById('cropCancel').addEventListener('click', closeCropModal);
document.getElementById('cropSave').addEventListener('click', saveCrop);
document.getElementById('cropOverlay').addEventListener('click', e => { if (e.target === document.getElementById('cropOverlay')) closeCropModal(); });
document.getElementById('cropZoom').addEventListener('input', e => { crop.zoom = parseFloat(e.target.value); applyCropTransform(); });

document.getElementById('cropCenter').addEventListener('click', () => {
  if (!crop.img) return;
  const stage = document.getElementById('cropStage');
  const rect = stage.getBoundingClientRect();
  const bs = Math.max(rect.width / crop.natW, rect.height / crop.natH);
  const imgH = crop.natH * bs;
  const overflowY = Math.max(0, imgH - rect.height);
  crop.zoom = 1;
  crop.offsetX = 0;
  crop.offsetY = overflowY * 0.15;
  document.getElementById('cropZoom').value = 1;
  applyCropTransform();
});

(function initCropDrag(){
  const stage = document.getElementById('cropStage');
  stage.addEventListener('pointerdown', e => {
    if (!crop.img) return;
    crop.dragging = true;
    crop.startX = e.clientX; crop.startY = e.clientY;
    crop.origOffsetX = crop.offsetX; crop.origOffsetY = crop.offsetY;
    stage.classList.add('dragging');
    try { stage.setPointerCapture(e.pointerId); } catch(_) {}
  });
  stage.addEventListener('pointermove', e => {
    if (!crop.dragging) return;
    crop.offsetX = crop.origOffsetX + (e.clientX - crop.startX);
    crop.offsetY = crop.origOffsetY + (e.clientY - crop.startY);
    applyCropTransform();
  });
  const end = e => { if (!crop.dragging) return; crop.dragging = false; stage.classList.remove('dragging'); try { stage.releasePointerCapture(e.pointerId); } catch(_) {} };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
})();

async function renderReleasesAdmin() {
  const list = await Data.listAllReleases();
  const el = $('#releaseList');
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:56px 24px;color:var(--ink-3);font-family:var(--sans);font-size:.88rem">No releases yet. Click <strong>New Release</strong> to add one.</div>';
    return;
  }
  el.innerHTML = list.map(r => {
    const cover = r.cover_url || '';
    const coverHtml = cover ? imgTag(cover, [280, 560], '(max-width: 480px) 100vw, (max-width: 900px) 50vw, 280px', ' alt="" loading="lazy" decoding="async"') : '';
    const prov = detectProvider(r.heyzine_url);
    return `
      <div class="release-list-item">
        <div class="release-list-cover">${coverHtml}</div>
        <div class="release-list-info">
          <h4>${esc(r.title)}</h4>
                    <small>${esc(RELEASE_CAT_LABELS[r.category]||'Magazine')} · ${esc(r.volume || '—')} · ${esc(fmtDate(r.issue_date))} · <span class="badge ${r.status==='published'?'published':'draft'}">${r.status}</span>${prov ? ' · ' + esc(PROVIDERS[prov].label) : ''}</small>  
        </div>
        <div class="release-list-actions">
          <button class="icon-action" data-release-edit="${esc(r.id)}" title="Edit">✎</button>
          <button class="icon-action danger" data-release-del="${esc(r.id)}" title="Delete">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderReleaseCoverPreview() {
  const uploader = $('#releaseCoverUploader');
  const empty = $('#releaseCoverEmpty');
  const preview = $('#releaseCoverPreview');
  const img = $('#releaseCoverImg');
  const actions = $('#releaseCoverActions');
  const nameEl = $('#releaseCoverName');
  if (pendingReleaseCover) {
    const src = pendingReleaseCover.existing ? pendingReleaseCover.url : pendingReleaseCover.dataUrl;
    img.src = src;
    preview.style.display = 'grid';
    empty.style.display = 'none';
    uploader.classList.add('has-image');
    actions.style.display = 'flex';
    nameEl.textContent = pendingReleaseCover.existing ? 'Current cover' : (pendingReleaseCover.file?.name || 'cover.jpg');
  } else {
    img.src = '';
    preview.style.display = 'none';
    empty.style.display = 'flex';
    uploader.classList.remove('has-image');
    actions.style.display = 'none';
  }
}

function showReleaseForm(release) {
  $('#releaseFormPanel').style.display = 'block';
  $('#newReleaseBtn').style.display = 'none';
  if (release) {
    editingReleaseId = release.id;
    $('#releaseId').value = release.id;
    $('#releaseTitle').value = release.title || '';
    $('#releaseVolume').value = release.volume || '';
    $('#releaseDate').value = release.issue_date || todayISO();
    $('#releaseStatus').value = release.status || 'draft';
    $('#releaseCategory').value = release.category || 'magazine';
    $('#releaseFlipUrl').value = release.heyzine_url || '';
    setReleaseProvider(detectProvider(release.heyzine_url) || 'heyzine', { keepValue: true });
    $('#releaseFormTitle').textContent = 'Edit release';
    if (release.cover_url) {
      pendingReleaseCover = { existing: true, url: release.cover_url };
    } else {
      pendingReleaseCover = null;
    }
  } else {
    editingReleaseId = null;
    $('#releaseForm').reset();
    $('#releaseCategory').value = 'magazine';
    $('#releaseDate').value = todayISO();
    $('#releaseStatus').value = 'draft';
    $('#releaseCategory').value = 'magazine';
    $('#releaseFormTitle').textContent = 'New release';
    pendingReleaseCover = null;
    setReleaseProvider('heyzine', { keepValue: true });
  }
  renderReleaseCoverPreview();
  setTimeout(() => $('#releaseTitle').focus(), 60);
}

function hideReleaseForm() {
  $('#releaseFormPanel').style.display = 'none';
  $('#newReleaseBtn').style.display = 'inline-flex';
  editingReleaseId = null;
  pendingReleaseCover = null;
  $('#releaseForm').reset();
  $('#releaseCoverFile').value = '';
  setReleaseProvider('heyzine', { keepValue: true });
  renderReleaseCoverPreview();
}

$('#newReleaseBtn').addEventListener('click', () => showReleaseForm(null));
$('#releaseCancelBtn').addEventListener('click', hideReleaseForm);

$('#releaseProviderToggle').addEventListener('click', e => {
  const btn = e.target.closest('.provider-opt');
  if (!btn || btn.dataset.provider === releaseProvider) return;
  setReleaseProvider(btn.dataset.provider, { keepValue: true });
  $('#releaseFlipUrl').focus();
});

$('#releaseFlipUrl').addEventListener('input', e => {
  const det = detectProvider(e.target.value);
  if (det && det !== releaseProvider) setReleaseProvider(det, { keepValue: true });
});

$('#releaseCoverUploader').addEventListener('click', e => {
  if (e.target.closest('#releaseCoverChange') || e.target.closest('#releaseCoverRemove')) return;
  if ($('#releaseCoverUploader').classList.contains('has-image')) return;
  $('#releaseCoverFile').click();
});
$('#releaseCoverChange').addEventListener('click', e => { e.stopPropagation(); $('#releaseCoverFile').click(); });
$('#releaseCoverRemove').addEventListener('click', e => {
  e.stopPropagation();
  pendingReleaseCover = null;
  $('#releaseCoverFile').value = '';
  renderReleaseCoverPreview();
});
$('#releaseCoverFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Not an image', true); return; }
  try {
    const dataUrl = await resizeImage(file, 800, 0.85);
    pendingReleaseCover = { file, dataUrl };
    renderReleaseCoverPreview();
  } catch (err) {
    toast('Could not process image', true);
  }
  e.target.value = '';
});

$('#releaseForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!session) { toast('Please sign in first.', true); return; }
  const title = $('#releaseTitle').value.trim();
  const flipUrl = $('#releaseFlipUrl').value.trim();
  if (!title || !flipUrl) { toast('Title and flipbook URL are required', true); return; }
  if (!/^https?:\/\//i.test(flipUrl)) { toast('Flipbook URL must start with http:// or https://', true); return; }

  const btn = $('#releaseSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    let cover_url = null;
    if (pendingReleaseCover) {
      if (pendingReleaseCover.existing) {
        cover_url = pendingReleaseCover.url;
      } else if (pendingReleaseCover.file) {
        btn.textContent = 'Uploading cover…';
        cover_url = await Data.uploadThumb(pendingReleaseCover.file);
      }
    }

    const payload = {
      id: editingReleaseId || uid(),
      title,
      volume: $('#releaseVolume').value.trim() || null,
      issue_date: $('#releaseDate').value || todayISO(),
      status: $('#releaseStatus').value,
      category: $('#releaseCategory').value || 'magazine',
      heyzine_url: flipUrl,
      cover_url: cover_url,
      updated: new Date().toISOString()
    };

    await Data.upsertRelease(payload);
    toast(editingReleaseId ? 'Release updated' : 'Release created');
    hideReleaseForm();
    await renderReleasesAdmin();
    await renderReleasesPreview();
    await renderReleasesPage();
  } catch (err) {
    console.error(err);
    toast('Save failed: ' + safeErrorText(err), true);
  } finally {
    btn.disabled = false; btn.textContent = 'Save release';
  }
});

document.addEventListener('click', async e => {
  const ed = e.target.closest('[data-release-edit]');
  if (ed) {
    const list = await Data.listAllReleases();
    const r = list.find(x => x.id === ed.dataset.releaseEdit);
    if (r) showReleaseForm(r);
    return;
  }
  const dl = e.target.closest('[data-release-del]');
  if (dl) {
    openConfirm('Delete release?', 'This release will be removed.', async () => {
      try {
        await Data.removeRelease(dl.dataset.releaseDel);
        await renderReleasesAdmin();
        await renderReleasesPreview();
        await renderReleasesPage();
        toast('Release deleted');
      } catch (err) { toast('Failed: ' + safeErrorText(err), true); }
    });
  }
});

async function renderVideosAdmin() {
  const el = $('#videoAdminList');
  if (!el) return;
  const list = await Data.listAllVideos();
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:56px 24px;color:var(--ink-3);font-family:var(--sans);font-size:.88rem">No videos yet. Click <strong>New video</strong> to add one.</div>';
    return;
  }
  el.innerHTML = list.map(v => {
    const thumb = v.thumbnail_url || youtubeThumb(v);
    const thumbHtml = thumb ? imgTag(thumb, [320, 640], SIZES.video, ' alt="" loading="lazy" decoding="async"') : '';
    return `
      <div class="release-list-item">
        <div class="release-list-cover">${thumbHtml}</div>
        <div class="release-list-info">
          <h4>${esc(v.title)}</h4>
          <small>${esc(({tvb:'News Broadcast',mojo:'MoJo',reels:'Reels',animations:'Animations'})[v.subcategory || 'tvb'] || 'News Broadcast')} · ${esc(v.platform || '—')} · ${esc(v.published ? fmtDate(v.published) : '—')} · <span class="badge ${v.status==='published'?'published':'draft'}">${v.status}</span></small>
        </div>
        <div class="release-list-actions">
          <button class="icon-action" data-video-edit="${esc(v.id)}" title="Edit">✎</button>
          <button class="icon-action danger" data-video-del="${esc(v.id)}" title="Delete">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderVideoThumbPreview() {
  const uploader = $('#videoThumbUploader');
  const empty = $('#videoThumbEmpty');
  const preview = $('#videoThumbPreview');
  const img = $('#videoThumbImg');
  const actions = $('#videoThumbActions');
  const nameEl = $('#videoThumbName');
  const emptyText = $('#videoThumbEmptyText');
  const emptyHint = $('#videoThumbEmptyHint');
  if (!uploader) return;

  /* Auto mode: always reflect the URL. The DB stores thumbnail_url:null so the
     renderer falls back to youtubeThumb() at read time — nothing to upload. */
  if (videoThumbMode === 'auto') {
    const auto = youtubeThumb({ video_url: $('#videoUrl').value });
    if (auto) {
      img.src = auto;
      preview.style.display = 'grid';
      empty.style.display = 'none';
      uploader.classList.add('has-image');
    } else {
      img.src = '';
      preview.style.display = 'none';
      empty.style.display = 'flex';
      uploader.classList.remove('has-image');
      if (emptyText) emptyText.textContent = 'Paste a YouTube or Vimeo URL to auto-fill a thumbnail';
      if (emptyHint) emptyHint.textContent = 'Facebook links cannot be auto-thumbnailed — switch to Upload custom';
    }
    if (actions) actions.style.display = 'none';
    return;
  }

  /* Upload mode. */
  if (pendingVideoThumb) {
    const src = pendingVideoThumb.existing ? pendingVideoThumb.url : pendingVideoThumb.dataUrl;
    img.src = src;
    preview.style.display = 'grid';
    empty.style.display = 'none';
    uploader.classList.add('has-image');
    if (actions) actions.style.display = 'flex';
    if (nameEl) nameEl.textContent = pendingVideoThumb.existing ? 'Current thumbnail' : (pendingVideoThumb.file?.name || 'thumbnail.jpg');
    return;
  }

  img.src = '';
  preview.style.display = 'none';
  empty.style.display = 'flex';
  uploader.classList.remove('has-image');
  if (actions) actions.style.display = 'none';
  if (emptyText) emptyText.textContent = 'Click to upload a custom thumbnail';
  if (emptyHint) emptyHint.textContent = 'JPG, PNG, or WebP';
}

function setVideoThumbMode(mode) {
  videoThumbMode = mode === 'upload' ? 'upload' : 'auto';
  const toggle = document.getElementById('videoThumbModeToggle');
  if (toggle) {
    toggle.querySelectorAll('.thumb-mode-opt').forEach(btn => {
      const on = btn.dataset.mode === videoThumbMode;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }
  renderVideoThumbPreview();
}

function showVideoForm(v) {
  $('#videoFormPanel').style.display = 'block';
  $('#newVideoBtn').style.display = 'none';
  if (v) {
    editingVideoId = v.id;
    $('#videoId').value = v.id;
    $('#videoTitle').value = v.title || '';
    $('#videoUrl').value = v.video_url || '';
    $('#videoPlatform').value = v.platform || 'youtube';
    $('#videoPublished').value = v.published || todayISO();
    $('#videoDescription').value = v.description || '';
    $('#videoStatus').value = v.status || 'published';
    $('#videoSort').value = v.sort_order != null ? v.sort_order : 0;
    const setV = (sel, val) => { const el = $(sel); if (el) el.value = val || ''; };
    setV('#videoBroadcasters', v.broadcasters);
    setV('#videoBroadcaster2', v.broadcaster_2);
    setV('#videoTechnicians', v.technicians);
    setV('#videoVideojournalist', v.videojournalist);
    setV('#videoVideojournalist2', v.videojournalist_2);
    setV('#videoVideojournalist3', v.videojournalist_3);
    setV('#videoCourtesy', v.video_courtesy);
    setV('#videoCourtesy2', v.video_courtesy_2);
    setV('#videoDirector', v.director);
    setV('#videoDirector2', v.director_2);
    setV('#videoWriter', v.writer);
    setV('#videoWriter2', v.writer_2);
    setV('#videoWriter3', v.writer_3);
    setV('#videoAnimator', v.animator);
    setV('#videoAnimator2', v.animator_2);
    setV('#videoEditor', v.editor);
    $('#videoSubcategory').value = v.subcategory || 'tvb';
    $('#videoOrientation').value = v.orientation || 'landscape';
    $('#videoFormTitle').textContent = 'Edit video';
    pendingVideoThumb = v.thumbnail_url ? { existing:true, url: v.thumbnail_url } : null;
    setVideoThumbMode(v.thumbnail_url ? 'upload' : 'auto');
  } else {
    editingVideoId = null;
    $('#videoForm').reset();
    $('#videoPublished').value = todayISO();
    $('#videoStatus').value = 'published';
    $('#videoSort').value = '0';
    $('#videoPlatform').value = 'youtube';
    $('#videoSubcategory').value = 'tvb';
    $('#videoOrientation').value = 'landscape';
    $('#videoFormTitle').textContent = 'New video';
    pendingVideoThumb = null;
    setVideoThumbMode('auto');
  }
  renderVideoThumbPreview();
  setTimeout(() => $('#videoTitle').focus(), 60);
}

function hideVideoForm() {
  $('#videoFormPanel').style.display = 'none';
  $('#newVideoBtn').style.display = 'inline-flex';
  editingVideoId = null;
  pendingVideoThumb = null;
  videoThumbMode = 'auto';
  $('#videoForm').reset();
  $('#videoThumbFile').value = '';
  renderVideoThumbPreview();
}

document.addEventListener('click', e => {
  if (e.target.closest('#newVideoBtn'))  { showVideoForm(null); return; }
  if (e.target.closest('#videoCancelBtn')) { hideVideoForm(); return; }

  const modeBtn = e.target.closest('#videoThumbModeToggle .thumb-mode-opt');
  if (modeBtn) { setVideoThumbMode(modeBtn.dataset.mode); return; }

  if (e.target.closest('#videoThumbChange')) { $('#videoThumbFile')?.click(); return; }

  if (e.target.closest('#videoThumbRemove')) {
    pendingVideoThumb = null;
    const f = $('#videoThumbFile'); if (f) f.value = '';
    renderVideoThumbPreview();
    return;
  }

  const uploader = e.target.closest('#videoThumbUploader');
  if (uploader) {
    if (videoThumbMode === 'auto') return;          // no-op in auto mode
    if (uploader.classList.contains('has-image') && pendingVideoThumb) return;
    $('#videoThumbFile')?.click();
    return;
  }
});

document.addEventListener('input', e => {
  if (e.target && e.target.id === 'videoUrl') {
    const u = e.target.value;
    if (/youtu/i.test(u)) $('#videoPlatform').value = 'youtube';
    else if (/facebook|fb\.watch/i.test(u)) $('#videoPlatform').value = 'facebook';
    else if (/vimeo/i.test(u)) $('#videoPlatform').value = 'vimeo';
    if (videoThumbMode === 'auto') renderVideoThumbPreview();
  }
});

document.addEventListener('change', async e => {
  if (e.target && e.target.id === 'videoThumbFile') {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Not an image', true); return; }
    try {
      const dataUrl = await resizeImage(file, 900, 0.82);
      pendingVideoThumb = { file, dataUrl };
      renderVideoThumbPreview();
    } catch (err) {
      toast('Could not process image', true);
    }
    e.target.value = '';
  }
});

$('#videoForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!session) { toast('Please sign in first.', true); return; }
  const title = $('#videoTitle').value.trim();
  const url = $('#videoUrl').value.trim();
  if (!title || !url) { toast('Title and video URL are required', true); return; }
  if (!/^https?:\/\//i.test(url)) { toast('URL must start with http:// or https://', true); return; }

  const btn = $('#videoSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    let thumbnail_url = null;
    /* Auto mode means "let the renderer pick" — persist null so youtubeThumb()
       fills it back in every time the video list is rebuilt. */
    if (videoThumbMode === 'upload' && pendingVideoThumb) {
      if (pendingVideoThumb.existing) {
        thumbnail_url = pendingVideoThumb.url;
      } else if (pendingVideoThumb.file) {
        btn.textContent = 'Uploading thumbnail…';
        thumbnail_url = await Data.uploadThumb(pendingVideoThumb.file);
      }
    }

    const payload = {
      id: editingVideoId || uid(),
      title,
      description: $('#videoDescription').value.trim() || null,
      platform: $('#videoPlatform').value,
      video_url: url,
      thumbnail_url: thumbnail_url,
      published: $('#videoPublished').value || todayISO(),
      status: $('#videoStatus').value,
      sort_order: parseInt($('#videoSort').value, 10) || 0,
      broadcasters: $('#videoBroadcasters').value.trim() || null,
      broadcaster_2: $('#videoBroadcaster2') ? $('#videoBroadcaster2').value.trim() || null : null,
      technicians: $('#videoTechnicians').value.trim() || null,
      videojournalist: $('#videoVideojournalist') ? $('#videoVideojournalist').value.trim() || null : null,
      videojournalist_2: $('#videoVideojournalist2') ? $('#videoVideojournalist2').value.trim() || null : null,
      videojournalist_3: $('#videoVideojournalist3') ? $('#videoVideojournalist3').value.trim() || null : null,
      video_courtesy: $('#videoCourtesy') ? $('#videoCourtesy').value.trim() || null : null,
      video_courtesy_2: $('#videoCourtesy2') ? $('#videoCourtesy2').value.trim() || null : null,
      director: $('#videoDirector') ? $('#videoDirector').value.trim() || null : null,
      director_2: $('#videoDirector2') ? $('#videoDirector2').value.trim() || null : null,
      writer: $('#videoWriter') ? $('#videoWriter').value.trim() || null : null,
      writer_2: $('#videoWriter2') ? $('#videoWriter2').value.trim() || null : null,
      writer_3: $('#videoWriter3') ? $('#videoWriter3').value.trim() || null : null,
      animator: $('#videoAnimator') ? $('#videoAnimator').value.trim() || null : null,
      animator_2: $('#videoAnimator2') ? $('#videoAnimator2').value.trim() || null : null,
      editor: $('#videoEditor') ? $('#videoEditor').value.trim() || null : null,
      subcategory: $('#videoSubcategory').value || 'tvb',
      orientation: $('#videoOrientation').value || 'landscape',
      updated: new Date().toISOString()
    };

    await Data.upsertVideo(payload);
    toast(editingVideoId ? 'Video updated' : 'Video created');
    hideVideoForm();
    await renderVideosAdmin();
    await renderVideosPage();
  } catch (err) {
    console.error(err);
    toast('Save failed: ' + safeErrorText(err), true);
  } finally {
    btn.disabled = false; btn.textContent = 'Save video';
  }
});

document.addEventListener('click', async e => {
  const ed = e.target.closest('[data-video-edit]');
  if (ed) {
    const list = await Data.listAllVideos();
    const v = list.find(x => x.id === ed.dataset.videoEdit);
    if (v) showVideoForm(v);
    return;
  }
  const dl = e.target.closest('[data-video-del]');
  if (dl) {
    openConfirm('Delete video?', 'This video will be removed from the library.', async () => {
      try {
        await Data.removeVideo(dl.dataset.videoDel);
        await renderVideosAdmin();
        await renderVideosPage();
        toast('Video deleted');
      } catch (err) { toast('Failed: ' + safeErrorText(err), true); }
    });
  }
});

async function renderMemoriamAdmin() {
  const el = $('#memoriamAdminList');
  if (!el) return;
  const list = await Data.listMemoriam();
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:56px 24px;color:var(--ink-3);font-family:var(--sans);font-size:.88rem">No entries yet. Click <strong>New entry</strong> to add one.</div>';
    return;
  }
  el.innerHTML = list.map(m => {
    const photo = m.photo_url || '';
    const photoHtml = photo ? imgTag(photo, [320], '', ' alt="" loading="lazy" decoding="async"') : '';
    const captionPreview = m.caption ? (m.caption.length > 60 ? m.caption.slice(0,60) + '…' : m.caption) : '';
    return `
      <div class="release-list-item">
        <div class="release-list-cover" style="width:72px;height:54px">${photoHtml}</div>
        <div class="release-list-info">
          <h4>${esc(m.school_year || '—')}</h4>
          <small>${esc(m.term_label || '—')}${captionPreview ? ' · ' + esc(captionPreview) : ''}</small>
        </div>
        <div class="release-list-actions">
          <button class="icon-action" data-memoriam-edit="${esc(m.id)}" title="Edit">✎</button>
          <button class="icon-action danger" data-memoriam-del="${esc(m.id)}" title="Delete">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderMemoriamPhotoPreview() {
  const uploader = $('#memoriamPhotoUploader');
  const empty = $('#memoriamPhotoEmpty');
  const preview = $('#memoriamPhotoPreview');
  const img = $('#memoriamPhotoImg');
  const actions = $('#memoriamPhotoActions');
  const nameEl = $('#memoriamPhotoName');
  if (!uploader) return;

  if (pendingMemoriamPhoto) {
    const src = pendingMemoriamPhoto.existing ? pendingMemoriamPhoto.url : pendingMemoriamPhoto.dataUrl;
    img.src = src;
    preview.style.display = 'grid';
    empty.style.display = 'none';
    uploader.classList.add('has-image');
    actions.style.display = 'flex';
    nameEl.textContent = pendingMemoriamPhoto.existing ? 'Current photo' : (pendingMemoriamPhoto.file?.name || 'photo.jpg');
  } else {
    img.src = '';
    preview.style.display = 'none';
    empty.style.display = 'flex';
    uploader.classList.remove('has-image');
    actions.style.display = 'none';
  }
}

function showMemoriamForm(m) {
  $('#memoriamFormPanel').style.display = 'block';
  $('#newMemoriamBtn').style.display = 'none';
  if (m) {
    editingMemoriamId = m.id;
    $('#memoriamId').value = m.id;
    $('#memoriamYear').value = m.school_year || '';
    $('#memoriamTerm').value = m.term_label || '';
    $('#memoriamCaption').value = m.caption || '';
    $('#memoriamSort').value = m.sort_order != null ? m.sort_order : 0;
    $('#memoriamFormTitle').textContent = 'Edit entry';
    pendingMemoriamPhoto = m.photo_url ? { existing: true, url: m.photo_url } : null;
  } else {
    editingMemoriamId = null;
    $('#memoriamForm').reset();
    $('#memoriamSort').value = '0';
    $('#memoriamFormTitle').textContent = 'New entry';
    pendingMemoriamPhoto = null;
  }
  renderMemoriamPhotoPreview();
  setTimeout(() => $('#memoriamYear').focus(), 60);
}

function hideMemoriamForm() {
  $('#memoriamFormPanel').style.display = 'none';
  $('#newMemoriamBtn').style.display = 'inline-flex';
  editingMemoriamId = null;
  pendingMemoriamPhoto = null;
  $('#memoriamForm').reset();
  $('#memoriamPhotoFile').value = '';
  renderMemoriamPhotoPreview();
}

document.addEventListener('click', e => {
  if (e.target.closest('#newMemoriamBtn'))  { showMemoriamForm(null); return; }
  if (e.target.closest('#memoriamCancelBtn')) { hideMemoriamForm(); return; }
  if (e.target.closest('#memoriamPhotoChange')) { $('#memoriamPhotoFile')?.click(); return; }
  if (e.target.closest('#memoriamPhotoRemove')) {
    pendingMemoriamPhoto = null;
    const f = $('#memoriamPhotoFile'); if (f) f.value = '';
    renderMemoriamPhotoPreview();
    return;
  }
  const uploader = e.target.closest('#memoriamPhotoUploader');
  if (uploader) {
    if (uploader.classList.contains('has-image') && pendingMemoriamPhoto) return;
    $('#memoriamPhotoFile')?.click();
    return;
  }
});

document.addEventListener('change', async e => {
  if (e.target && e.target.id === 'memoriamPhotoFile') {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Not an image', true); return; }
    try {
      const dataUrl = await resizeImage(file, 1200, 0.85);
      pendingMemoriamPhoto = { file, dataUrl };
      renderMemoriamPhotoPreview();
    } catch (err) {
      toast('Could not process image', true);
    }
    e.target.value = '';
  }
});

$('#memoriamForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!session) { toast('Please sign in first.', true); return; }
  const year = $('#memoriamYear').value.trim();
  if (!year) { toast('School year is required', true); return; }
  if (!pendingMemoriamPhoto) { toast('Please upload a board photo', true); return; }

  const btn = $('#memoriamSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    let photo_url = null;
    if (pendingMemoriamPhoto.existing) {
      photo_url = pendingMemoriamPhoto.url;
    } else if (pendingMemoriamPhoto.file) {
      btn.textContent = 'Uploading photo…';
      photo_url = await Data.uploadThumb(pendingMemoriamPhoto.file);
    }

    const payload = {
      id: editingMemoriamId || uid(),
      school_year: year,
      term_label: $('#memoriamTerm').value.trim() || null,
      caption: $('#memoriamCaption').value.trim() || null,
      photo_url: photo_url,
      sort_order: parseInt($('#memoriamSort').value, 10) || 0,
      updated: new Date().toISOString()
    };

    await Data.upsertMemoriam(payload);
    toast(editingMemoriamId ? 'Entry updated' : 'Entry created');
    hideMemoriamForm();
    await renderMemoriamAdmin();
    await renderMemoriamPage();
  } catch (err) {
    console.error(err);
    toast('Save failed: ' + safeErrorText(err), true);
  } finally {
    btn.disabled = false; btn.textContent = 'Save entry';
  }
});

document.addEventListener('click', async e => {
  const ed = e.target.closest('[data-memoriam-edit]');
  if (ed) {
    const list = await Data.listMemoriam();
    const m = list.find(x => x.id === ed.dataset.memoriamEdit);
    if (m) showMemoriamForm(m);
    return;
  }
  const dl = e.target.closest('[data-memoriam-del]');
  if (dl) {
    openConfirm('Delete entry?', 'This past board will be removed from Look Back.', async () => {
      try {
        await Data.removeMemoriam(dl.dataset.memoriamDel);
        await renderMemoriamAdmin();
        await renderMemoriamPage();
        toast('Entry deleted');
      } catch (err) { toast('Failed: ' + safeErrorText(err), true); }
    });
  }
});

// ---------- Brand color editor ----------
const BRAND_COLORS = [
  { key: 'brand-primary',      label: 'Primary',       default: '#7C3AED' },
  { key: 'brand-primary-dark', label: 'Primary dark',  default: '#6D28D9' },
  { key: 'brand-accent',       label: 'Accent',        default: '#D946EF' },
  { key: 'brand-gradient-2',   label: 'Gradient mid',  default: '#A855F7' }
];

function getSavedBrandColors() {
  try { return JSON.parse(localStorage.getItem('tw_brand_colors') || '{}'); } catch(e) { return {}; }
}

function applyBrandColors() {
  const saved = getSavedBrandColors();
  const root = document.documentElement;
  BRAND_COLORS.forEach(c => {
    const val = saved[c.key] || c.default;
    root.style.setProperty('--' + c.key, val);
  });
  // Keep gradient stops aligned with primary + accent
  root.style.setProperty('--brand-gradient-1', saved['brand-primary'] || BRAND_COLORS[0].default);
  root.style.setProperty('--brand-gradient-3', saved['brand-accent'] || BRAND_COLORS[2].default);
}

function renderColorGrid() {
  const grid = document.getElementById('colorGrid');
  const strip = document.getElementById('colorPreviewStrip');
  if (!grid) return;
  const saved = getSavedBrandColors();

  grid.innerHTML = BRAND_COLORS.map(c => {
    const val = saved[c.key] || c.default;
    return `
      <div class="color-row">
        <input type="color" data-color-key="${c.key}" value="${val}">
        <div class="color-meta">
          <label>${c.label}</label>
          <code>${val}</code>
        </div>
      </div>
    `;
  }).join('');

  const updateStrip = () => {
    if (!strip) return;
    const root = document.documentElement;
    const p = root.style.getPropertyValue('--brand-gradient-1') || BRAND_COLORS[0].default;
    const m = root.style.getPropertyValue('--brand-gradient-2') || BRAND_COLORS[3].default;
    const a = root.style.getPropertyValue('--brand-gradient-3') || BRAND_COLORS[2].default;
    strip.style.background = `linear-gradient(135deg, ${p} 0%, ${m} 55%, ${a} 100%)`;
  };
  updateStrip();

  grid.querySelectorAll('input[type=color]').forEach(input => {
    input.addEventListener('input', e => {
      const key = e.target.dataset.colorKey;
      const val = e.target.value;
      document.documentElement.style.setProperty('--' + key, val);
      const code = e.target.parentElement.querySelector('code');
      if (code) code.textContent = val;
      if (key === 'brand-primary') document.documentElement.style.setProperty('--brand-gradient-1', val);
      if (key === 'brand-accent') document.documentElement.style.setProperty('--brand-gradient-3', val);
      updateStrip();
    });
  });
}

document.getElementById('saveColorsBtn')?.addEventListener('click', () => {
  const grid = document.getElementById('colorGrid');
  if (!grid) return;
  const colors = {};
  grid.querySelectorAll('input[type=color]').forEach(input => {
    colors[input.dataset.colorKey] = input.value;
  });
  localStorage.setItem('tw_brand_colors', JSON.stringify(colors));
  applyBrandColors();
  toast('Brand colors saved');
});

document.getElementById('resetColorsBtn')?.addEventListener('click', () => {
  localStorage.removeItem('tw_brand_colors');
  const root = document.documentElement;
  BRAND_COLORS.forEach(c => root.style.removeProperty('--' + c.key));
  root.style.removeProperty('--brand-gradient-1');
  root.style.removeProperty('--brand-gradient-3');
  renderColorGrid();
  toast('Colors reset to defaults');
});

async function renderAdmin() {
  const all = await Data.listAll();
  window.__allArticles = Array.isArray(all) ? all : [];
  const total = window.__allArticles.length;
  const published = window.__allArticles.filter(a => a.status === 'published').length;
  const drafts = total - published;
  const sections = new Set(window.__allArticles.map(a => a.cat)).size;
  $('#statTotal').textContent = total;
  $('#statPublished').textContent = published;
  $('#statDrafts').textContent = drafts;
  $('#statSections').textContent = sections;
  const email = session?.user?.email || session?.email || 'admin';
  $('#dashName').textContent = email.split('@')[0];

  const recent = all.slice(0,5);
  const rl = $('#recentList');
  if (!recent.length) {
    rl.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--ink-3)"><p style="font-family:var(--sans)">No articles yet.</p></div>';
  } else {
    rl.innerHTML = recent.map(a =>
      `<div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--line-2)">
        <div style="flex:1;min-width:0">
          <div style="font-weight:650;font-size:.9rem;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.title)}</div>
          <div style="font-family:var(--sans);font-size:.74rem;color:var(--ink-3)">${esc(a.author||'—')} · ${esc(fmtDate(a.date))} · <span class="badge ${a.status==='published'?'published':'draft'}">${a.status}</span></div>
        </div>
        <button class="icon-action" data-edit="${a.id}">✎</button>
      </div>`
    ).join('');
  }
  renderTable();
}

function updateBulkBar() {
  const bar = $('#bulkBar');
  if (!bar) return;
  const count = selectedIds.size;
  const countText = $('#bulkCount');
  const allRows = $$('.row-check');
  const selectAll = $('#selectAllRows');
  if (countText) countText.textContent = count ? `${count} selected` : 'No rows selected';
  if (selectAll) selectAll.checked = allRows.length > 0 && count === allRows.length;
  if (count) {
    bar.hidden = false;
  } else {
    bar.hidden = true;
  }
}

function renderTable() {
  const wrap = $('#tableContainer');
  const all = window.__allArticles || [];
  let list = all.slice();
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(a => (a.title||'').toLowerCase().includes(q) || (a.author||'').toLowerCase().includes(q));
  }
  if (statusFilter) list = list.filter(a => a.status === statusFilter);
  if (catFilter) list = list.filter(a => a.cat === catFilter);

  if (!list.length) {
    wrap.innerHTML = '<div style="text-align:center;padding:56px 24px;color:var(--ink-3)"><h3 style="font-family:var(--serif);color:var(--ink-2)">No articles</h3></div>';
    updateBulkBar();
    return;
  }
  let html = '<table><thead><tr><th style="width:34px;padding-right:0"><input type="checkbox" id="selectAllRows" aria-label="Select all visible rows" /></th><th>Title</th><th>Section</th><th>Status</th><th>Updated</th><th style="text-align:right">Actions</th></tr></thead><tbody>';
  list.forEach(a => {
    const thumbHtml = a.thumbnail ? imgTag(a.thumbnail, [96], '', ' alt="" loading="lazy" decoding="async"') : esc((CAT_LABELS[a.cat]||'?').charAt(0));
    html += `<tr>
      <td style="width:34px;padding-right:0"><input class="row-check" type="checkbox" data-row-id="${esc(a.id)}" ${selectedIds.has(a.id) ? 'checked' : ''} /></td>
      <td class="title-cell"><div class="cell-title"><div class="mini-thumb">${thumbHtml}</div><div style="min-width:0"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.title)}</div><small>by ${esc(a.author||'—')} · ${esc(fmtDate(a.date))}</small></div></div></td>
      <td><span class="badge cat-${esc(a.cat)}">${esc(CAT_LABELS[a.cat]||a.cat)}</span></td>
      <td><span class="badge ${a.status==='published'?'published':'draft'}">${a.status}</span></td>
      <td style="font-family:var(--sans);font-size:.76rem;color:var(--ink-3)">${timeAgo(a.updated)}</td>
      <td><div class="row-actions">
        <button class="icon-action" data-view="${a.id}">👁</button>
        <button class="icon-action" data-edit="${a.id}">✎</button>
        <button class="icon-action danger" data-del="${a.id}">✕</button>
      </div></td></tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
  updateBulkBar();
}

async function bulkUpdate(status) {
  const ids = Array.from(selectedIds);
  if (!ids.length) return;
  const count = ids.length;
  if (!sb) {
    const list = JSON.parse(localStorage.getItem('tw_articles') || '[]');
    list.forEach((item, index) => {
      if (ids.includes(item.id)) {
        list[index] = { ...item, status, updated: new Date().toISOString() };
      }
    });
    localStorage.setItem('tw_articles', JSON.stringify(list));
    appCache.publishedArticles = null;
    appCache.allArticles = null;
    selectedIds.clear();
    await renderAdmin();
    toast(`${count} article${count > 1 ? 's' : ''} marked ${status}`);
    return;
  }
  try {
    const { error } = await sb.from('articles').update({ status, updated: new Date().toISOString() }).in('id', ids);
    if (error) throw error;
    appCache.publishedArticles = null;
    appCache.allArticles = null;
    selectedIds.clear();
    await renderAdmin();
    toast(`${count} article${count > 1 ? 's' : ''} marked ${status}`);
  } catch (err) {
    toast('Bulk update failed: ' + safeErrorText(err), true);
  }
}

async function bulkDelete() {
  const ids = Array.from(selectedIds);
  if (!ids.length) return;
  const count = ids.length;
  openConfirm('Move ' + count + ' to trash?', 'You can restore them within 30 days.', async () => {
    try {
      if (!sb) {
        const list = JSON.parse(localStorage.getItem('tw_articles') || '[]');
        list.forEach(item => { if (ids.includes(item.id)) item.deleted_at = new Date().toISOString(); });
        localStorage.setItem('tw_articles', JSON.stringify(list));
      } else {
        const { error } = await sb.from('articles').update({ deleted_at: new Date().toISOString() }).in('id', ids);
        if (error) throw error;
      }
      appCache.publishedArticles = null;
      appCache.allArticles = null;
      selectedIds.clear();
      await renderAdmin();
      toast(`${count} article${count > 1 ? 's' : ''} moved to trash`);
    } catch (err) {
      toast('Bulk delete failed: ' + safeErrorText(err), true);
    }
  });
}

function setThumbnail(dataUrl, name) {
  pendingThumbnail = dataUrl;
  const uploader = $('#thumbUploader');
  if (dataUrl) {
    $('#thumbImg').src = dataUrl;
    $('#thumbPreview').style.display = 'grid';
    $('#thumbEmpty').style.display = 'none';
    uploader.classList.add('has-image');
    $('#thumbActions').style.display = 'flex';
    $('#thumbName').textContent = name || 'thumbnail.jpg';
  } else {
    $('#thumbImg').src = '';
    $('#thumbPreview').style.display = 'none';
    $('#thumbEmpty').style.display = 'flex';
    uploader.classList.remove('has-image');
    $('#thumbActions').style.display = 'none';
  }
}
$('#thumbUploader').addEventListener('click', e => {
  if (e.target.closest('#removeThumbBtn') || e.target.closest('#changeThumbBtn')) return;
  if ($('#thumbUploader').classList.contains('has-image')) return;
  $('#fThumb').click();
});
$('#changeThumbBtn').addEventListener('click', e => { e.stopPropagation(); $('#fThumb').click(); });
$('#removeThumbBtn').addEventListener('click', e => { e.stopPropagation(); $('#fThumb').value=''; setThumbnail(null); window.__pendingThumbFile = null; });
$('#fThumb').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev => setThumbnail(ev.target.result, file.name);
  r.readAsDataURL(file);
  window.__pendingThumbFile = file;
});


// ---------- Prefetch thumbnails on hover ----------
const twPrefetched = new Set();
function twPrefetchImage(src) {
  if (!src || twPrefetched.has(src)) return;
  twPrefetched.add(src);
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
}
function twWirePrefetch(container) {
  container.querySelectorAll('.article,.sidebar-item,.release-card,.video-card,.bp-article,.lead-story').forEach(el => {
    el.addEventListener('pointerenter', () => {
      const img = el.querySelector('img[src]');
      if (img) twPrefetchImage(img.getAttribute('src'));
      const id = el.getAttribute('data-article-id') || el.getAttribute('data-video-id') || el.getAttribute('data-release-id');
      if (!id) return;
      const list = el.classList.contains('video-card') ? (window.__videosCache || []) : articles;
      const item = Array.isArray(list) ? list.find(x => String(x.id) === String(id)) : null;
      if (item && item.thumbnail) twPrefetchImage(item.thumbnail);
      if (item && item.thumbnail_url) twPrefetchImage(item.thumbnail_url);
    }, { passive: true });
  });
}

// ---------- Save for later ----------
function twGetSaved() {
  try { return JSON.parse(localStorage.getItem('tw_saved') || '[]'); } catch(e) { return []; }
}
function twSetSaved(list) {
  try { localStorage.setItem('tw_saved', JSON.stringify(list)); } catch(e) {}
  twUpdateSavedUI();
}
function twIsSaved(id) { return twGetSaved().indexOf(id) !== -1; }
function twToggleSaved(id) {
  const list = twGetSaved();
  const idx = list.indexOf(id);
  if (idx === -1) { list.push(id); toast('Saved to your list'); }
  else { list.splice(idx, 1); toast('Removed from saved'); }
  twSetSaved(list);
}
function twUpdateSavedUI() {
  const list = twGetSaved();
  const link = document.querySelector('.tw-saved-link');
  const count = document.getElementById('twSavedCount');
  if (link) link.style.display = list.length ? '' : 'none';
  if (count) count.textContent = list.length ? '(' + list.length + ')' : '';
}
function twSavedButtonHtml(id) {
  const saved = twIsSaved(id);
  return `<button type="button" class="tw-save-btn${saved ? ' saved' : ''}" data-save-id="${esc(id)}" aria-label="${saved ? 'Remove from saved' : 'Save for later'}"><svg viewBox="0 0 24 24" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>`;
}
function twWireSaveButtons(container) {
  container.querySelectorAll('.tw-save-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const id = btn.getAttribute('data-save-id');
      twToggleSaved(id);
      const saved = twIsSaved(id);
      btn.classList.toggle('saved', saved);
      btn.querySelector('svg').setAttribute('fill', saved ? 'currentColor' : 'none');
      btn.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save for later');
      if (location.hash === '#/saved') renderSavedPage();
    });
  });
}
async function renderSavedPage() {
  const grid = document.getElementById('savedGrid');
  if (!grid) return;
  grid.innerHTML = twSkelGrid(3);
  const ids = twGetSaved();
  if (!ids.length) {
    grid.innerHTML = '<div class="tw-error" style="grid-column:1/-1"><strong>Your reading list is empty</strong>Tap the bookmark icon on any article to save it for later.</div>';
    return;
  }
  let all = [];
  try { all = await Data.listPublished(); }
  catch (err) { twShowError(grid, 'Could not load saved stories.', () => renderSavedPage()); return; }
  /* Keep the global list in sync so the "Go to article" button (and
     openArticle) can find these stories by id. */
  articles = all;
  const saved = all.filter(a => ids.indexOf(a.id) !== -1);
  if (!saved.length) {
    grid.innerHTML = '<div class="tw-error" style="grid-column:1/-1"><strong>Nothing saved here anymore</strong>Those articles may have been removed.</div>';
    return;
  }
  grid.innerHTML = '';
  saved.forEach(a => {
    const el = document.createElement('article');
    el.className = 'article';
    el.setAttribute('tabindex','0');
    el.setAttribute('role','button');
    el.innerHTML = buildArticleCard(a) + twSavedButtonHtml(a.id);
    el.addEventListener('click', (e) => {
      if (e.target.closest('.tw-save-btn')) return;
      openArticle(a.id);
    });
    grid.appendChild(el);
  });
  twWireSaveButtons(grid);
}
// ---------- Drag & drop / paste image ----------
function twHandlePastedImage(file) {
  if (!file || !file.type.startsWith('image/')) return;
  // Determine target: which panel is active
  const activePanel = document.querySelector('.admin-section.active');
  if (!activePanel) return;
  const panelId = activePanel.id;

  if (panelId === 'panel-new') {
    // Article thumbnail
    const r = new FileReader();
    r.onload = ev => { setThumbnail(ev.target.result, file.name); window.__pendingThumbFile = file; };
    r.readAsDataURL(file);
    toast('Thumbnail loaded');
    return;
  }
  if (panelId === 'panel-releases') {
    const r = new FileReader();
    r.onload = ev => { pendingReleaseCover = { file, dataUrl: ev.target.result }; renderReleaseCoverPreview(); };
    r.readAsDataURL(file);
    toast('Cover loaded');
    return;
  }
  if (panelId === 'panel-videos') {
    const r = new FileReader();
    r.onload = ev => { pendingVideoThumb = { file, dataUrl: ev.target.result }; renderVideoThumbPreview(); };
    r.readAsDataURL(file);
    toast('Thumbnail loaded');
    return;
  }
  if (panelId === 'panel-memoriam') {
    const r = new FileReader();
    r.onload = ev => { pendingMemoriamPhoto = { file, dataUrl: ev.target.result }; renderMemoriamPhotoPreview(); };
    r.readAsDataURL(file);
    toast('Photo loaded');
    return;
  }
}

// Paste
document.addEventListener('paste', e => {
  if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
    // Only intercept if a real image is on the clipboard
    const items = (e.clipboardData && e.clipboardData.items) || [];
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); twHandlePastedImage(file); return; }
      }
    }
  }
});

// Drag & drop
let twDragCounter = 0;
document.addEventListener('dragenter', e => {
  if (!e.target.closest('.admin-section.active')) return;
  twDragCounter++;
  const panel = document.querySelector('.admin-section.active');
  if (panel) panel.classList.add('drag-over');
});
document.addEventListener('dragover', e => {
  if (e.target.closest('.admin-section.active')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
});
document.addEventListener('dragleave', e => {
  if (!e.target.closest('.admin-section.active')) return;
  twDragCounter = Math.max(0, twDragCounter - 1);
  if (twDragCounter === 0) {
    const panel = document.querySelector('.admin-section.active');
    if (panel) panel.classList.remove('drag-over');
  }
});
document.addEventListener('drop', e => {
  twDragCounter = 0;
  const panel = document.querySelector('.admin-section.active');
  if (panel) panel.classList.remove('drag-over');
  if (!e.target.closest('.admin-section.active')) return;
  const files = (e.dataTransfer && e.dataTransfer.files) || [];
  for (const file of files) {
    if (file.type && file.type.startsWith('image/')) {
      e.preventDefault();
      twHandlePastedImage(file);
      return;
    }
  }
});
// ---------- Error & offline handling ----------
function twShowError(container, msg, onRetry) {
  if (!container) return;
  const btn = onRetry ? '<button class="btn btn-ghost btn-sm" id="twRetryBtn">Retry</button>' : '';
  container.innerHTML = `<div class="tw-error"><strong>${esc(msg || 'Something went wrong')}</strong>Check your connection and try again.${btn}</div>`;
  const b = container.querySelector('#twRetryBtn');
  if (b && onRetry) b.addEventListener('click', () => { container.innerHTML = twSkelGrid(6); onRetry(); });
}
function twInitOfflineBanner() {
  if (document.getElementById('twOfflineBanner')) return;
  const b = document.createElement('div');
  b.id = 'twOfflineBanner';
  b.className = 'tw-offline-banner';
  b.textContent = 'You are offline. Some content may not load.';
  document.body.appendChild(b);
  const update = () => b.classList.toggle('show', !navigator.onLine);
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// ---------- Service worker + install prompt ----------
/* The offline banner above only *reports* a lost connection. The service
   worker is what makes the site actually open and stay readable without one,
   and it is also the condition Chrome attaches to its automatic install
   prompt (a fetch handler - Chrome 108+/112+ dropped that requirement for
   installs from the browser menu, but not for the prompt itself). */
function twRegisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // A worker on localhost is useful for testing; anywhere else it must be HTTPS.
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[The Work] Service worker registration failed:', err && err.message);
    });
  });
}

const TW_INSTALL_DISMISSED = 'tw_install_dismissed';
let twInstallEvent = null;       // the deferred beforeinstallprompt event
let twInstallEngaged = false;    // has the reader actually used the site yet
let twInstallShown = false;

function twIsStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true;
}

function twIsIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports itself as a Mac, distinguished only by touch points.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/* On iOS only Safari can add to the home screen - Chrome, Firefox and Edge are
   all WebKit wrappers that cannot. Telling an iOS Chrome user to "tap Share"
   would send them looking for a control their browser does not have. */
function twIsIOSSafari() {
  const ua = navigator.userAgent || '';
  return twIsIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

function twInstallDismissed() {
  try { return localStorage.getItem(TW_INSTALL_DISMISSED) === '1'; } catch (e) { return false; }
}

function twDismissInstall() {
  try { localStorage.setItem(TW_INSTALL_DISMISSED, '1'); } catch (e) {}
  const el = document.getElementById('twInstall');
  if (el) {
    el.classList.remove('show');
    window.setTimeout(() => el.remove(), 320);
  }
}

function twBuildInstallUI() {
  if (document.getElementById('twInstall')) return;
  const el = document.createElement('div');
  el.id = 'twInstall';
  el.className = 'tw-install';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Install The Work');

  const shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/></svg>';
  // iOS has no install event, so those readers get the manual route instead.
  const body = twIsIOSSafari()
    ? `<p class="tw-install-text">Add The Work to your home screen for the latest stories, one tap away.</p>
       <p class="tw-install-steps">Tap ${shareIcon} <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</p>`
    : `<p class="tw-install-text">Install The Work for faster loading and offline reading.</p>`;

  el.innerHTML = `
    <img class="tw-install-icon" src="logo-tw-128.webp" width="44" height="27" alt="" decoding="async">
    <div class="tw-install-body">
      <div class="tw-install-title">The Work</div>
      ${body}
    </div>
    <div class="tw-install-actions">
      ${twIsIOSSafari() ? '' : '<button class="btn btn-primary btn-sm" id="twInstallGo" type="button">Install</button>'}
      <button class="tw-install-close" id="twInstallNo" type="button" aria-label="Not now">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`;
  document.body.appendChild(el);

  document.getElementById('twInstallNo').addEventListener('click', twDismissInstall);
  const go = document.getElementById('twInstallGo');
  if (go) {
    go.addEventListener('click', async () => {
      if (!twInstallEvent) return;
      twInstallEvent.prompt();
      let choice = null;
      try { choice = await twInstallEvent.userChoice; } catch (e) {}
      twInstallEvent = null;
      /* Chrome only allows a deferred prompt to be shown once, so the card goes
         either way. But the two outcomes are not the same "no": declining the
         X means don't ask again, while backing out of Chrome's own dialog is a
         soft no that should not permanently cost them the offer. */
      if (choice && choice.outcome === 'accepted') {
        twDismissInstall();                       // appinstalled confirms it
        toast('Installing The Work');
      } else {
        twHideInstallForSession();
      }
    });
  }
}

/* Hide without writing the permanent flag, so a reader who backs out of
   Chrome's dialog can still be offered the install on a later visit. */
function twHideInstallForSession() {
  twInstallShown = true;
  const el = document.getElementById('twInstall');
  if (el) {
    el.classList.remove('show');
    window.setTimeout(() => el.remove(), 320);
  }
}

function twMaybeShowInstall() {
  if (twInstallShown || !twInstallEngaged) return;
  if (twIsStandalone() || twInstallDismissed()) return;
  // Nothing to offer unless Chrome deferred a prompt, or this is iOS Safari
  // where the manual instructions are the only route.
  if (!twInstallEvent && !twIsIOSSafari()) return;
  twInstallShown = true;
  twBuildInstallUI();
  requestAnimationFrame(() => {
    const el = document.getElementById('twInstall');
    if (el) el.classList.add('show');
  });
}

/* Engagement gate: readers install a publication they are already reading, not
   one they just landed on. Opening a story or scrolling a fair way counts. */
function twNoteEngagement() {
  if (twInstallEngaged) return;
  twInstallEngaged = true;
  window.setTimeout(twMaybeShowInstall, 1200);
}

function twInitInstall() {
  if (twIsStandalone()) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // suppress Chrome's own mini-infobar
    twInstallEvent = e;
    twMaybeShowInstall();
  });

  window.addEventListener('appinstalled', () => {
    twInstallEvent = null;
    twInstallShown = true;
    try { localStorage.setItem(TW_INSTALL_DISMISSED, '1'); } catch (e) {}
    const el = document.getElementById('twInstall');
    if (el) el.remove();
    toast('The Work installed');
  });

  // Opening a story is the strongest signal.
  window.addEventListener('tw:article-open', twNoteEngagement);

  // Otherwise, a reader who scrolls a good way down the homepage counts.
  let scrollTicks = 0;
  window.addEventListener('scroll', () => {
    if (twInstallEngaged) return;
    scrollTicks++;
    if (scrollTicks < 12) return;
    const scrolled = window.scrollY + window.innerHeight;
    const height = document.documentElement.scrollHeight;
    if (height > 0 && scrolled / height > 0.45) twNoteEngagement();
  }, { passive: true });
}

// ---------- Loading skeletons ----------
function twSkelCard() {
  return '<div class="tw-skel-card"><div class="tw-skel tw-skel-thumb"></div><div class="tw-skel-body"><div class="tw-skel tw-skel-title"></div><div class="tw-skel tw-skel-text"></div><div class="tw-skel tw-skel-text short"></div><div class="tw-skel tw-skel-foot"></div></div></div>';
}
function twSkelGrid(count) {
  return '<div class="tw-skel-grid">' + Array.from({length: count || 6}, twSkelCard).join('') + '</div>';
}
function twSkelHome() {
  return `
    <div style="display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:clamp(24px,3vw,40px)" class="tw-skel-home">
      <div>
        <div class="tw-skel tw-skel-lead"></div>
        <div class="tw-skel tw-skel-title" style="height:26px;margin-top:20px;width:85%"></div>
        <div class="tw-skel tw-skel-title" style="height:26px;margin-top:8px;width:60%"></div>
        <div class="tw-skel tw-skel-text" style="margin-top:14px"></div>
        <div class="tw-skel tw-skel-text short"></div>
      </div>
      <div class="tw-skel-sidebar">
        ${Array.from({length:4}).map(() => '<div class="tw-skel-side-item"><div class="tw-skel tw-skel-side-thumb"></div><div class="tw-skel-side-body"><div class="tw-skel tw-skel-title" style="height:12px;width:40%"></div><div class="tw-skel tw-skel-text"></div><div class="tw-skel tw-skel-text short"></div></div></div>').join('')}
      </div>
    </div>
    <style>@media(max-width:900px){.tw-skel-home{grid-template-columns:1fr !important}}</style>
  `;
}


// ---------- form reactivity (sub-category dropdown + author hint) ----------
/* The word-count meter and its min/max validation were removed entirely.
   What remains is just the reactive plumbing that keeps the sub-category
   dropdown and the Author "optional/*" hint in sync with the Section field. */
function updateBodyMeter() {
  const catEl = document.getElementById('fCat');

  const subcatField = document.getElementById('fSubcatField');
  const subcatSel = document.getElementById('fSubcat');
  if (subcatField && subcatSel) {
    const section = catEl ? catEl.value : '';
    const opts = SUBCAT_OPTIONS[section] || [];
    if (opts.length) {
      const currentVal = subcatSel.value;
      subcatSel.innerHTML = '<option value="">—</option>' +
        opts.map(o => `<option value="${o.id}">${o.label}</option>`).join('');
      if (opts.some(o => o.id === currentVal)) subcatSel.value = currentVal;
      subcatField.style.display = '';
    } else {
      subcatField.style.display = 'none';
      subcatSel.value = '';
    }
  }

  const authorHint = document.getElementById('fAuthorHint');
  if (authorHint) {
    const section = catEl ? catEl.value : '';
    const sub = subcatSel ? subcatSel.value : '';
    const opt = section === 'news' || (section === 'opinion' && (sub === 'editorial' || sub === 'standpoints'));
    authorHint.textContent = opt ? 'optional' : '*';
  }
}
document.addEventListener('change', e => {
  if (e.target && e.target.id === 'fCat') updateBodyMeter();
  if (e.target && e.target.id === 'fSubcat') updateBodyMeter();
});

function resetForm() {
  editingId = null;
  window.__pendingThumbFile = null;
  safeAllArticles();
  $('#articleForm').reset();
  $('#fId').value = '';
  $('#fDate').value = todayISO();
  $('#fRead').value = '';
  $('#fPublishAt').value = '';
  if ($('#fSubcat')) $('#fSubcat').value = '';
  $('#fStatus').value = 'published';
  $('#fFeatured').checked = false;
    $('#fPhoto2').value = '';
  $('#fPhotoCourtesy').value = '';
  $('#fLayout2').value = '';
  $('#fGraphics').value = '';
  $('#editorTitle').textContent = 'New article';
  $('#deleteBtn').style.display = 'none';
  setThumbnail(null);
  twClearDraft('new');
  twStartDraftTimer();
  if (typeof updateBodyMeter === 'function') updateBodyMeter();
}

function loadIntoForm(id) {
  const allArticles = safeAllArticles();
  const a = allArticles.find(x => x.id === id);
  if (!a) return;
  editingId = id;
  window.__pendingThumbFile = null;
  $('#fId').value = id;
  $('#fTitle').value = a.title || '';
  $('#fCat').value = a.cat || '';
    if ($('#fSubcat')) $('#fSubcat').value = a.subcat || '';
  $('#fAuthor').value = a.author || '';
  $('#fAuthor2').value = a.author2 || '';
  $('#fPhoto').value = a.photojournalist || '';
  $('#fPhoto2').value = a.photojournalist_2 || '';
  $('#fPhotoCourtesy').value = a.photo_courtesy || '';
  $('#fLayout').value = a.layout_by || '';
  $('#fLayout2').value = a.layout_by_2 || '';
  $('#fGraphics').value = a.graphics_by || '';
  $('#fDate').value = a.date || todayISO();
  $('#fRead').value = a.read || '';
  $('#fPublishAt').value = a.publish_at ? toLocalDateTimeInput(a.publish_at) : '';
  $('#fExcerpt').value = a.excerpt || '';
  $('#fBody').value = a.body || '';
  $('#fStatus').value = a.status || 'published';
  $('#fFeatured').checked = !!a.featured;
  setThumbnail(a.thumbnail || null, a.thumbnail ? 'current.jpg' : '');
  $('#editorTitle').textContent = 'Edit article';
  $('#deleteBtn').style.display = 'inline-flex';
  twStartDraftTimer();
  twOfferDraft(id);
  if (typeof updateBodyMeter === 'function') updateBodyMeter();
}

$('#articleForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!session) { toast('Please sign in first.', true); return; }

  const title = $('#fTitle').value.trim();
  const cat = $('#fCat').value;
  const author = $('#fAuthor').value.trim();
  const body = $('#fBody').value.trim();
  const excerpt = $('#fExcerpt').value.trim();
  const status = $('#fStatus').value;
  const missing = [];
  const subcat = ($('#fSubcat') && $('#fSubcat').value) ? $('#fSubcat').value : '';
  const noAuthorRequired = cat === 'news' || (cat === 'opinion' && (subcat === 'editorial' || subcat === 'standpoints'));

  if (!title) missing.push('title');
  if (!cat) missing.push('section');
  if (!author && !noAuthorRequired) missing.push('author');
  if (!body) missing.push('body');
  if (status === 'published' && !excerpt && !noAuthorRequired) missing.push('excerpt');

  if (missing.length) {
    toast('Missing required fields: ' + missing.join(', '), true);
    return;
  }

  const btn = $('#saveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    let thumbnail = pendingThumbnail;
    const pendingFile = safePendingThumbFile();
    if (pendingFile) {
      thumbnail = await Data.uploadThumb(pendingFile);
      window.__pendingThumbFile = null;
    }
    const payload = {
      id: editingId || uid(),
      title, cat, author,
      subcat: ($('#fSubcat') && $('#fSubcat').value) ? $('#fSubcat').value : null,
      author2: $('#fAuthor2').value.trim() || null,
      photojournalist: $('#fPhoto').value.trim() || null,
      photojournalist_2: $('#fPhoto2').value.trim() || null,
      photo_courtesy: $('#fPhotoCourtesy').value.trim() || null,
      layout_by: $('#fLayout').value.trim() || null,
      layout_by_2: $('#fLayout2').value.trim() || null,
      graphics_by: $('#fGraphics').value.trim() || null,
      date: $('#fDate').value || todayISO(),
      read: $('#fRead').value.trim() || '1 min',
      publish_at: $('#fPublishAt').value ? new Date($('#fPublishAt').value).toISOString() : null,
      excerpt: $('#fExcerpt').value.trim(),
      body: $('#fBody').value.trim(),
      status: $('#fStatus').value,
      featured: $('#fFeatured').checked,
      thumbnail: thumbnail || null,
      updated: new Date().toISOString()
    };
    if (payload.featured) {
      const allArticles = safeAllArticles();
      const others = allArticles.filter(a => a.id !== payload.id && a.featured);
      for (const o of others) {
        try { await Data.upsert({ ...o, featured: false }); } catch(e) { console.warn(e); }
      }
    }
    await Data.upsert(payload);
    await refreshPublicArticleState();
    twClearDraft(payload.id);
    twStopDraftTimer();
    toast(editingId ? 'Updated' : 'Created');
    resetForm();
    const currentRoute = (location.hash || '#/').toLowerCase();
    if (currentRoute === '#/' || currentRoute === '#/home' || currentRoute === '#/saved') {
      await renderHome();
    }
    location.hash = '#/admin';
    setTimeout(() => setPanel('articles'), 60);
    await renderAdmin();
  } catch (err) {
    toast('Save failed: ' + safeErrorText(err), true);
  } finally {
    btn.disabled = false; btn.textContent = 'Save article';
  }
});

$('#deleteBtn').addEventListener('click', () => {
  if (!editingId) return;
  const allArticles = Array.isArray(window.__allArticles) ? window.__allArticles : [];
  const a = allArticles.find(x => x.id === editingId);
  openConfirm('Move to trash?', `"${a ? a.title : 'This'}" will be moved to trash. You can restore it within 30 days.`, async () => {
    try {
      await Data.remove(editingId);
      resetForm();
      await renderAdmin();
      setPanel('articles');
      toast('Moved to trash');
    } catch (err) { toast('Failed: ' + safeErrorText(err), true); }
  });
});

async function renderTrashAdmin() {
  const el = $('#trashList');
  if (!el) return;
  const list = await Data.listTrashed();
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:56px 24px;color:var(--ink-3);font-family:var(--sans);font-size:.88rem">Trash is empty.</div>';
    return;
  }
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  el.innerHTML = list.map(a => {
    const deleted = a.deleted_at ? new Date(a.deleted_at).getTime() : now;
    const daysLeft = Math.max(0, 30 - Math.floor((now - deleted) / (24 * 60 * 60 * 1000)));
    const expired = (now - deleted) > THIRTY_DAYS;
    const thumbHtml = a.thumbnail ? imgTag(a.thumbnail, [96], '', ' alt="" loading="lazy" decoding="async"') : esc((CAT_LABELS[a.cat]||'?').charAt(0));
    return `
      <div class="release-list-item">
        <div class="release-list-cover" style="width:60px;height:60px;border-radius:8px">${thumbHtml}</div>
        <div class="release-list-info">
          <h4>${esc(a.title)}</h4>
          <small>${esc(CAT_LABELS[a.cat]||a.cat)} · deleted ${timeAgo(a.deleted_at)} · <span style="color:${expired ? '#DC2626' : 'var(--ink-3)'}">${expired ? 'expired' : daysLeft + 'd left'}</span></small>
        </div>
        <div class="release-list-actions">
          <button class="btn btn-ghost btn-sm" data-trash-restore="${esc(a.id)}">Restore</button>
          ${currentRole === 'dev' ? `<button class="icon-action danger" data-trash-purge="${esc(a.id)}" title="Delete permanently">✕</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('[data-trash-restore]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await Data.restore(btn.dataset.trashRestore);
        toast('Article restored');
        await renderTrashAdmin();
        await renderAdmin();
      } catch (err) { toast('Failed: ' + safeErrorText(err), true); }
    });
  });
  el.querySelectorAll('[data-trash-purge]').forEach(btn => {
    btn.addEventListener('click', () => {
      openConfirm('Delete permanently?', 'This cannot be undone. The article is gone forever.', async () => {
        try {
          await Data.hardRemove(btn.dataset.trashPurge);
          toast('Permanently deleted');
          await renderTrashAdmin();
        } catch (err) { toast('Failed: ' + safeErrorText(err), true); }
      });
    });
  });
}

function setPanel(name, skipReset) {
  if (name === 'back') { location.hash = '#/'; return; }
  if (!canAccess(name)) { name = 'dashboard'; }
  if (name === 'new' && !skipReset) resetForm();
  if (name === 'releases') hideReleaseForm();
  if (name === 'videos') hideVideoForm();
  if (name === 'memoriam') hideMemoriamForm();
  if (name === 'new') twStartDraftTimer();
  else twStopDraftTimer();
  $$('.admin-section').forEach(s => s.classList.remove('active'));
  const el = $('#panel-' + name);
  if (el) el.classList.add('active');
  $$('.admin-nav button').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
  const url = '#/admin' + (name !== 'dashboard' ? '/' + name : '');
  if (location.hash !== url) history.replaceState(null, '', url);
  if (name === 'settings') renderColorGrid();
  if (name === 'board') renderBoardAdmin();
  if (name === 'releases') renderReleasesAdmin();
  if (name === 'videos') renderVideosAdmin();
  if (name === 'memoriam') renderMemoriamAdmin();
  if (name === 'trash') renderTrashAdmin();
  if (name === 'permissions') renderPermissions();
  if (name === 'roster') renderRosterAdmin();
}

function showBoardMemberForm(m) {
  $('#boardMemberFormPanel').style.display = 'block';
  $('#newBoardMemberBtn').style.display = 'none';
  const gList = document.getElementById('bmGroups');
  const sList = document.getElementById('bmSubgroups');
  if (gList) gList.innerHTML = [...new Set(boardMembers.map(x => x.group).filter(Boolean))].map(v => `<option value="${esc(v)}">`).join('');
  if (sList) sList.innerHTML = [...new Set(boardMembers.map(x => x.subgroup).filter(Boolean))].map(v => `<option value="${esc(v)}">`).join('');
  if (m) {
    $('#bmId').value = m.id || '';
    $('#bmName').value = m.name || '';
    $('#bmRole').value = m.role || '';
    $('#bmGroup').value = m.group || '';
    $('#bmSubgroup').value = m.subgroup || '';
    $('#bmProgram').value = m.program || '';
    $('#bmInitials').value = m.initials || '';
    $('#bmSort').value = m.sort_order != null ? m.sort_order : 100;
    $('#boardMemberFormTitle').textContent = 'Edit member';
  } else {
    $('#boardMemberForm').reset();
    $('#bmId').value = '';
    $('#bmSort').value = '100';
    $('#boardMemberFormTitle').textContent = 'New member';
  }
  setTimeout(() => $('#bmName').focus(), 60);
}

function hideBoardMemberForm() {
  $('#boardMemberFormPanel').style.display = 'none';
  $('#newBoardMemberBtn').style.display = 'inline-flex';
  $('#boardMemberForm').reset();
  $('#bmId').value = '';
}

function renderRosterAdmin() {
  const el = $('#boardMemberList');
  if (!el) return;
  if (!boardMembers.length) {
    el.innerHTML = '<div style="text-align:center;padding:56px 24px;color:var(--ink-3);font-family:var(--sans);font-size:.88rem">No members yet.</div>';
    return;
  }
  const groups = {};
  boardMembers.forEach(m => {
    const g = m.group || 'Uncategorized';
    (groups[g] = groups[g] || []).push(m);
  });
  el.innerHTML = Object.keys(groups).map(g => `
    <div style="margin-bottom:20px">
      <h4 style="font-family:var(--sans);font-size:.7rem;font-weight:750;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-4);margin:0 0 10px">${esc(g)} <span style="color:var(--accent)">· ${groups[g].length}</span></h4>
      ${groups[g].map(m => `
        <div class="release-list-item">
          <div class="release-list-cover" style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-family:var(--serif);font-weight:900;color:#fff;font-size:.9rem">${esc(m.initials || (m.name||'?').charAt(0))}</div>
          <div class="release-list-info">
            <h4>${esc(m.name)}</h4>
            <small>${esc(m.role)}${m.subgroup ? ' · ' + esc(m.subgroup) : ''}${m.program ? ' · ' + esc(m.program) : ''} · <span style="color:var(--ink-4)">sort ${esc(String(m.sort_order || 0))}</span></small>
          </div>
          <div class="release-list-actions">
            <button class="icon-action" data-bm-edit="${esc(m.id)}" title="Edit">✎</button>
            <button class="icon-action danger" data-bm-del="${esc(m.id)}" title="Delete">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

document.addEventListener('click', e => {
  if (e.target.closest('#newBoardMemberBtn')) { showBoardMemberForm(null); return; }
  if (e.target.closest('#bmCancelBtn')) { hideBoardMemberForm(); return; }
  const ed = e.target.closest('[data-bm-edit]');
  if (ed) {
    const m = boardMembers.find(x => String(x.id) === String(ed.dataset.bmEdit));
    if (m) showBoardMemberForm(m);
    return;
  }
  const dl = e.target.closest('[data-bm-del]');
  if (dl) {
    const m = boardMembers.find(x => String(x.id) === String(dl.dataset.bmDel));
    openConfirm('Remove member?', `"${m ? m.name : 'This member'}" will be removed from the Editorial Board page.`, async () => {
      try {
        await Data.removeBoardMember(dl.dataset.bmDel);
        boardMembers = boardMembers.filter(x => String(x.id) !== String(dl.dataset.bmDel));
        renderRosterAdmin(); renderBoard(); populateBoardNames();
        toast('Member removed');
      } catch (err) { toast('Failed: ' + safeErrorText(err), true); }
    });
  }
});

$('#boardMemberForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!session) { toast('Please sign in first.', true); return; }
  const name = $('#bmName').value.trim();
  const role = $('#bmRole').value.trim();
  const group = $('#bmGroup').value.trim();
  if (!name || !role || !group) { toast('Name, role, and department are required', true); return; }
  const btn = $('#bmSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const payload = {
      id: $('#bmId').value || undefined,
      name,
      role,
      group,
      subgroup: $('#bmSubgroup').value.trim() || null,
      program: $('#bmProgram').value.trim() || null,
      initials: $('#bmInitials').value.trim() || null,
      sort_order: parseInt($('#bmSort').value, 10) || 100
    };
    await Data.upsertBoardMember(payload);
    boardMembers = await Data.listBoardMembers();
    /* A rename moved the photo row's key in the DB; the in-memory map still
       has the old key, so force a re-fetch before re-rendering. */
    boardPhotosPromise = null;
    await ensureBoardPhotos();
    hideBoardMemberForm();
    renderRosterAdmin(); renderBoard(); populateBoardNames();
    toast(payload.id ? 'Member updated' : 'Member added');
  } catch (err) {
    toast('Save failed: ' + safeErrorText(err), true);
  } finally {
    btn.disabled = false; btn.textContent = 'Save member';
  }
});

function renderPermissions() {
  const el = document.getElementById('permissionsTable');
  if (!el) return;
  const rows = [
    ['Manage Articles',        'Full',    'Full',    'Full'],
    ['Manage Videos',          'Full',    'Full',    'Full'],
    ['Manage Archives',        'Full',    'Full',    'No access'],
    ['Manage Look Back',       'Full',    'Full',    'No access'],
    ['Manage Board Photos',    'Full',    'Full',    'No access'],
    ['Edit EB Roster',         'Full',    'Full',    'No access'],
    ['Restore from Trash',     'Full',    'Yes',     'No access'],
    ['Permanently Delete',     'Yes',     'No',      'No'],
    ['Brand Colors / Settings','Full',    'Full',    'Full'],
    ['Manage Users',           'Full',    'No',      'No']
  ];
  el.innerHTML = `
    <table>
      <thead><tr>
        <th>Capability</th>
        <th>Dev</th>
        <th>EB</th>
        <th>Member</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

document.addEventListener('click', e => {
  const gotoBtn = e.target.closest('[data-goto]');
  if (gotoBtn) { setPanel(gotoBtn.dataset.goto); return; }
  const navBtn = e.target.closest('.admin-nav button');
  if (navBtn) { setPanel(navBtn.dataset.panel); return; }
});

document.addEventListener('click', e => {
  const up = e.target.closest('[data-upload-board]');
  if (up) { pendingBoardUpload = up.dataset.uploadBoard; $('#boardPhotoInput').click(); return; }
  const rm = e.target.closest('[data-remove-board]');
  if (rm) {
    const name = rm.dataset.removeBoard;
    openConfirm('Remove photo?', `Photo for "${name}" will be removed.`, async () => {
      try {
        await Data.deleteBoardPhoto(name);
        delete boardPhotos[name];
        renderBoardAdmin(); renderBoard();
        toast('Removed');
      } catch (err) { toast('Failed: ' + safeErrorText(err), true); }
    });
  }
});

$('#boardPhotoInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file || !pendingBoardUpload) return;
  const name = pendingBoardUpload;
  pendingBoardUpload = null;
  openCropModal(file, name);
  e.target.value = '';
});

$('#tableContainer').addEventListener('click', async e => {
  const v = e.target.closest('[data-view]');
  if (v) {
    const a = (window.__allArticles || []).find(x => x.id === v.dataset.view);
    if (a) { articles = [a]; openArticle(a.id); }
    return;
  }
  const ed = e.target.closest('[data-edit]');
  if (ed) { setPanel('new', true); loadIntoForm(ed.dataset.edit); window.scrollTo(0,0); return; }
  const dl = e.target.closest('[data-del]');
  if (dl) {
    const a = (window.__allArticles || []).find(x => x.id === dl.dataset.del);
    openConfirm('Move to trash?', `"${a ? a.title : 'This'}" will be moved to trash. You can restore it within 30 days.`, async () => {
      try {
        await Data.remove(dl.dataset.del);
        await renderAdmin();
        toast('Moved to trash');
      } catch (err) { toast('Failed: ' + safeErrorText(err), true); }
    });
  }
});

$('#recentList').addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]');
  if (ed) { setPanel('new', true); loadIntoForm(ed.dataset.edit); window.scrollTo(0,0); }
});

$('#searchInput').addEventListener('input', e => { searchQuery = e.target.value; renderTable(); });
$('#statusFilter').addEventListener('change', e => { statusFilter = e.target.value; renderTable(); });
$('#catFilter').addEventListener('change', e => { catFilter = e.target.value; renderTable(); });

document.addEventListener('input', e => {
  if (!e.target || !e.target.closest || !e.target.closest('#articleForm')) return;
  twSaveDraft();
});

document.addEventListener('change', e => {
  if (!e.target || !e.target.closest || !e.target.closest('#articleForm')) return;
  twSaveDraft();
});

document.addEventListener('change', e => {
  const row = e.target.closest('.row-check');
  if (!row) {
    const all = e.target.closest('#selectAllRows');
    if (!all) return;
    const checked = all.checked;
    const visible = $$('.row-check');
    visible.forEach(input => {
      const id = input.dataset.rowId;
      if (!id) return;
      if (checked) selectedIds.add(id); else selectedIds.delete(id);
      input.checked = checked;
    });
    updateBulkBar();
    return;
  }
  const id = row.dataset.rowId;
  if (!id) return;
  if (row.checked) selectedIds.add(id); else selectedIds.delete(id);
  updateBulkBar();
});

document.addEventListener('click', e => {
  const bulk = e.target.closest('[data-bulk]');
  if (!bulk) return;
  const action = bulk.dataset.bulk;
  if (action === 'publish') bulkUpdate('published');
  else if (action === 'draft') bulkUpdate('draft');
  else if (action === 'delete') bulkDelete();
});

window.addEventListener('beforeunload', () => twSaveDraft());

$$('.section-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.section-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-pressed','false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-pressed','true');
    activeFilter = tab.dataset.filter;
    renderHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
$$('.archive-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.archive-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-pressed','false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-pressed','true');
    // If this tab has a video category, switch the videos list instead of releases
    if (tab.dataset.videoCat) {
      videoCatFilter = tab.dataset.videoCat;
      renderVideosPage();
      return;
    }
    archiveFilter = tab.dataset.filter;
    renderReleasesPage();
  });
});
$$('.subcat-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.subcat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    newsSubcat = tab.dataset.subcat || 'all';
    renderHome();
  });
});
$$('.sort-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.sort-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected','true');
    homeSort = tab.dataset.sort;
    renderHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

const searchBar = document.getElementById('searchBar');
if (searchBar) {
  searchBar.addEventListener('input', e => {
    searchTerm = e.target.value.trim().toLowerCase();
    renderHome();
  });
  searchBar.addEventListener('keydown', e => {
    if (e.key === 'Escape') { searchBar.value = ''; searchTerm = ''; renderHome(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault(); searchBar.focus();
    }
  });
}

async function route() {
  setNavMenu(false);
  const directStoryId = storyRouteId();
  if (directStoryId && location.hash) {
    history.replaceState(null, '', `/${location.hash}`);
  } else if (directStoryId) {
    if (modalOpen) closeArticle(false);
    const storyView = $('#view-story');
    if (!storyView || storyView.dataset.serverStory !== 'true') {
      const published = await Data.listPublished();
      articles = published;
      const story = published.find(a => String(a.id) === directStoryId);
      if (!story) {
        setView('home');
        await renderHome();
        return;
      }
      renderStoryPage(story);
    }
    setView('story');
    updateArticleMeta({
      id: directStoryId,
      title: document.querySelector('#view-story h1')?.textContent || 'The Work',
      excerpt: document.querySelector('#view-story .story-deck')?.textContent || '',
      thumbnail: document.querySelector('#view-story .story-hero img')?.src || ''
    });
    updateAuthUI();
    return;
  } else if (modalOpen) {
    closeArticle(false);
  }

  const hash = location.hash || '#/';
  const path = hash.replace('#', '') || '/';

  if (path.startsWith('/admin')) {
    await sessionReady;
    if (!session) {
      history.replaceState(null, '', '#/');
      setView('home');
      await renderHome();
      updateAuthUI();
      $('#loginOverlay').classList.add('open');
      return;
    }
    setView('admin');
    const parts = path.split('/');
    const sub = parts[2] || 'dashboard';
    setPanel(['dashboard','articles','releases','videos','memoriam','board','roster','new','settings','trash','permissions'].includes(sub) ? sub : 'dashboard');
    await renderAdmin();
    if (sub === 'board') ensureBoardPhotos();
    updateAuthUI();
    return;
  }

  const routeName = path === '/' || path === '/home' ? 'home' : path.slice(1);
  setView(['home','releases','board','about','videos','memoriam','saved','404'].includes(routeName) ? routeName : '404');
  if (routeName === 'saved') { await renderSavedPage(); updateAuthUI(); return; }
  if (routeName === '404') { updateAuthUI(); return; }
  if (routeName === 'home') {
    await renderHome();
    ensureReleasesPreview();
  }
  else if (routeName === 'releases') await renderReleasesPage();
  else if (routeName === 'videos') await renderVideosPage();
  else if (routeName === 'memoriam') await renderMemoriamPage();
  else if (routeName === 'board') {
    renderBoard();
    ensureBoardPhotos();
  }
  updateAuthUI();
}

async function init() {
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  twUpdateSavedUI();
  twInitOfflineBanner();
  twRegisterServiceWorker();
  twInitInstall();
  applyBrandColors();
  try {
    const loaded = await Data.listBoardMembers();
    if (Array.isArray(loaded) && loaded.length) boardMembers = loaded;
  } catch (e) { /* keep hardcoded fallback */ }
  populateBoardNames();

  $('#year').textContent = new Date().getFullYear();
  (function startLiveClock(){
    const el = $('#pubbarDate');
    if (!el) return;
    const tick = () => { el.textContent = fmtDateTimeLive(new Date()); };
    tick();
    const now = new Date();
    setTimeout(() => {
      tick();
      setInterval(tick, 60000);
    }, (60 - now.getSeconds()) * 1000);
  })();
  $('#fDate').value = todayISO();
  $('#fRead').value = '';
  $('#releaseDate').value = todayISO();
  setReleaseProvider('heyzine', { keepValue: true });

  twInitFade();
  if (document.body) {
    new MutationObserver(twScheduleFade).observe(document.body, { childList: true, subtree: true });
  }
  twScheduleFade();

  sessionReady = getSession().then(async s => {
    session = s;
    updateAuthUI();
    if (s) await loadRole();
    return s;
  }).catch(err => {
    session = null;
    updateAuthUI();
    console.warn('[The Work] Could not restore session', err);
    return null;
  });

  if (sb) {
    sb.auth.onAuthStateChange(async (_evt, s) => {
      session = s;
      updateAuthUI();
      if (s) await loadRole();
      else { currentRole = null; applyRoleUI(); }
    });
  }

  let routeFrame = null;
  const scheduleRoute = () => {
    if (routeFrame) cancelAnimationFrame(routeFrame);
    routeFrame = requestAnimationFrame(async () => {
      await route();
    });
  };
  window.addEventListener('hashchange', scheduleRoute);
  window.addEventListener('popstate', scheduleRoute);
  if ((location.hash || '#/').startsWith('#/admin')) await sessionReady;
  await route();
}

init();
})();
