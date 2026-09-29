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
const CAT_LABELS = { news:'News', editorial:'Editorial', opinion:'Opinion', features:'Features', literary:'Literary', sports:'Sports' };
const SECTION_ORDER = ['news','editorial','opinion','features','literary','sports'];
const RELEASE_CATEGORIES = [
  { id:'magazine',   label:'Magazine',       example:'Metanoia' },
  { id:'tabloid',    label:'Tabloid',        example:'' },
  { id:'newsletter', label:'Newsletter',     example:'' },
  { id:'literary',   label:'Literary Folio', example:'Obra' },
  { id:'minizine',   label:'Mini Zines',     example:'' }
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

  { group:'Art Department', subgroup:'Graphic Artists', name:'Benny Dick D. Paraso',        role:'Graphic Artist', program:'—',                                                              initials:'BP' },
  { group:'Art Department', subgroup:'Graphic Artists', name:'Reina Jyneh L. Sapigao',     role:'Graphic Artist', program:'Bachelor of Science in Architecture',                            initials:'RJ' },
  { group:'Art Department', subgroup:'Graphic Artists', name:'Nikka I. Salamanca',         role:'Graphic Artist', program:'Bachelor of Science in Environmental Science',                   initials:'NS' },
  { group:'Art Department', subgroup:'Artist',          name:'Stephaney Joy C. Sarmiento', role:'Artist',         program:'Bachelor of Science in Business Administration',                 initials:'SJ' },
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

let articles = [];
let releases = [];
const appCache = { publishedArticles: null, allArticles: null };
let session = null;
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
let releaseProvider = 'heyzine';
let archiveFilter = 'all';
let editingMemoriamId = null;
let pendingMemoriamPhoto = null;

const Data = {
  async listPublished() {
    if (appCache.publishedArticles) return appCache.publishedArticles.slice();
    if (!sb) {
      const result = JSON.parse(localStorage.getItem('tw_articles') || '[]').filter(a => a.status === 'published');
      appCache.publishedArticles = result;
      return result.slice();
    }
    const { data, error } = await sb.from('articles').select('*').eq('status','published').order('date',{ascending:false, nullsFirst:false});
    if (error) { console.error(error); return []; }
    appCache.publishedArticles = data || [];
    return appCache.publishedArticles.slice();
  },
  async listAll() {
    if (appCache.allArticles) return appCache.allArticles.slice();
    if (!sb) {
      const result = JSON.parse(localStorage.getItem('tw_articles') || '[]');
      appCache.allArticles = result;
      return result.slice();
    }
    const { data, error } = await sb.from('articles').select('*').order('updated',{ascending:false});
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
  async uploadThumb(file) {
    if (!sb) return await resizeImage(file, 900, 0.82);
    const blob = await resizeImageToBlob(file, 1400, 0.85);
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = Date.now() + '-' + Math.random().toString(36).slice(2,8) + '.' + ext;
    const { error } = await sb.storage.from('thumbnails').upload(path, blob, {
      contentType: blob.type,
      upsert: false,
      cacheControl: '31536000'
    });
    if (error) throw error;
    const { data } = sb.storage.from('thumbnails').getPublicUrl(path);
    return data.publicUrl;
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
  if (!sb) { const s = localStorage.getItem('tw_session'); return s ? JSON.parse(s) : null; }
  const { data } = await sb.auth.getSession();
  return data.session;
}
async function signIn(email, password) {
  if (!sb) {
    if (email === 'admin@thework.tsu' && password === 'admin123') {
      const s = { user: { email } };
      localStorage.setItem('tw_session', JSON.stringify(s));
      return { ok: true, session: s };
    }
    return { ok: false, error: 'Demo mode only' };
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data.session };
}
async function signOut() {
  if (!sb) { localStorage.removeItem('tw_session'); return; }
  await sb.auth.signOut();
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

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#iconSun').style.display = t==='dark'?'none':'block';
  $('#iconMoon').style.display = t==='dark'?'block':'none';
  try { localStorage.setItem('tw_theme', t); } catch(e){}
}
$('#themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

$('#burger').addEventListener('click', () => {
  const open = $('#navSections').classList.toggle('open');
  $('#burger').setAttribute('aria-expanded', String(open));
});
$('#navSections').addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    $('#navSections').classList.remove('open');
    $('#burger').setAttribute('aria-expanded','false');
  }
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 1140) {
    $('#navSections').classList.remove('open');
    $('#burger').setAttribute('aria-expanded', 'false');
  }
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
    toast('Welcome back');
    location.hash = '#/admin';
  } finally {
    btn.disabled = false; btn.textContent = 'Sign In';
  }
});
$('#logoutBtn').addEventListener('click', async () => { await signOut(); session = null; updateAuthUI(); location.hash = '#/'; toast('Signed out'); });
$('#signOutBtn').addEventListener('click', async () => { await signOut(); session = null; updateAuthUI(); location.hash = '#/'; toast('Signed out'); });
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
        ${article.thumbnail ? `<figure class="story-hero"><img src="${esc(article.thumbnail)}" alt="" fetchpriority="high" decoding="async"></figure>` : ''}
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
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value || '');
  };
  meta('meta[name="description"]', description);
  meta('meta[property="og:type"]', article ? 'article' : 'website');
  meta('meta[property="og:title"]', title);
  meta('meta[property="og:description"]', description);
  meta('meta[property="og:url"]', canonicalUrl);
  meta('meta[property="og:image"]', article && article.thumbnail ? article.thumbnail : `${location.origin}/logo-tw.png`);
  meta('link[rel="canonical"]', canonicalUrl, 'href');
}

