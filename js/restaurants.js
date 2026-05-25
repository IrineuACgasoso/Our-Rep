import { ref, push, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { showToast, esc, escH } from './utils.js';

const CIDADE_PADRAO = "Recife";

export function buildHalfStarSelector(container, initial = 0, onChange) {
  let val = initial;
  function render() {
    container.innerHTML = '<label>Nota:</label>';
    for (let i = 1; i <= 5; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'hstar-wrap';
      const full = val >= i, half = !full && val >= (i - 0.5) && val < i;
      const pct = full ? '100%' : half ? '50%' : '0%';
      wrap.innerHTML = `<span class="hstar-bg">★</span><span class="hstar-fill" style="width:${pct}">★</span>`;
      wrap.addEventListener('mousemove', e => {
        const rect = wrap.getBoundingClientRect();
        const isLeft = (e.clientX - rect.left) < rect.width / 2;
        wrap.querySelector('.hstar-fill').style.width = isLeft ? '50%' : '100%';
      });
      wrap.addEventListener('mouseleave', () => {
        const f = val >= i, h = !f && val >= (i - 0.5);
        wrap.querySelector('.hstar-fill').style.width = f ? '100%' : h ? '50%' : '0%';
      });
      wrap.addEventListener('click', e => {
        const rect = wrap.getBoundingClientRect();
        const isLeft = (e.clientX - rect.left) < rect.width / 2;
        const newVal = isLeft ? i - 0.5 : i;
        val = val === newVal ? 0 : newVal;
        onChange(val);
        buildHalfStarSelector(container, val, onChange);
      });
      container.appendChild(wrap);
    }
    if (val > 0) {
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:12px;color:var(--acc-dark);margin-left:6px;font-weight:700;';
      lbl.textContent = val % 1 === 0 ? `${val}.0` : `${val}`;
      container.appendChild(lbl);
    }
  }
  render();
}

function halfStarHtml(val) {
  let h = '<span class="rest-stars">';
  for (let i = 1; i <= 5; i++) {
    if (val >= i) h += `<span class="s-full">★</span>`;
    else if (val >= i - 0.5) h += `<span class="s-half">★</span>`;
    else h += `<span class="s-empty">★</span>`;
  }
  h += `<span style="font-size:11px;color:var(--acc-dark);margin-left:4px;font-weight:700">${val % 1 === 0 ? val + '.0' : val}</span>`;
  return h + '</span>';
}

function getSelectedAddTags() {
  return [...document.querySelectorAll('#addRestTagsWrap .editor-tag-chip.selected')].map(b => b.dataset.key);
}

export function renderAddRestTags() {
  const wrap = document.getElementById('addRestTagsWrap');
  const tags = Object.entries(state.tagsData);
  if (!tags.length) {
    wrap.innerHTML = `<span style="font-size:11px;color:var(--text-muted)">Sem categorias ainda — crie uma abaixo ↓</span>`;
    return;
  }
  wrap.innerHTML = tags.map(([k, t]) =>
    `<button type="button" class="editor-tag-chip" data-key="${k}">${escH(t.name)}</button>`
  ).join('');
  wrap.querySelectorAll('.editor-tag-chip').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });
}

export function renderTagFilters() {
  const row = document.getElementById('restTagsFilterRow');
  const tags = Object.entries(state.tagsData);
  let html = `<button type="button" class="rest-tag-filter rest-tag-all ${!state.activeTagFilter ? 'active' : ''}" data-tag-filter="">Todos</button>`;
  html += tags.map(([k, t]) =>
    `<button type="button" class="rest-tag-filter ${state.activeTagFilter === k ? 'active' : ''}" data-tag-filter="${k}">${escH(t.name)}</button>`
  ).join('');
  html += `<div id="newTagArea"></div>`;
  html += `<button type="button" class="rest-tag-add" id="showNewTagBtn">＋ Nova categoria</button>`;
  row.innerHTML = html;
  row.querySelectorAll('[data-tag-filter]').forEach(btn => {
    btn.addEventListener('click', () => setTagFilter(btn.dataset.tagFilter || null));
  });
  document.getElementById('showNewTagBtn')?.addEventListener('click', showNewTagInput);
}

