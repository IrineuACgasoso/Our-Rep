import { ref, push, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { showToast, esc, escH, domain, compressImage } from './utils.js';

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
      ${g.image ? `<img class="gift-img" src="${escH(g.image)}" alt="" onerror="this.outerHTML='<div class=gift-img-placeholder>🎁</div>'">` : `<div class="gift-img-placeholder">🎁</div>`}
      <div class="gift-info">
        <div class="gift-title">${escH(g.title)}</div>
        ${g.url ? `<div class="gift-domain">${escH(domain(g.url))}</div>` : ''}
      </div>
      <button type="button" class="del-btn" data-gift-del="${key}">✕</button>
    </div>`).join('');

  grid.querySelectorAll('.gift-card').forEach(card => {
    const key = card.dataset.giftKey;
    const g = state.giftsData[state.activeGiftTab][key];
    card.addEventListener('click', e => {
      if (e.target.closest('[data-gift-del]')) return;
      if (g?.url) window.open(g.url, '_blank');
    });
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