function buildArticleCard(a) {
  const thumbHtml = a.thumbnail
    ? `<img src="${esc(a.thumbnail)}" alt="" loading="lazy">`
    : `<div class="article-thumb-text">${esc((CAT_LABELS[a.cat]||'?').charAt(0))}</div>`;
  const byline = a.author2
    ? `${a.author} & ${a.author2}`
    : (a.author || (a.cat === 'editorial' ? 'The Work' : 'Staff'));
  return `
    <div class="article-thumb">${thumbHtml}<span class="article-cat">${esc(CAT_LABELS[a.cat]||a.cat)}</span></div>
    <div class="article-body">
      <h3 class="article-title"><a data-story-link href="${esc(storyUrl(a))}">${esc(a.title)}</a></h3>
      <p class="article-excerpt">${esc(a.excerpt||(a.body||'').split('\n\n')[0]||'')}</p>
      <div class="article-foot">
        <span class="article-author"><span class="article-author-dot">${esc((a.author||'?').charAt(0))}</span>${esc(byline)}</span>
        <span>${esc(fmtDate(a.date))}${a.read?' · '+esc(a.read):''}</span>
      </div>
    </div>
  `;
}

async function renderHome() {
  const fpGrid = $('#frontpageGrid');
  fpGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--ink-3);font-family:var(--sans);font-size:.9rem">Loading stories…</div>';

  const published = await Data.listPublished();
  articles = published;

  let list = activeFilter === 'all' ? published : published.filter(a => a.cat === activeFilter);
  if (searchTerm) {
    list = list.filter(a => {
      const hay = ((a.title||'')+' '+(a.excerpt||'')+' '+(a.body||'')+' '+(a.author||'')+' '+(a.author2||'')+' '+(a.photojournalist||'')+' '+(a.layout_by||'')+' '+(a.layout_by_2||'')+' '+(a.graphics_by||'')+' '+(CAT_LABELS[a.cat]||'')).toLowerCase();
      return hay.includes(searchTerm);
    });
  }

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

  const lead = list[0];
  const sidebar = list.slice(1, 5);
  const gridArticles = list.slice(5);

  const leadThumbHtml = lead.thumbnail
    ? `<img src="${esc(lead.thumbnail)}" alt="" loading="eager" fetchpriority="high" decoding="async">`
    : `<div class="lead-story-thumb-text">${esc((CAT_LABELS[lead.cat]||'?').charAt(0))}</div>`;
  const leadByline = lead.author2
    ? `${lead.author} & ${lead.author2}`
    : (lead.author || (lead.cat === 'editorial' ? 'The Work' : 'Staff'));

  const sidebarHtml = sidebar.map(a => `
    <div class="sidebar-item editorial-note" data-article-id="${esc(a.id)}">
      <div class="sidebar-item-thumb">
        ${a.thumbnail ? `<img src="${esc(a.thumbnail)}" alt="" loading="lazy">` : esc((CAT_LABELS[a.cat]||'?').charAt(0))}
      </div>
      <div class="sidebar-item-content">
        <span class="sidebar-item-cat">${esc(CAT_LABELS[a.cat]||a.cat)}</span>
        <a class="sidebar-item-title" data-story-link href="${esc(storyUrl(a))}">${esc(a.title)}</a>
        <div class="sidebar-item-meta">${esc(a.author||'Staff')} · ${esc(fmtDate(a.date))}</div>
      </div>
    </div>
  `).join('');

  fpGrid.innerHTML = `
    <div class="lead-story editorial-hero" data-article-id="${esc(lead.id)}">
      <div class="lead-story-thumb">${leadThumbHtml}<span class="lead-story-cat">${esc(CAT_LABELS[lead.cat]||lead.cat)}</span></div>
      <h2 class="lead-story-title"><a data-story-link href="${esc(storyUrl(lead))}">${esc(lead.title)}</a></h2>
      <p class="lead-story-excerpt">${esc(lead.excerpt || (lead.body||'').split('\n\n')[0] || '')}</p>
      <div class="lead-story-meta">
        <span class="lead-story-byline">By ${esc(leadByline)}</span>
        <span>${esc(fmtDateLong(lead.date))}</span>
        ${lead.read ? `<span>${esc(lead.read)} read</span>` : ''}
      </div>
    </div>
    <aside class="sidebar-rail">
      <div class="sidebar-section-title">Latest <span>· ${published.length} total</span></div>
      <div class="sidebar-list">${sidebarHtml || '<p style="color:var(--ink-3);font-family:var(--sans);font-size:.85rem">No other stories yet.</p>'}</div>
    </aside>
  `;

  fpGrid.querySelectorAll('[data-article-id]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('a[data-story-link]')) e.preventDefault();
      openArticle(el.dataset.articleId);
    });
  });

  const moreSection = $('#moreStories');
  const grid = $('#articleGrid');
  if (gridArticles.length) {
    moreSection.style.display = 'block';
    grid.innerHTML = '';
    gridArticles.forEach(a => {
      const el = document.createElement('article');
      el.className = 'article editorial-card';
      el.innerHTML = buildArticleCard(a);
      el.addEventListener('click', e => {
        if (e.target.closest('a[data-story-link]')) e.preventDefault();
        openArticle(a.id);
      });
      grid.appendChild(el);
    });
  } else {
    moreSection.style.display = 'none';
  }

  const previewContainer = $('#sectionPreviews');
  previewContainer.innerHTML = '';
  if (activeFilter === 'all' && !searchTerm && published.length > 3) {
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
        el.className = 'article editorial-card';
        el.innerHTML = buildArticleCard(a);
        el.addEventListener('click', e => {
          if (e.target.closest('a[data-story-link]')) e.preventDefault();
          openArticle(a.id);
        });
        pGrid.appendChild(el);
      });
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
    ? `<img src="${esc(cover)}" alt="" loading="lazy">`
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
}