function setTagFilter(k) {
  state.activeTagFilter = k;
  renderTagFilters();
  renderRestaurants();
  if (state.mapVisible) updateMapMarkers();
}

function showNewTagInput() {
  const area = document.getElementById('newTagArea');
  if (area.innerHTML) { area.innerHTML = ''; return; }
  area.innerHTML = `<div class="new-tag-wrap">
    <input class="new-tag-inp" id="newTagInp" placeholder="Ex: Japonês" />
    <button type="button" class="new-tag-confirm" id="confirmNewTagBtn">OK</button>
    <button type="button" class="new-tag-cancel" id="cancelNewTagBtn">✕</button>
  </div>`;
  const inp = document.getElementById('newTagInp');
  inp?.addEventListener('keydown', e => e.key === 'Enter' && confirmNewTag());
  document.getElementById('confirmNewTagBtn')?.addEventListener('click', confirmNewTag);
  document.getElementById('cancelNewTagBtn')?.addEventListener('click', () => { area.innerHTML = ''; });
  setTimeout(() => inp?.focus(), 50);
}

async function confirmNewTag() {
  const name = document.getElementById('newTagInp')?.value.trim();
  if (!name) return;
  try {
    await push(ref(db, 'restTags'), { name, createdAt: Date.now() });
    showToast(`Categoria "${name}" criada!`);
  } catch {
    showToast('Erro ao criar categoria.');
  }
}

function toggleVisitedForm() {
  const c = document.getElementById('restVisitedToggle').checked;
  document.getElementById('restStarsRow').style.display = c ? 'block' : 'none';
  document.getElementById('toggleLabelNo').classList.toggle('active', !c);
  document.getElementById('toggleLabelYes').classList.toggle('active', c);
  if (!c) {
    state.addStars = 0;
    buildHalfStarSelector(document.getElementById('addStarRow'), 0, v => { state.addStars = v; });
  }
}

function setRestLoading(on) {
  state.fetchingRest = on;
  document.getElementById('addRestBtn').disabled = on;
  document.getElementById('addRestBtnInner').innerHTML = on ? '<div class="spinner"></div>' : '+ Adicionar';
}

function showRestError(m) {
  const e = document.getElementById('restErrMsg');
  e.textContent = m;
  e.style.display = m ? 'block' : 'none';
}

async function handleAddRest() {
  if (state.fetchingRest) return;
  showRestError('');
  const name = document.getElementById('restName').value.trim();
  const link = document.getElementById('restLink').value.trim();
  const visited = document.getElementById('restVisitedToggle').checked;
  const note = document.getElementById('restNoteInp')?.value.trim() || '';
  const tags = getSelectedAddTags();
  if (!name) { showRestError('Informe o nome do restaurante.'); return; }
  setRestLoading(true);
  try {
    await push(ref(db, 'restaurants'), {
      name, link: link || '', visited,
      stars: visited ? state.addStars : 0,
      note: visited ? note : '', tags, addedAt: Date.now()
    });
    document.getElementById('restName').value = '';
    document.getElementById('restLink').value = '';
    document.getElementById('restVisitedToggle').checked = false;
    document.getElementById('restNoteInp').value = '';
    document.getElementById('restStarsRow').style.display = 'none';
    document.getElementById('toggleLabelNo').classList.add('active');
    document.getElementById('toggleLabelYes').classList.remove('active');
    state.addStars = 0;
    buildHalfStarSelector(document.getElementById('addStarRow'), 0, v => { state.addStars = v; });
    document.querySelectorAll('#addRestTagsWrap .editor-tag-chip').forEach(b => b.classList.remove('selected'));
    showToast('Restaurante adicionado! 🍽️');
  } catch {
    showRestError('Erro ao salvar.');
  }
  setRestLoading(false);
}

async function removeRest(key) {
  try {
    await remove(ref(db, `restaurants/${key}`));
    showToast('Removido.');
  } catch {
    showRestError('Erro.');
  }
}

