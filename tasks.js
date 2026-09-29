/* ============================================================
   TW Tasks — standalone workflow module
   Loads after app.js. Own scope. No collisions.
   ============================================================ */
(function () {
  if (window.__twTasksLoaded) return;
  window.__twTasksLoaded = true;

  // Wait for app.js to finish defining `sb` before we do anything.
  function waitForSb(cb, tries) {
    tries = tries || 0;
    if (typeof window.sb !== 'undefined' || typeof sb !== 'undefined') { cb(); return; }
    if (tries > 50) { console.warn('[TW Tasks] sb not found'); return; }
    setTimeout(() => waitForSb(cb, tries + 1), 100);
  }

  const state = { member: null, tasks: [], filter: 'mine', open: false };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—';
  const isOverdue = (d, st) => d && st !== 'done' && new Date(d) < new Date(new Date().toDateString());

  // ---------- data ----------
  async function loadMember() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { state.member = null; return null; }
    const { data } = await sb.from('members').select('*').eq('id', user.id).eq('active', true).maybeSingle();
    state.member = data || null;
    return state.member;
  }
  async function loadTasks() {
    const { data, error } = await sb.from('tasks')
      .select('*, assignee:members!tasks_assigned_to_fkey(full_name, position)')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) { console.error('[TW Tasks]', error); return; }
    state.tasks = data || [];
  }

  // ---------- floating button ----------
  function ensureFab() {
    if (document.getElementById('twFab')) return;
    const b = document.createElement('button');
    b.id = 'twFab';
    b.type = 'button';
    b.innerHTML = '📋 Tasks';
    b.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:8000;padding:12px 18px;border-radius:999px;border:0;background:linear-gradient(135deg,#7C3AED 0%,#A855F7 55%,#D946EF 100%);color:#fff;font-family:var(--sans,sans-serif);font-weight:750;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;box-shadow:0 8px 24px rgba(124,58,237,.45)';
    b.onclick = () => openOverlay();
    document.body.appendChild(b);
  }

  // ---------- overlay ----------
  function ensureOverlay() {
    let o = document.getElementById('twOverlay');
    if (o) return o;
    o = document.createElement('div');
    o.id = 'twOverlay';
    o.style.cssText = 'position:fixed;inset:0;z-index:8500;background:var(--paper,#fff);overflow-y:auto;display:none';
    o.innerHTML = `
      <div style="position:sticky;top:0;background:var(--paper,#fff);border-bottom:1.5px solid var(--line,#e5e5e5);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;z-index:2">
        <strong style="font-family:var(--sans,sans-serif);letter-spacing:.08em;text-transform:uppercase;font-size:.72rem;color:var(--ink-3,#666)">The Work · Tasks</strong>
        <button id="twClose" style="background:transparent;border:1.5px solid var(--line,#e5e5e5);border-radius:8px;padding:6px 12px;font-family:var(--sans,sans-serif);font-size:.72rem;font-weight:700;cursor:pointer;color:var(--ink,#111)">Close</button>
      </div>
      <div id="twRoot"></div>`;
    document.body.appendChild(o);
    o.querySelector('#twClose').onclick = closeOverlay;
    return o;
  }

  async function openOverlay() {
    state.open = true;
    const o = ensureOverlay();
    o.style.display = 'block';
    document.body.style.overflow = 'hidden';
    const root = o.querySelector('#twRoot');
    await refresh();
    paint(root);
  }
  function closeOverlay() {
    state.open = false;
    const o = document.getElementById('twOverlay');
    if (o) o.style.display = 'none';
    document.body.style.overflow = '';
  }
  async function refresh() {
    await loadMember();
    if (state.member) await loadTasks();
  }

  // ---------- views ----------
  function vLogin(root) {
    root.innerHTML = `
      <div class="tw-tasks-wrap">
        <div class="tw-auth-card">
          <h2>Staff Sign In</h2>
          <p>The Work — Editorial workflow</p>
          <input id="twEmail" type="email" placeholder="Email" autocomplete="username">
          <input id="twPass" type="password" placeholder="Password" autocomplete="current-password">
          <button id="twSignIn">Sign In</button>
          <div class="tw-auth-err" id="twErr"></div>
        </div>
      </div>`;
    const btn = root.querySelector('#twSignIn');
    const err = root.querySelector('#twErr');
    btn.onclick = async () => {
      btn.disabled = true; err.textContent = '';
      const email = root.querySelector('#twEmail').value.trim();
      const password = root.querySelector('#twPass').value;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      btn.disabled = false;
      if (error) { err.textContent = error.message; return; }
      await refresh();
      paint(root);
    };
  }

  function vDenied(root) {
    root.innerHTML = `
      <div class="tw-tasks-wrap">
        <div class="tw-access-denied">
          <h2>Access Denied</h2>
          <p>Your account is not on the Editorial Board roster, or your access has been deactivated.</p>
          <p>Contact the Editor-in-Chief or the webmaster to be added.</p>
          <button class="tw-btn-ghost" id="twSignOut" style="margin-top:16px">Sign Out</button>
        </div>
      </div>`;
    root.querySelector('#twSignOut').onclick = async () => {
      await sb.auth.signOut();
      await refresh();
      paint(root);
    };
  }

  function card(t) {
    const od = isOverdue(t.due_date, t.status);
    return `
      <div class="tw-task" data-id="${t.id}">
        <div class="tw-task-body">
          <p class="tw-task-title">${esc(t.title)}</p>
          ${t.description ? `<p class="tw-task-desc">${esc(t.description)}</p>` : ''}
          <div class="tw-task-meta">
            <span class="tw-pill prio-${t.priority}">${esc(t.priority)}</span>
            <span class="tw-pill status-${t.status}">${esc(t.status.replace('_',' '))}</span>
            <span class="tw-pill">${esc(t.task_type)}</span>
            <span class="tw-task-due ${od ? 'overdue' : ''}">${od ? '⚠ ' : ''}${fmtDate(t.due_date)}</span>
            ${t.assignee ? `<span class="tw-task-due">· ${esc(t.assignee.full_name)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  function head(active) {
    const t = active === 'mine' ? 'My Tasks' : active === 'board' ? 'Task Board' : 'All Tasks';
    return `
      <div class="tw-tasks-head">
        <h1>${t}</h1>
        <div class="tw-tasks-tabs">
          <button class="tw-tasks-tab ${active==='mine'?'active':''}" data-tab="mine">Mine</button>
          <button class="tw-tasks-tab ${active==='board'?'active':''}" data-tab="board">Board</button>
          <button class="tw-tasks-tab ${active==='all'?'active':''}" data-tab="all">All</button>
          <button class="tw-btn-primary" id="twNew">+ New Task</button>
        </div>
      </div>`;
  }

  function vMine(root) {
    const mine = state.tasks.filter((t) => t.assigned_to === state.member.id);
    root.innerHTML = `<div class="tw-tasks-wrap">${head('mine')}<div class="tw-task-list">
      ${mine.length ? mine.map(card).join('') : '<p style="color:var(--ink-3,#888);text-align:center;padding:40px">No tasks assigned to you. 🎉</p>'}
    </div></div>`;
    wire(root);
  }
  function vBoard(root) {
    const cols = ['todo','in_progress','review','done','blocked'];
    const labels = { todo:'To Do', in_progress:'In Progress', review:'Review', done:'Done', blocked:'Blocked' };
    root.innerHTML = `<div class="tw-tasks-wrap">${head('board')}<div class="tw-board">
      ${cols.map((col) => `
        <div class="tw-col">
          <h3>${labels[col]}<span>${state.tasks.filter((t) => t.status === col).length}</span></h3>
          ${state.tasks.filter((t) => t.status === col).map(card).join('')}
        </div>`).join('')}
    </div></div>`;
    wire(root);
  }
  function vAll(root) {
    root.innerHTML = `<div class="tw-tasks-wrap">${head('all')}<div class="tw-task-list">
      ${state.tasks.length ? state.tasks.map(card).join('') : '<p style="color:var(--ink-3,#888);text-align:center;padding:40px">No tasks yet.</p>'}
    </div></div>`;
    wire(root);
  }

  function wire(root) {
    root.querySelectorAll('.tw-tasks-tab').forEach((b) => {
      b.onclick = () => { state.filter = b.dataset.tab; paint(root); };
    });
    const nu = root.querySelector('#twNew');
    if (nu) nu.onclick = () => newTask(root);
  }

  async function newTask(root) {
    const { data: members } = await sb.from('members').select('id, full_name, position').eq('active', true).order('full_name');
    const opts = (members || []).map((m) => `<option value="${m.id}" ${m.id === state.member.id ? 'selected' : ''}>${esc(m.full_name)}${m.position ? ' — ' + esc(m.position) : ''}</option>`).join('');
    const bg = document.createElement('div');
    bg.className = 'tw-modal-bg';
    bg.innerHTML = `<div class="tw-modal">
      <h2>New Task</h2>
      <label>Title</label><input id="ntTitle" placeholder="e.g. Draft news article on intramurals">
      <label>Description</label><textarea id="ntDesc" placeholder="Optional details..."></textarea>
      <label>Assign to</label><select id="ntAssign">${opts}</select>
      <label>Type</label><select id="ntType">
        <option value="article">Article</option><option value="photo">Photo</option>
        <option value="layout">Layout</option><option value="video">Video</option>
        <option value="event">Event</option><option value="admin">Admin</option>
        <option value="other" selected>Other</option>
      </select>
      <label>Priority</label><select id="ntPrio">
        <option value="low">Low</option><option value="normal" selected>Normal</option>
        <option value="high">High</option><option value="urgent">Urgent</option>
      </select>
      <label>Due date</label><input id="ntDue" type="date">
      <div class="tw-modal-actions">
        <button class="tw-btn-ghost" id="ntCancel">Cancel</button>
        <button class="tw-btn-primary" id="ntSave">Create Task</button>
      </div>
    </div>`;
    document.body.appendChild(bg);
    bg.querySelector('#ntCancel').onclick = () => bg.remove();
    bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
    bg.querySelector('#ntSave').onclick = async () => {
      const title = bg.querySelector('#ntTitle').value.trim();
      if (!title) { alert('Title is required'); return; }
      const row = {
        title,
        description: bg.querySelector('#ntDesc').value.trim() || null,
        assigned_to: bg.querySelector('#ntAssign').value,
        task_type: bg.querySelector('#ntType').value,
        priority: bg.querySelector('#ntPrio').value,
        due_date: bg.querySelector('#ntDue').value || null,
        created_by: state.member.id,
      };
      const { error } = await sb.from('tasks').insert(row);
      if (error) { alert(error.message); return; }
      bg.remove();
      await loadTasks();
      paint(root);
    };
  }

  function paint(root) {
    if (!state.member) { vLogin(root); return; }
    if (state.filter === 'mine') vMine(root);
    else if (state.filter === 'board') vBoard(root);
    else vAll(root);
  }

  // ---------- boot ----------
  async function boot() {
    waitForSb(async () => {
      // wait one more beat for the auth session to hydrate in app.js
      setTimeout(async () => {
        try {
          const m = await loadMember();
          if (m) ensureFab();
        } catch (e) { /* silent */ }
      }, 800);
      // re-check after auth state changes
      sb.auth.onAuthStateChange(async () => {
        const m = await loadMember();
        const fab = document.getElementById('twFab');
        if (m && !fab) ensureFab();
        if (!m && fab) fab.remove();
        if (!m && state.open) closeOverlay();
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.TWTasks = { open: openOverlay, close: closeOverlay };
  console.log('[TW Tasks] standalone loaded');
})();