async function renderReleasesPage() {
  const grid = $('#releasesGrid');
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--ink-3);font-family:var(--sans);font-size:.9rem">Loading archives…</div>';
  releases = await Data.listPublishedReleases();
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
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--ink-3);font-family:var(--sans);font-size:.9rem">Loading videos…</div>';
  const list = await Data.listVideos();
  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--ink-3)"><h3 style="font-family:var(--serif);color:var(--ink-2);font-weight:500">No videos yet</h3><p style="font-family:var(--sans);font-size:.85rem">Broadcast segments and reels will appear here.</p></div>';
    return;
  }
  grid.innerHTML = list.map(v => {
    const thumb = v.thumbnail_url || youtubeThumb(v);
    return `
      <div class="video-card" data-video-id="${esc(v.id)}" role="button" tabindex="0">
        <div class="video-thumb">
          ${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : ''}
          <div class="video-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
        <div class="video-body">
          <h3>${esc(v.title)}</h3>
          ${v.description ? `<p>${esc(v.description)}</p>` : ''}
        </div>
      </div>`;
  }).join('');
  grid.querySelectorAll('[data-video-id]').forEach(el => {
    el.addEventListener('click', () => openVideo(el.dataset.videoId, list));
  });
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
        ${m.photo_url ? `<img src="${esc(m.photo_url)}" alt="" loading="lazy">` : `<div class="memoriam-fallback">${esc((m.school_year||'?').slice(0,4))}</div>`}
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
    ? `<img src="${esc(m.photo_url)}" alt="">`
    : `<div class="memoriam-fallback">${esc((m.school_year||'?').slice(0,4))}</div>`;
  document.getElementById('memoriamModalYear').textContent = m.school_year || '';
  document.getElementById('memoriamModalTerm').textContent = m.term_label || '';
  const cap = document.getElementById('memoriamModalCaption');
  if (m.caption) { cap.textContent = m.caption; cap.style.display = 'block'; }
  else { cap.textContent = ''; cap.style.display = 'none'; }
  document.getElementById('memoriamOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMemoriam() {
  document.getElementById('memoriamOverlay').classList.remove('open');
  document.body.style.overflow = '';
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
  document.body.style.overflow = 'hidden';
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
  document.body.style.overflow = '';
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
      <div style="position:absolute;inset:0;display:grid;place-items:center;padding:24px;background:#0a0a0a">
        <div style="max-width:420px;width:100%;text-align:center;color:#fff">
          ${thumb ? `<img src="${esc(thumb)}" alt="" style="width:100%;border-radius:12px;margin-bottom:20px;box-shadow:0 10px 40px rgba(0,0,0,.5)">` : ''}
          <div style="font-family:var(--sans);font-size:.72rem;font-weight:750;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:10px">Facebook video</div>
          <h3 style="font-family:var(--serif);font-size:1.15rem;color:#fff;margin:0 0 6px;line-height:1.3">${esc(v.title||'')}</h3>
          ${v.description ? `<p style="font-family:var(--sans);font-size:.85rem;color:rgba(255,255,255,.65);margin:0 0 22px;line-height:1.6">${esc(v.description)}</p>` : ''}
          <a href="${esc(v.video_url)}" target="_blank" rel="noopener" class="btn btn-primary" style="margin-top:10px">
            Watch on Facebook
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M7 17 17 7M9 7h8v8"/></svg>
          </a>
          <div style="font-family:var(--sans);font-size:.72rem;color:rgba(255,255,255,.4);margin-top:18px;line-height:1.55">Facebook doesn't allow embedding this video.<br>It will open in a new tab.</div>
        </div>
      </div>`;
    ext.classList.remove('show');
    $('#readerOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    return;
  }

  const embed = toEmbedUrl(v.video_url, v.platform);
  if (!embed) { toast('Cannot embed this video', true); return; }
  if (v.video_url) { ext.href = v.video_url; ext.classList.add('show'); }
  else { ext.classList.remove('show'); ext.href = '#'; }
  stage.innerHTML = '<div class="reader-loading"><div class="spinner"></div>Loading video…</div>';
  $('#readerOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
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

  const seenDepts = new Set();
  BOARD.forEach(p => {
    const dept = p.group;
    if (seenDepts.has(dept)) return;
    seenDepts.add(dept);

    const deptMembers = BOARD.filter(x => x.group === dept);

    const deptHead = document.createElement('div');
    const isFirst = seenDepts.size === 1;
    deptHead.style.cssText = `grid-column:1/-1;margin:${isFirst?'0':'28px'} 0 6px;padding-top:${isFirst?'0':'22px'};${isFirst?'':'border-top:1px solid var(--line)'}`;
    deptHead.innerHTML = `<h3 style="font-family:var(--serif);font-size:1.4rem;font-weight:900;margin:0;letter-spacing:-.02em;color:var(--ink)">${esc(dept)}</h3>`;
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
        const avatarHtml = photo ? `<img src="${esc(photo)}" alt="" loading="lazy">` : esc(m.initials);
        el.innerHTML = `<div class="board-avatar">${avatarHtml}</div><h3>${esc(m.name)}</h3><div class="board-role">${esc(m.role)}</div><div class="board-program" style="font-family:var(--sans);font-size:.68rem;color:var(--ink-4);margin-top:6px;line-height:1.35">${esc(m.program||'')}</div>`;
        el.addEventListener('click', () => openBoardProfile(m.name));
        grid.appendChild(el);
      });
    });
  });
}

function renderBoardAdmin() {
  const grid = $('#boardAdminGrid');
  if (!grid) return;
  grid.innerHTML = BOARD.map(p => {
    const photo = boardPhotos[p.name];
    const avatarHtml = photo ? `<img src="${esc(photo)}" alt="">` : esc(p.initials);
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
  dl.innerHTML = BOARD.map(p => `<option value="${esc(p.name)}">${esc(p.role)}</option>`).join('');
}

async function openBoardProfile(name) {
  const member = BOARD.find(m => m.name === name);
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
  const byPhoto = published.filter(a => a.photojournalist === name);
  const byLayout = published.filter(a => a.layout_by === name || a.layout_by_2 === name);
  const byGraphics = published.filter(a => a.graphics_by === name);

  const photo = boardPhotos[name];
  $('#bpAvatar').innerHTML = photo ? `<img src="${esc(photo)}" alt="">` : esc(member.initials);
  $('#bpName').textContent = member.name;
  $('#bpRole').textContent = member.role;
  if (member.program && member.program !== '—') {
    $('#bpGroup').textContent = member.group + ' · ' + member.program;
  } else {
    $('#bpGroup').textContent = member.group;
  }

  const sections = [];
  if (byAuthor.length) sections.push({ label: 'As Author', items: byAuthor });
  if (byPhoto.length) sections.push({ label: 'As Photojournalist', items: byPhoto });
  if (byGraphics.length) sections.push({ label: 'As Graphics Artist', items: byGraphics });
  if (byLayout.length) sections.push({ label: 'As Layout Artist', items: byLayout });

  if (!sections.length) {
    $('#bpBody').innerHTML = `<div class="bp-empty">No published works yet.</div>`;
  } else {
    $('#bpBody').innerHTML = sections.map(sec => `
      <div class="bp-section">
        <div class="bp-section-title">${esc(sec.label)} <span class="bp-section-count">· ${sec.items.length}</span></div>
        ${sec.items.map(a => {
          const thumbHtml = a.thumbnail ? `<img src="${esc(a.thumbnail)}" alt="">` : esc((CAT_LABELS[a.cat]||'?').charAt(0));
          return `
            <div class="bp-article" data-article-id="${esc(a.id)}">
              <div class="bp-article-thumb">${thumbHtml}</div>
              <div class="bp-article-info">
                <div class="bp-article-title">${esc(a.title)}</div>
                <div class="bp-article-meta">${esc(CAT_LABELS[a.cat]||a.cat)} · ${esc(fmtDate(a.date))}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');
    $$('#bpBody [data-article-id]').forEach(el => {
      el.addEventListener('click', () => { closeBoardProfile(); openArticle(el.dataset.articleId); });
    });
  }

  $('#boardProfileOverlay').classList.add('open');
  boardProfileOpen = true;
  document.body.style.overflow = 'hidden';
}

function closeBoardProfile() {
  $('#boardProfileOverlay').classList.remove('open');
  boardProfileOpen = false;
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}
$('#boardProfileClose').addEventListener('click', closeBoardProfile);
$('#boardProfileOverlay').addEventListener('click', e => { if (e.target === $('#boardProfileOverlay')) closeBoardProfile(); });
$('#memoriamClose').addEventListener('click', closeMemoriam);
$('#memoriamOverlay').addEventListener('click', e => { if (e.target === $('#memoriamOverlay')) closeMemoriam(); });

function openArticle(id) {
  const a = articles.find(x => x.id === id);
  if (!a) return;
  if (window.umami) window.umami.track('Article Read', { title: a.title || '', cat: a.cat || '' });
  lastFocused = document.activeElement;
  articleModalSeo = a.status === 'published' && !location.hash.startsWith('#/admin');
  if (articleModalSeo) {
    articleReturnUrl = location.pathname + location.search + location.hash;
    if (location.pathname !== storyUrl(a)) history.pushState({ twStoryId: a.id }, '', storyUrl(a));
    updateArticleMeta(a);
  }
  $('#modalCat').textContent = CAT_LABELS[a.cat] || a.cat;
  $('#modalTitle').textContent = a.title;

  const authorLine = a.author2 ? `${a.author} & ${a.author2}` : a.author;
  const creditLines = [];
  if (authorLine) {
    creditLines.push({ label: 'Writer', value: authorLine });
  } else if (a.cat === 'editorial') {
    creditLines.push({ label: 'Writer', value: 'The Work' });
  } else {
    creditLines.push({ label: 'Writer', value: 'Staff' });
  }
  if (a.photojournalist) creditLines.push({ label: 'Photos', value: a.photojournalist });
  if (a.graphics_by) creditLines.push({ label: 'Graphics', value: a.graphics_by });
  const layoutNames = [a.layout_by, a.layout_by_2].filter(Boolean).join(' & ');
  if (layoutNames) creditLines.push({ label: 'Layout', value: layoutNames });

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
    ? `<div class="modal-hero-bg" style="background-image:url('${esc(a.thumbnail)}')"></div><img src="${esc(a.thumbnail)}" alt="">`
    : `<span class="modal-hero-text">${letter}</span>`;
  const paras = (a.body||'').split(/\n\s*\n/).filter(p => p.trim());
  let content = paras.map(p => `<p>${esc(p.trim()).replace(/\n/g,'<br>')}</p>`).join('');
  if (a.excerpt) content += `<blockquote>${esc(a.excerpt)}</blockquote>`;
  $('#modalContent').innerHTML = content || `<p>${esc(a.excerpt||'')}</p>`;

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
  document.body.style.overflow = 'hidden';
  $('#modalClose').focus();
}
function closeArticle(syncUrl = true) {
  $('#modalOverlay').classList.remove('open');
  modalOpen = false;
  document.body.style.overflow = '';
  if (articleModalSeo) {
    if (syncUrl && storyRouteId()) history.replaceState(null, '', articleReturnUrl || '/#/');
    updateArticleMeta(null);
  }
  articleReturnUrl = '';
  articleModalSeo = false;
  if (lastFocused) lastFocused.focus();
}
$('#modalClose').addEventListener('click', closeArticle);
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
      document.body.style.overflow = 'hidden';
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
  document.body.style.overflow = '';
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
  } catch (err) { toast('Upload failed: ' + (err.message || err), true); }
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
    const coverHtml = cover ? `<img src="${esc(cover)}" alt="">` : '';
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
    toast('Save failed: ' + (err.message || err), true);
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
      } catch (err) { toast('Failed: ' + (err.message || err), true); }
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
    const thumbHtml = thumb ? `<img src="${esc(thumb)}" alt="">` : '';
    return `
      <div class="release-list-item">
        <div class="release-list-cover">${thumbHtml}</div>
        <div class="release-list-info">
          <h4>${esc(v.title)}</h4>
          <small>${esc(v.platform || '—')} · ${esc(v.published ? fmtDate(v.published) : '—')} · <span class="badge ${v.status==='published'?'published':'draft'}">${v.status}</span></small>
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
  if (!uploader) return;

  if (!pendingVideoThumb) {
    const auto = youtubeThumb({ video_url: $('#videoUrl').value });
    if (auto) {
      img.src = auto;
      preview.style.display = 'grid';
      empty.style.display = 'none';
      uploader.classList.add('has-image');
      actions.style.display = 'none';
      return;
    }
    img.src = '';
    preview.style.display = 'none';
    empty.style.display = 'flex';
    uploader.classList.remove('has-image');
    actions.style.display = 'none';
    return;
  }

  const src = pendingVideoThumb.existing ? pendingVideoThumb.url : pendingVideoThumb.dataUrl;
  img.src = src;
  preview.style.display = 'grid';
  empty.style.display = 'none';
  uploader.classList.add('has-image');
  actions.style.display = 'flex';
  nameEl.textContent = pendingVideoThumb.existing ? 'Current thumbnail' : (pendingVideoThumb.file?.name || 'thumbnail.jpg');
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
    $('#videoFormTitle').textContent = 'Edit video';
    pendingVideoThumb = v.thumbnail_url ? { existing:true, url: v.thumbnail_url } : null;
  } else {
    editingVideoId = null;
    $('#videoForm').reset();
    $('#videoPublished').value = todayISO();
    $('#videoStatus').value = 'published';
    $('#videoSort').value = '0';
    $('#videoPlatform').value = 'youtube';
    $('#videoFormTitle').textContent = 'New video';
    pendingVideoThumb = null;
  }
  renderVideoThumbPreview();
  setTimeout(() => $('#videoTitle').focus(), 60);
}

function hideVideoForm() {
  $('#videoFormPanel').style.display = 'none';
  $('#newVideoBtn').style.display = 'inline-flex';
  editingVideoId = null;
  pendingVideoThumb = null;
  $('#videoForm').reset();
  $('#videoThumbFile').value = '';
  renderVideoThumbPreview();
}

document.addEventListener('click', e => {
  if (e.target.closest('#newVideoBtn'))  { showVideoForm(null); return; }
  if (e.target.closest('#videoCancelBtn')) { hideVideoForm(); return; }

  if (e.target.closest('#videoThumbChange')) { $('#videoThumbFile')?.click(); return; }

  if (e.target.closest('#videoThumbRemove')) {
    pendingVideoThumb = null;
    const f = $('#videoThumbFile'); if (f) f.value = '';
    renderVideoThumbPreview();
    return;
  }

  const uploader = e.target.closest('#videoThumbUploader');
  if (uploader) {
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
    if (!pendingVideoThumb) renderVideoThumbPreview();
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
    if (pendingVideoThumb) {
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
      updated: new Date().toISOString()
    };

    await Data.upsertVideo(payload);
    toast(editingVideoId ? 'Video updated' : 'Video created');
    hideVideoForm();
    await renderVideosAdmin();
    await renderVideosPage();
  } catch (err) {
    console.error(err);
    toast('Save failed: ' + (err.message || err), true);
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
      } catch (err) { toast('Failed: ' + (err.message || err), true); }
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
    const photoHtml = photo ? `<img src="${esc(photo)}" alt="">` : '';
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
    toast('Save failed: ' + (err.message || err), true);
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
      } catch (err) { toast('Failed: ' + (err.message || err), true); }
    });
  }
});