function openRestEditor(key, mode = 'note') {
  const existing = state.restaurantsData[key];
  const editorId = `rest-editor-${key}`;
  if (document.getElementById(editorId)) { document.getElementById(editorId).remove(); return; }
  const card = document.querySelector(`[data-rest-key="${key}"]`);
  if (!card) return;

  const div = document.createElement('div');
  div.className = 'rest-editor';
  div.id = editorId;
  const tagsHtml = Object.entries(state.tagsData).map(([k, t]) => {
    const sel = existing?.tags?.includes(k) ? 'selected' : '';
    return `<button type="button" class="editor-tag-chip ${sel}" data-key="${k}">${escH(t.name)}</button>`;
  }).join('');
  const isVisited = existing?.visited || false;

  div.innerHTML = `
    <div class="rest-editor-title">${mode === 'edit' ? '✏️ Editar restaurante' : '📝 Nota & avaliação'}</div>
    ${mode === 'edit' ? `
      <div class="editor-row"><input class="field-inp" id="editor-name-${key}" value="${escH(existing?.name || '')}" placeholder="Nome *" /></div>
      <div class="editor-row"><input class="field-inp" id="editor-link-${key}" value="${escH(existing?.link || '')}" placeholder="Link Maps" /></div>
    ` : ''}
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600">CATEGORIAS</div>
    <div class="editor-tags-wrap" id="editor-tags-${key}">${tagsHtml || '<span style="font-size:11px;color:var(--text-muted)">Sem categorias criadas</span>'}</div>
    <div class="toggle-row" style="margin-top:10px">
      <span class="toggle-label-left ${!isVisited ? 'active' : ''}" id="ed-lbl-no-${key}">Ainda não</span>
      <label class="toggle-switch">
        <input type="checkbox" id="ed-visited-${key}" ${isVisited ? 'checked' : ''} />
        <span class="toggle-track"></span>
      </label>
      <span class="toggle-label-right ${isVisited ? 'active' : ''}" id="ed-lbl-yes-${key}">Já fomos!</span>
    </div>
    <div id="ed-visited-section-${key}" style="display:${isVisited ? 'block' : 'none'}">
      <div class="half-star-row" id="editor-stars-${key}" style="margin-top:10px"></div>
      <textarea id="note-ta-${key}" placeholder="Nota sobre este restaurante..." style="margin-top:8px;width:100%;resize:vertical;min-height:52px;border:none;background:transparent;font-family:'Nunito',sans-serif;font-size:13px;color:var(--text);outline:none">${escH(existing?.note || '')}</textarea>
    </div>
    <div class="editor-actions">
      <button type="button" class="editor-cancel" data-editor-cancel="${key}">Cancelar</button>
      <button type="button" class="editor-save" data-editor-save="${key}" data-editor-mode="${mode}">Salvar</button>
    </div>`;

  card.appendChild(div);
  div.querySelectorAll('.editor-tag-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });
  div.querySelector(`[data-editor-cancel="${key}"]`).addEventListener('click', () => div.remove());
  div.querySelector(`[data-editor-save="${key}"]`).addEventListener('click', () => saveRestEditor(key, mode));

  const visitedInput = document.getElementById(`ed-visited-${key}`);
  visitedInput.addEventListener('change', () => toggleEditVisited(key, div));

  let editorStars = existing?.stars || 0;
  if (isVisited) {
    buildHalfStarSelector(document.getElementById(`editor-stars-${key}`), editorStars, v => { editorStars = v; div.dataset.stars = v; });
  }
  div.dataset.stars = editorStars;
}

function toggleEditVisited(key, div) {
  const checked = document.getElementById(`ed-visited-${key}`).checked;
  document.getElementById(`ed-lbl-no-${key}`).classList.toggle('active', !checked);
  document.getElementById(`ed-lbl-yes-${key}`).classList.toggle('active', checked);
  const section = document.getElementById(`ed-visited-section-${key}`);
  section.style.display = checked ? 'block' : 'none';
  if (checked) {
    const starsContainer = document.getElementById(`editor-stars-${key}`);
    if (starsContainer && !starsContainer.hasChildNodes()) {
      let editorStars = 0;
      buildHalfStarSelector(starsContainer, editorStars, v => { editorStars = v; div.dataset.stars = v; });
    }
  }
}

async function saveRestEditor(key, mode) {
  const div = document.getElementById(`rest-editor-${key}`);
  const visited = document.getElementById(`ed-visited-${key}`)?.checked || false;
  const note = visited ? (document.getElementById(`note-ta-${key}`)?.value.trim() || '') : '';
  const stars = visited ? parseFloat(div?.dataset.stars || 0) : 0;
  const tags = [...document.querySelectorAll(`#editor-tags-${key} .editor-tag-chip.selected`)].map(b => b.dataset.key);
  const updates = { note, stars, visited, tags };
  if (mode === 'edit') {
    const name = document.getElementById(`editor-name-${key}`)?.value.trim();
    const link = document.getElementById(`editor-link-${key}`)?.value.trim() || '';
    if (!name) { showToast('O nome não pode estar vazio.'); return; }
    updates.name = name;
    updates.link = link;
  }
  try {
    await update(ref(db, `restaurants/${key}`), updates);
    div.remove();
    showToast('Salvo! ✓');
  } catch {
    showToast('Erro ao salvar.');
  }
}

export function renderRestaurants() {
  const list = document.getElementById('restList');
  const query = (document.getElementById('restSearch')?.value || '').toLowerCase().trim();
  let entries = Object.entries(state.restaurantsData).sort((a, b) => (b[1].addedAt || 0) - (a[1].addedAt || 0));
  if (query) entries = entries.filter(([, r]) => r.name?.toLowerCase().includes(query));
  if (state.activeTagFilter) entries = entries.filter(([, r]) => r.tags?.includes(state.activeTagFilter));
  if (!entries.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🍽️</div><p>${query || state.activeTagFilter ? 'Nenhum resultado' : 'Nenhum restaurante ainda'}</p><span>${query || state.activeTagFilter ? 'Tente outra busca ou categoria' : 'Adicione um restaurante acima!'}</span></div>`;
    return;
  }
  list.innerHTML = entries.map(([key, r]) => {
    const starsHtml = r.visited && r.stars ? halfStarHtml(r.stars) : '';
    const tagsHtml = (r.tags || []).map(tk => state.tagsData[tk] ? `<span class="rest-card-tag">${escH(state.tagsData[tk].name)}</span>` : '').join('');
    const nameBtn = r.link
      ? `<button type="button" class="rest-name-btn" data-rest-link="${escH(r.link)}">${escH(r.name)} <span class="map-icon">📍</span></button>`
      : `<button type="button" class="rest-name-btn no-link">${escH(r.name)}</button>`;
    return `<div class="rest-card" data-rest-key="${key}">
      <div class="rest-card-top">
        <div class="rest-icon">${r.visited ? '✅' : '📍'}</div>
        <div class="rest-body">${nameBtn}
          <div class="rest-meta">
            <span class="rest-badge ${r.visited ? 'visited' : 'unvisited'}">${r.visited ? '✓ Já fomos' : 'Quero ir'}</span>
            ${starsHtml}
          </div>
          ${tagsHtml ? `<div class="rest-card-tags">${tagsHtml}</div>` : ''}
          ${r.note ? `<div class="rest-note">"${escH(r.note)}"</div>` : ''}
        </div>
        <div class="rest-actions">
          <button type="button" class="rest-action-btn" data-rest-note="${key}">📝 Nota</button>
          <button type="button" class="rest-action-btn" data-rest-edit="${key}">✏️ Editar</button>
          <button type="button" class="rest-action-btn danger" data-rest-del="${key}">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-rest-link]').forEach(btn => {
    btn.addEventListener('click', () => window.open(btn.dataset.restLink, '_blank'));
  });
  list.querySelectorAll('[data-rest-note]').forEach(btn => {
    btn.addEventListener('click', () => openRestEditor(btn.dataset.restNote, 'note'));
  });
  list.querySelectorAll('[data-rest-edit]').forEach(btn => {
    btn.addEventListener('click', () => openRestEditor(btn.dataset.restEdit, 'edit'));
  });
  list.querySelectorAll('[data-rest-del]').forEach(btn => {
    btn.addEventListener('click', () => removeRest(btn.dataset.restDel));
  });
}

