import { ref, push, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase.js';
import { state, DEST_CATS } from './state.js';
import { showToast, escH } from './utils.js';

function showTravelError(m) {
  const e = document.getElementById('travelErrMsg');
  e.textContent = m;
  e.style.display = m ? 'block' : 'none';
}

function buildDestCardInner(destKey, dest) {
  const cats = dest.cats || {};
  const catKeys = Object.keys(cats);
  if (!catKeys.length) {
    return `<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-muted)">Sem categorias.</div>`;
  }
  const activeCat = state.activeCats[destKey] || catKeys[0];
  const tabsHtml = catKeys.map(ck =>
    `<button type="button" class="dest-cat-btn ${ck === activeCat ? 'active' : ''}" data-dest="${destKey}" data-cat="${ck}">${escH(cats[ck].label || ck)}</button>`
  ).join('');
  const items = cats[activeCat]?.items || {};
  const itemsHtml = Object.entries(items).sort((a, b) => (a[1].addedAt || 0) - (b[1].addedAt || 0)).map(([ik, it]) => `
    <div class="dest-item">
      <div class="dest-item-dot"></div>
      <div class="dest-item-text">${escH(it.text)}</div>
      <button type="button" class="dest-item-del" data-dest="${destKey}" data-cat="${activeCat}" data-item="${ik}">✕</button>
    </div>`).join('') ||
    `<div style="padding:12px 0;font-size:12px;color:var(--text-muted)">Nenhum item ainda.</div>`;
  return `<div class="dest-cats">${tabsHtml}</div><div class="dest-items">${itemsHtml}
    <div class="dest-add-item">
      <input class="dest-add-input" id="inp-${destKey}-${activeCat}" type="text" placeholder="Adicionar item..." />
      <button type="button" class="dest-add-input-btn" data-dest="${destKey}" data-cat="${activeCat}">＋</button>
    </div></div>`;
}

function bindDestCardEvents(cardEl, destKey) {
  cardEl.querySelectorAll('.dest-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeCats[destKey] = btn.dataset.cat;
      renderDestCard(destKey);
    });
  });
  cardEl.querySelectorAll('.dest-item-del').forEach(btn => {
    btn.addEventListener('click', () => removeDestItem(btn.dataset.dest, btn.dataset.cat, btn.dataset.item));
  });
  const inp = cardEl.querySelector('.dest-add-input');
  const addBtn = cardEl.querySelector('.dest-add-input-btn');
  if (inp && addBtn) {
    const cat = addBtn.dataset.cat;
    inp.addEventListener('keydown', e => e.key === 'Enter' && addDestItem(destKey, cat));
    addBtn.addEventListener('click', () => addDestItem(destKey, cat));
  }
}

function renderDestCard(destKey) {
  const dest = state.travelsData[destKey];
  const cardEl = document.querySelector(`[data-dest-key="${destKey}"]`);
  if (!cardEl || !dest) return;
  const headerHtml = cardEl.querySelector('.dest-header')?.outerHTML ||
    `<div class="dest-header"><span class="dest-name">📍 ${escH(dest.name)}</span><button type="button" class="dest-del" data-dest-del="${destKey}">Remover</button></div>`;
  cardEl.innerHTML = headerHtml + buildDestCardInner(destKey, dest);
  cardEl.querySelector('[data-dest-del]')?.addEventListener('click', () => removeDest(destKey));
  bindDestCardEvents(cardEl, destKey);
}

export function renderTravels() {
  const grid = document.getElementById('destinationsGrid');
  const entries = Object.entries(state.travelsData).sort((a, b) => (a[1].addedAt || 0) - (b[1].addedAt || 0));
  if (!entries.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">✈️</div><p>Nenhum destino ainda</p><span>Adicione um destino acima!</span></div>`;
    return;
  }
  grid.innerHTML = entries.map(([key, dest]) => `
    <div class="dest-card" data-dest-key="${key}">
      <div class="dest-header">
        <span class="dest-name">📍 ${escH(dest.name)}</span>
        <button type="button" class="dest-del" data-dest-del="${key}">Remover</button>
      </div>
      ${buildDestCardInner(key, dest)}
    </div>`).join('');

  entries.forEach(([key]) => {
    const card = grid.querySelector(`[data-dest-key="${key}"]`);
    card?.querySelector('[data-dest-del]')?.addEventListener('click', () => removeDest(key));
    if (card) bindDestCardEvents(card, key);
  });
}

async function handleAddDest() {
  const name = document.getElementById('destName').value.trim();
  if (!name) { showTravelError('Informe o nome do destino.'); return; }
  showTravelError('');
  try {
    const cats = {};
    DEST_CATS.forEach(c => {
      cats[btoa(encodeURIComponent(c)).slice(0, 12)] = { label: c, items: {} };
    });
    await push(ref(db, 'travels'), { name, cats, addedAt: Date.now() });
    document.getElementById('destName').value = '';
    showToast('Destino adicionado! ✈️');
  } catch {
    showTravelError('Erro ao salvar.');
  }
}

async function removeDest(key) {
  try {
    await remove(ref(db, `travels/${key}`));
    showToast('Removido.');
  } catch {
    showToast('Erro.');
  }
}

async function addDestItem(destKey, catKey) {
  const inp = document.getElementById(`inp-${destKey}-${catKey}`);
  const text = inp?.value.trim();
  if (!text) return;
  try {
    await push(ref(db, `travels/${destKey}/cats/${catKey}/items`), { text, addedAt: Date.now() });
    inp.value = '';
  } catch {
    showToast('Erro.');
  }
}

async function removeDestItem(destKey, catKey, itemKey) {
  try {
    await remove(ref(db, `travels/${destKey}/cats/${catKey}/items/${itemKey}`));
  } catch {
    showToast('Erro.');
  }
}

export function initTravels() {
  document.getElementById('addDestBtn').addEventListener('click', handleAddDest);
  document.getElementById('destName').addEventListener('keydown', e => e.key === 'Enter' && handleAddDest());
}
