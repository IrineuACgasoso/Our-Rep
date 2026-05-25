import { ref, push, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { showToast, escH, domain, compressImage } from './utils.js';

async function fetchOG(url) {
  const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
  const j = await r.json();
  const doc = new DOMParser().parseFromString(j.contents || '', 'text/html');
  const base = new URL(url);
  let title = doc.querySelector('meta[property="og:title"]')?.content || doc.querySelector('title')?.textContent || '';
  let image = doc.querySelector('meta[property="og:image"]')?.content || '';
  if (image && image.startsWith('/')) image = base.origin + image;
  return { title: title.trim().slice(0, 120), image };
}

function setPendingImage(b64, name) {
  state.pendingImage = b64;
  document.getElementById('dropPrompt').style.display = 'none';
  document.getElementById('dropPreview').style.display = 'block';
  document.getElementById('imgPreviewEl').src = b64;
  document.getElementById('imgPreviewName').textContent = name || 'imagem colada';
}

function clearImage(e) {
  e?.stopPropagation();
  state.pendingImage = null;
  document.getElementById('dropPrompt').style.display = 'block';
  document.getElementById('dropPreview').style.display = 'none';
  document.getElementById('imgPreviewEl').src = '';
  document.getElementById('imgFileInput').value = '';
}

function setGiftLoading(on) {
  state.fetchingGift = on;
  document.getElementById('addGiftBtn').disabled = on;
  document.getElementById('addGiftBtnInner').innerHTML = on ? '<div class="spinner"></div>' : '+ Adicionar';
}

function showGiftError(m) {
  const e = document.getElementById('giftErrMsg');
  e.textContent = m;
  e.style.display = m ? 'block' : 'none';
}

export function updateGiftCounts() {
  document.getElementById('count-mine').textContent = Object.keys(state.giftsData.mine).length;
  document.getElementById('count-hers').textContent = Object.keys(state.giftsData.hers).length;
}

function bindGiftEditorImage(editorEl, existingImage) {
  const input = editorEl.querySelector('[data-edit-img-input]');
  const prompt = editorEl.querySelector('[data-edit-img-prompt]');
  const preview = editorEl.querySelector('[data-edit-img-preview]');
  const imgEl = editorEl.querySelector('[data-edit-img-el]');
  const clearBtn = editorEl.querySelector('[data-edit-img-clear]');

  if (existingImage) {
    editorEl.dataset.newImage = existingImage;
    prompt.style.display = 'none';
    preview.style.display = 'block';
    imgEl.src = existingImage;
  }

  input?.addEventListener('change', async () => {
    const f = input.files[0];
    if (!f) return;
    const b64 = await compressImage(f);
    editorEl.dataset.newImage = b64;
    prompt.style.display = 'none';
    preview.style.display = 'block';
    imgEl.src = b64;
  });
  clearBtn?.addEventListener('click', e => {
    e.stopPropagation();
    delete editorEl.dataset.newImage;
    prompt.style.display = 'block';
    preview.style.display = 'none';
    imgEl.src = '';
    input.value = '';
  });
}

function openGiftEditor(key) {
  const editorId = `gift-editor-${key}`;
  const existing = document.getElementById(editorId);
  if (existing) { existing.remove(); document.querySelector(`[data-gift-key="${key}"]`)?.classList.remove('editing'); return; }

  const g = state.giftsData[state.activeGiftTab][key];
  const card = document.querySelector(`[data-gift-key="${key}"]`);
  if (!card || !g) return;

  card.classList.add('editing');
  const div = document.createElement('div');
  div.className = 'inline-editor';
  div.id = editorId;
  div.innerHTML = `
    <div class="inline-editor-title">✏️ Editar presente</div>
    <div class="editor-row">
      <input class="field-inp" type="text" id="edit-gift-title-${key}" value="${escH(g.title)}" placeholder="Nome do presente *" style="width:100%" />
    </div>
    <div class="img-drop-zone" style="margin-top:8px">
      <input type="file" accept="image/*" data-edit-img-input />
      <div data-edit-img-prompt><p>📷 Trocar foto</p><span>Deixe em branco para manter a atual</span></div>
      <div data-edit-img-preview style="display:none"><div class="img-preview-wrap">
        <img class="img-preview" data-edit-img-el alt="" />
        <button type="button" class="img-clear-btn" data-edit-img-clear>✕</button>
      </div></div>
    </div>
    <div class="editor-actions">
      <button type="button" class="editor-cancel" data-gift-cancel="${key}">Cancelar</button>
      <button type="button" class="editor-save" data-gift-save="${key}">Salvar</button>
    </div>`;

  card.appendChild(div);
  bindGiftEditorImage(div, g.image || '');
  div.querySelector(`[data-gift-cancel="${key}"]`).addEventListener('click', e => { e.stopPropagation(); openGiftEditor(key); });
  div.querySelector(`[data-gift-save="${key}"]`).addEventListener('click', e => { e.stopPropagation(); saveGiftEditor(key); });
}

async function saveGiftEditor(key) {
  const editor = document.getElementById(`gift-editor-${key}`);
  const g = state.giftsData[state.activeGiftTab][key];
  const title = document.getElementById(`edit-gift-title-${key}`)?.value.trim();
  if (!title) { showToast('O nome não pode estar vazio.'); return; }
  const image = editor?.dataset.newImage !== undefined ? (editor.dataset.newImage || '') : (g.image || '');
  try {
    await update(ref(db, `gifts/${state.activeGiftTab}/${key}`), { title, image });
    showToast('Presente atualizado! ✓');
    document.getElementById(`gift-editor-${key}`)?.remove();
    document.querySelector(`[data-gift-key="${key}"]`)?.classList.remove('editing');
  } catch {
    showToast('Erro ao salvar.');
  }
}

export function renderGiftsGrid() {
  const grid = document.getElementById('giftsGrid');
  const entries = Object.entries(state.giftsData[state.activeGiftTab])
    .sort((a, b) => (b[1].addedAt || 0) - (a[1].addedAt || 0));
  if (!entries.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">${state.activeGiftTab === 'mine' ? '💙' : '🩷'}</div><p>Nenhum presente ainda</p><span>Cole um link acima para começar!</span></div>`;
    return;
  }
  grid.innerHTML = entries.map(([key, g]) => `
    <div class="gift-card" data-gift-key="${key}">
      <div class="card-top-actions">
        <button type="button" class="edit-btn" data-gift-edit="${key}" title="Editar">✏️</button>
        <button type="button" class="del-btn" data-gift-del="${key}" title="Remover">✕</button>
      </div>
      ${g.image ? `<img class="gift-img" src="${escH(g.image)}" alt="" onerror="this.outerHTML='<div class=gift-img-placeholder>🎁</div>'">` : `<div class="gift-img-placeholder">🎁</div>`}
      <div class="gift-info">
        <div class="gift-title">${escH(g.title)}</div>
        ${g.url ? `<div class="gift-domain">${escH(domain(g.url))}</div>` : ''}
      </div>
    </div>`).join('');

  grid.querySelectorAll('.gift-card').forEach(card => {
    const key = card.dataset.giftKey;
    const g = state.giftsData[state.activeGiftTab][key];
    card.addEventListener('click', e => {
      if (e.target.closest('.card-top-actions, .inline-editor')) return;
      if (g?.url) window.open(g.url, '_blank');
    });
  });
  grid.querySelectorAll('[data-gift-edit]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openGiftEditor(btn.dataset.giftEdit); });
  });
  grid.querySelectorAll('[data-gift-del]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); removeGift(btn.dataset.giftDel); });
  });
}