async function renderAdmin() {
  const all = await Data.listAll();
  window.__allArticles = all;
  const total = all.length;
  const published = all.filter(a => a.status === 'published').length;
  const drafts = total - published;
  const sections = new Set(all.map(a => a.cat)).size;
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
    return;
  }
  let html = '<table><thead><tr><th>Title</th><th>Section</th><th>Status</th><th>Updated</th><th style="text-align:right">Actions</th></tr></thead><tbody>';
  list.forEach(a => {
    const thumbHtml = a.thumbnail ? `<img src="${esc(a.thumbnail)}" alt="">` : esc((CAT_LABELS[a.cat]||'?').charAt(0));
    html += `<tr>
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


// ---------- word count meter ----------
const WORD_TARGETS = {
  news:      { min: 300, max: 600,  label: 'News: 300–600 words' },
  editorial: { min: 400, max: 800,  label: 'Editorial: 400–800 words' },
  opinion:   { min: 500, max: 900,  label: 'Opinion: 500–900 words' },
  features:  { min: 700, max: 1500, label: 'Features: 700–1,500 words' },
  literary:  { min: 300, max: 2000, label: 'Literary: 300–2,000 words' },
  sports:    { min: 350, max: 700,  label: 'Sports: 350–700 words' }
};
function updateBodyMeter() {
  const bodyEl  = document.getElementById('fBody');
  const catEl   = document.getElementById('fCat');
  const wrap    = document.getElementById('fBodyMeter');
  const countEl = document.getElementById('fBodyCount');
  const targEl  = document.getElementById('fBodyTarget');
  if (!bodyEl || !wrap || !countEl || !targEl) return;
  const text  = bodyEl.value.trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  countEl.textContent = words + (words === 1 ? ' word' : ' words');
  const t = catEl ? WORD_TARGETS[catEl.value] : null;
  wrap.classList.remove('under','over','ok');
  if (!t) { targEl.textContent = ''; return; }
  targEl.textContent = '· ' + t.label;
  if (words === 0) return;
  if (words < t.min)       wrap.classList.add('under');
  else if (words > t.max)  wrap.classList.add('over');
  else                     wrap.classList.add('ok');

  // Update author hint based on section
  const authorHint = document.getElementById('fAuthorHint');
  if (authorHint) {
    authorHint.textContent = catEl && catEl.value === 'editorial' ? 'optional for Editorial' : '*';
  }
}
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'fBody') updateBodyMeter();
});
document.addEventListener('change', e => {
  if (e.target && e.target.id === 'fCat') updateBodyMeter();
});

function resetForm() {
  editingId = null;
  window.__pendingThumbFile = null;
  $('#articleForm').reset();
  $('#fId').value = '';
  $('#fDate').value = todayISO();
  $('#fRead').value = '';
  $('#fPublishAt').value = '';
  $('#fStatus').value = 'published';
  $('#fFeatured').checked = false;
    $('#fLayout2').value = '';
  $('#fGraphics').value = '';
  $('#editorTitle').textContent = 'New article';
  $('#deleteBtn').style.display = 'none';
  setThumbnail(null);
  if (typeof updateBodyMeter === 'function') updateBodyMeter();
}

function loadIntoForm(id) {
  const a = (window.__allArticles || []).find(x => x.id === id);
  if (!a) return;
  editingId = id;
  window.__pendingThumbFile = null;
  $('#fId').value = id;
  $('#fTitle').value = a.title || '';
  $('#fCat').value = a.cat || '';
  $('#fAuthor').value = a.author || '';
  $('#fAuthor2').value = a.author2 || '';
  $('#fPhoto').value = a.photojournalist || '';
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
  const isEditorial = cat === 'editorial';

  if (!title) missing.push('title');
  if (!cat) missing.push('section');
  if (!author && !isEditorial) missing.push('author');
  if (!body) missing.push('body');
  if (status === 'published' && !excerpt && !isEditorial) missing.push('excerpt');

  if (missing.length) {
    toast('Missing required fields: ' + missing.join(', '), true);
    return;
  }

  const wordCount = body ? body.split(/\s+/).filter(Boolean).length : 0;
  const target = cat && WORD_TARGETS[cat];
  if (status === 'published' && target && wordCount < target.min) {
    toast(`Minimum ${target.min} words required for ${CAT_LABELS[cat] || cat} before publishing.`, true);
    return;
  }

  const btn = $('#saveBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    let thumbnail = pendingThumbnail;
    if (window.__pendingThumbFile) {
      thumbnail = await Data.uploadThumb(window.__pendingThumbFile);
      window.__pendingThumbFile = null;
    }
    const payload = {
      id: editingId || uid(),
      title, cat, author,
      author2: $('#fAuthor2').value.trim() || null,
      photojournalist: $('#fPhoto').value.trim() || null,
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
      const others = (window.__allArticles || []).filter(a => a.id !== payload.id && a.featured);
      for (const o of others) {
        try { await Data.upsert({ ...o, featured: false }); } catch(e) { console.warn(e); }
      }
    }
    await Data.upsert(payload);
    toast(editingId ? 'Updated' : 'Created');
    resetForm();
    location.hash = '#/admin';
    setTimeout(() => setPanel('articles'), 60);
    await renderAdmin();
  } catch (err) {
    toast('Save failed: ' + (err.message || err), true);
  } finally {
    btn.disabled = false; btn.textContent = 'Save article';
  }
});

$('#deleteBtn').addEventListener('click', () => {
  if (!editingId) return;
  const a = (window.__allArticles || []).find(x => x.id === editingId);
  openConfirm('Delete article?', `"${a ? a.title : 'This'}" will be removed.`, async () => {
    try {
      await Data.remove(editingId);
      resetForm();
      await renderAdmin();
      setPanel('articles');
      toast('Deleted');
    } catch (err) { toast('Failed: ' + (err.message || err), true); }
  });
});

function setPanel(name, skipReset) {
  if (name === 'back') { location.hash = '#/'; return; }
  if (name === 'new' && !skipReset) resetForm();
  if (name === 'releases') hideReleaseForm();
  if (name === 'videos') hideVideoForm();
  if (name === 'memoriam') hideMemoriamForm();
  $$('.admin-section').forEach(s => s.classList.remove('active'));
  const el = $('#panel-' + name);
  if (el) el.classList.add('active');
  $$('.admin-nav button').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
  const url = '#/admin' + (name !== 'dashboard' ? '/' + name : '');
  if (location.hash !== url) history.replaceState(null, '', url);
  if (name === 'board') renderBoardAdmin();
  if (name === 'releases') renderReleasesAdmin();
  if (name === 'videos') renderVideosAdmin();
  if (name === 'memoriam') renderMemoriamAdmin();
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
      } catch (err) { toast('Failed: ' + (err.message || err), true); }
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
    openConfirm('Delete article?', `"${a ? a.title : 'This'}" will be removed.`, async () => {
      try {
        await Data.remove(dl.dataset.del);
        await renderAdmin();
        toast('Deleted');
      } catch (err) { toast('Failed: ' + (err.message || err), true); }
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
    archiveFilter = tab.dataset.filter;
    renderReleasesPage();
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
    setPanel(['dashboard','articles','releases','videos','memoriam','board','new','settings'].includes(sub) ? sub : 'dashboard');
    await renderAdmin();
    if (sub === 'board') ensureBoardPhotos();
    updateAuthUI();
    return;
  }

  const routeName = path === '/' || path === '/home' ? 'home' : path.slice(1);
  setView(['home','releases','board','about','videos','memoriam'].includes(routeName) ? routeName : 'home');
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

  sessionReady = getSession().then(s => {
    session = s;
    updateAuthUI();
    return s;
  }).catch(err => {
    session = null;
    updateAuthUI();
    console.warn('[The Work] Could not restore session', err);
    return null;
  });

  if (sb) {
    sb.auth.onAuthStateChange((_evt, s) => { session = s; updateAuthUI(); });
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