function toggleMap() {
  state.mapVisible = !state.mapVisible;
  const mapEl = document.getElementById('restMap');
  const btn = document.getElementById('mapToggleBtn');
  mapEl.classList.toggle('visible', state.mapVisible);
  btn.classList.toggle('active', state.mapVisible);
  if (state.mapVisible) {
    if (!state.leafletMap) initLeafletMap();
    setTimeout(() => { state.leafletMap.invalidateSize(); updateMapMarkers(); }, 100);
  }
}

function initLeafletMap() {
  state.leafletMap = L.map('restMap', { zoomControl: true }).setView([-8.05, -34.9], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(state.leafletMap);
}

async function geocodeRestaurant(key, r) {
  if (state.coordsCache[key]) return state.coordsCache[key];
  if (r.link) {
    const match = r.link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      const coords = { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      state.coordsCache[key] = coords;
      return coords;
    }
  }
  try {
    await new Promise(res => setTimeout(res, 300));
    const termoBusca = encodeURIComponent(`${r.name} ${CIDADE_PADRAO}`);
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${termoBusca}&format=json&limit=1`, {
      headers: { 'User-Agent': 'NossaListinha/1.0', 'Accept-Language': 'pt-BR' }
    });
    const data = await resp.json();
    if (data?.[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      state.coordsCache[key] = coords;
      return coords;
    }
  } catch {
    console.error('Erro ao buscar coordenadas para:', r.name);
  }
  return null;
}

export async function updateMapMarkers() {
  if (!state.leafletMap || !state.mapVisible) return;
  state.mapMarkers.forEach(m => m.remove());
  state.mapMarkers = [];

  let entries = Object.entries(state.restaurantsData);
  if (state.activeTagFilter) entries = entries.filter(([, r]) => r.tags?.includes(state.activeTagFilter));

  for (const [key, r] of entries) {
    const coords = await geocodeRestaurant(key, r);
    if (!coords) {
      console.warn(`Restaurante invisível no mapa (sem coordenadas): "${r.name}".`);
      continue;
    }
    const color = r.visited ? '#2196F3' : '#F44336';
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -7]
    });
    const tagNames = (r.tags || []).map(tk => state.tagsData[tk]?.name || '').filter(Boolean).join(' · ');
    const starsText = r.visited && r.stars ? ` · ⭐ ${r.stars % 1 === 0 ? r.stars + '.0' : r.stars}` : '';
    const popup = `<div style="font-family:'Nunito',sans-serif;min-width:150px;padding:2px">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#e2dbd6">${escH(r.name)}</div>
      <div style="font-size:12px;color:${color};font-weight:600;margin-bottom:4px">${r.visited ? '✅ Já fomos' : '📍 Quero ir'}${starsText}</div>
      ${tagNames ? `<div style="font-size:11px;color:#888;margin-bottom:4px">${tagNames}</div>` : ''}
      ${r.note ? `<div style="font-size:12px;font-style:italic;color:#aaa;margin-bottom:4px">"${escH(r.note)}"</div>` : ''}
      ${r.link ? `<a href="${escH(r.link)}" target="_blank" style="font-size:11px;color:${color};text-decoration:none">📍 Ver no Maps</a>` : ''}
    </div>`;
    const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(state.leafletMap);
    marker.bindPopup(popup, { maxWidth: 220 });
    state.mapMarkers.push(marker);
  }

  navigator.geolocation.getCurrentPosition(
    pos => state.leafletMap.setView([pos.coords.latitude, pos.coords.longitude], 14),
    () => state.leafletMap.setView([-8.0476, -34.8770], 13)
  );
  state.leafletMap.invalidateSize();
}

export function initRestaurants() {
  buildHalfStarSelector(document.getElementById('addStarRow'), 0, v => { state.addStars = v; });
  document.getElementById('restVisitedToggle').addEventListener('change', toggleVisitedForm);
  document.getElementById('addRestBtn').addEventListener('click', handleAddRest);
  document.getElementById('restName').addEventListener('keydown', e => e.key === 'Enter' && handleAddRest());
  document.getElementById('restSearch').addEventListener('input', renderRestaurants);
  document.getElementById('mapToggleBtn').addEventListener('click', toggleMap);
}