export function setGiftTab(tab) {
  state.activeGiftTab = tab;
  document.getElementById('tab-mine').classList.toggle('active', tab === 'mine');
  document.getElementById('tab-hers').classList.toggle('active', tab === 'hers');
  document.getElementById('gift-add-title').textContent =
    tab === 'mine' ? 'Adicionar presente (Caio)' : 'Adicionar presente (Clarice)';
  renderGiftsGrid();
}

async function handleAddGift() {
  if (state.fetchingGift) return;
  showGiftError('');
  let rawUrl = document.getElementById('urlInp').value.trim();
  const customName = document.getElementById('nameInp').value.trim();
  if (!rawUrl && !customName) { showGiftError('Informe um link ou o nome do presente.'); return; }
  if (rawUrl && !rawUrl.startsWith('http')) rawUrl = 'https://' + rawUrl;
  if (rawUrl) { try { new URL(rawUrl); } catch { showGiftError('Link inválido.'); return; } }
  setGiftLoading(true);
  let title = customName, image = state.pendingImage || '';
  if (rawUrl) {
    try {
      const og = await fetchOG(rawUrl);
      if (!title) title = og.title || new URL(rawUrl).hostname;
      if (!image) image = og.image;
    } catch {
      if (!title) title = rawUrl;
    }
  }
  if (!title) title = 'Presente';
  try {
    await push(ref(db, `gifts/${state.activeGiftTab}`), { url: rawUrl || '', title, image, addedAt: Date.now() });
    document.getElementById('urlInp').value = '';
    document.getElementById('nameInp').value = '';
    clearImage();
    showToast('Presente adicionado! 🎁');
  } catch {
    showGiftError('Erro ao salvar.');
  }
  setGiftLoading(false);
}

async function removeGift(key) {
  try {
    await remove(ref(db, `gifts/${state.activeGiftTab}/${key}`));
    showToast('Removido.');
  } catch {
    showGiftError('Erro.');
  }
}

export function initGifts() {
  document.getElementById('tab-mine').addEventListener('click', () => setGiftTab('mine'));
  document.getElementById('tab-hers').addEventListener('click', () => setGiftTab('hers'));
  document.getElementById('addGiftBtn').addEventListener('click', handleAddGift);
  document.getElementById('urlInp').addEventListener('keydown', e => e.key === 'Enter' && handleAddGift());
  document.getElementById('nameInp').addEventListener('keydown', e => e.key === 'Enter' && handleAddGift());
  document.getElementById('imgClearBtn').addEventListener('click', clearImage);

  const zone = document.getElementById('dropZone');
  document.getElementById('imgFileInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (file) setPendingImage(await compressImage(file), file.name);
  });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', async e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) setPendingImage(await compressImage(f), f.name);
  });
  document.addEventListener('paste', async e => {
    if (state.activeSection !== 'gifts') return;
    const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
    if (item) setPendingImage(await compressImage(item.getAsFile()), 'imagem colada');
  });
}
