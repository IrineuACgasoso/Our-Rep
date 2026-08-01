import { ref, push, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase.js';
import { state, TRAVEL_CATS } from './state.js';
import { showToast, escH, compressImage, renderStarsHtml } from './utils.js';
import { pushView, popView } from './navstack.js';

/** Categorias vazias para um destino novo */
export function createEmptyTravelCats() {
  const cats = {};
  TRAVEL_CATS.forEach(c => { cats[c.key] = { label: c.label, items: {} }; });
  return cats;
}

function showTravelError(m) {
  const e = document.getElementById('travelErrMsg');
  if (!e) return;
  e.textContent = m;
  e.style.display = m ? 'block' : 'none';
}

function getDest(key) {
  return state.travelsData[key];
}

function getCatItems(dest, catKey) {
  const cats = dest?.cats || {};
  const cat = cats[catKey] || Object.values(cats).find(c => c.label === TRAVEL_CATS.find(t => t.key === catKey)?.label);
  return cat?.items || {};
}

function resolveCatPath(travelKey, catKey) {
  const dest = getDest(travelKey);
  if (dest?.cats?.[catKey]) return catKey;
  const label = TRAVEL_CATS.find(c => c.key === catKey)?.label;
  const found = Object.entries(dest?.cats || {}).find(([, c]) => c.label === label);
  return found ? found[0] : catKey;
}

function itemDbPath(travelKey, catKey, itemKey) {
  const pathKey = resolveCatPath(travelKey, catKey);
  return `travels/${travelKey}/cats/${pathKey}/items/${itemKey}`;
}

/** Vincula upload de imagem num editor inline e habilita drag&drop + ctrl+v/copy */
function bindEditorImage(editorEl, existingImage = '') {
  const input = editorEl.querySelector('[data-edit-img-input]');
  const prompt = editorEl.querySelector('[data-edit-img-prompt]');
  const preview = editorEl.querySelector('[data-edit-img-preview]');
  const imgEl = editorEl.querySelector('[data-edit-img-el]');
  const clearBtn = editorEl.querySelector('[data-edit-img-clear]');
  const dropZone = editorEl.querySelector('.img-drop-zone') || editorEl; // fallback

  function showImg(b64) {
    editorEl.dataset.newImage = b64;
    if (prompt) prompt.style.display = 'none';
    if (preview) preview.style.display = 'block';
    if (imgEl) imgEl.src = b64;
  }

  function clearImg() {
    editorEl.dataset.newImage = '';
    if (prompt) prompt.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (imgEl) imgEl.src = '';
    if (input) input.value = '';
  }

  if (existingImage) {
    showImg(existingImage);
  } else {
    clearImg();
  }

  // File change
  input?.addEventListener('change', async () => {
    const f = input.files[0];
    if (!f) return;
    const b64 = await compressImage(f);
    showImg(b64);
  });

  clearBtn?.addEventListener('click', e => {
    e.stopPropagation();
    clearImg();
  });

  // Drag & drop support
  if (dropZone) {
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', async e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith('image/')) {
        showImg(await compressImage(f));
      }
    });
  }

  // Paste/ctrl+v/copy support
  editorEl.addEventListener('paste', async e => {
    if (!e.clipboardData) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          showImg(await compressImage(file));
          e.preventDefault();
          return;
        }
      }
      // Allow copy/paste of image URLs (not just files)
      if (item.kind === 'string' && item.type === 'text/plain') {
        item.getAsString(async str => {
          if (/^data:image\/|^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(str.trim())) {
            showImg(str.trim());
            e.preventDefault();
            return;
          }
        });
      }
    }
  });
}

function getEditorImage(editorEl, fallback = '') {
  return editorEl?.dataset.newImage !== undefined ? editorEl.dataset.newImage : fallback;
}

function itemActionBtns(itemKey, editable = true) {
  const edit = editable
    ? `<button type="button" class="travel-item-edit" data-travel-item-edit="${itemKey}" title="Editar">✏️</button>`
    : '';
  return `<div class="travel-item-actions">${edit}<button type="button" class="travel-item-del" data-travel-item-del="${itemKey}">✕</button></div>`;
}

// ── Lista / navegação ──

function showListView(fromPopstate = false) {
  state.activeTravelKey = null;
  document.getElementById('travelsListView')?.removeAttribute('hidden');
  document.getElementById('travelDetailView')?.setAttribute('hidden', '');
  if (!fromPopstate) popView('travel-detail');
  renderTravelsList();
}

export function openTravelDetail(key) {
  state.activeTravelKey = key;
  state.activeTravelCat = 'culinaria';
  document.getElementById('travelsListView')?.setAttribute('hidden', '');
  document.getElementById('travelDetailView')?.removeAttribute('hidden');
  pushView('travel-detail', () => showListView(true));
  renderTravelDetail();
}

export function renderTravels() {
  if (state.activeTravelKey && state.activeSection === 'travels') {
    renderTravelDetail();
  } else {
    showListView();
  }
}

function renderTravelsList() {
  const grid = document.getElementById('destinationsGrid');
  if (!grid) return;
  const entries = Object.entries(state.travelsData).sort((a, b) => (a[1].addedAt || 0) - (b[1].addedAt || 0));
  if (!entries.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">✈️</div><p>Nenhum destino ainda</p><span>Adicione um destino acima!</span></div>`;
    return;
  }
  grid.innerHTML = entries.map(([key, dest]) => {
    const img = dest.image
      ? `<img class="dest-tile-img" src="${escH(dest.image)}" alt="" />`
      : `<div class="dest-tile-placeholder">✈️</div>`;
    return `<article class="dest-tile" data-open-travel="${key}" tabindex="0">
      ${img}
      <div class="dest-tile-name">${escH(dest.name)}</div>
    </article>`;
  }).join('');

  grid.querySelectorAll('[data-open-travel]').forEach(el => {
    el.addEventListener('click', () => openTravelDetail(el.dataset.openTravel));
    el.addEventListener('keydown', e => { if (e.key === 'Enter') openTravelDetail(el.dataset.openTravel); });
  });
}

// ── Capa do destino (formulário de adicionar) ──

function setDestCoverPreview(b64, name) {
  state.pendingDestCover = b64;
  document.getElementById('destCoverPrompt').style.display = 'none';
  document.getElementById('destCoverPreview').style.display = 'block';
  document.getElementById('destCoverPreviewImg').src = b64;
  document.getElementById('destCoverPreviewName').textContent = name || 'imagem';
}

function clearDestCover() {
  state.pendingDestCover = null;
  document.getElementById('destCoverPrompt').style.display = 'block';
  document.getElementById('destCoverPreview').style.display = 'none';
  document.getElementById('destCoverPreviewImg').src = '';
  document.getElementById('destCoverInput').value = '';
}

// DRAG & DROP and CTRL+V support for adição de presente / capa do destino

(function setupCoverDropArea() {
  // called only once on first usage
  let coverDropArea;

  // debounce helper for pasting
  let lastPaste = 0;

  function setImageFromFile(f) {
    if (f && f.type && f.type.startsWith('image/')) {
      compressImage(f).then(b64 => setDestCoverPreview(b64, f.name));
    }
  }

  function setImageFromUrl(url) {
    setDestCoverPreview(url, 'imagem');
  }

  function onDrop(e) {
    e.preventDefault();
    coverDropArea.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) setImageFromFile(f);
  }

  function onPaste(e) {
    if (Date.now() - lastPaste < 50) return; // prevent double fires
    lastPaste = Date.now();
    let handled = false;

    if (!e.clipboardData) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        setImageFromFile(file);
        handled = true;
        break;
      }
      if (item.kind === 'string' && item.type === 'text/plain') {
        item.getAsString(str => {
          str = str.trim();
          if (/^data:image\/|^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(str)) {
            setImageFromUrl(str);
          }
        });
        handled = true;
        break;
      }
    }

    if (handled) e.preventDefault();
  }

  // Allow user to click on preview image to reselect image
  function onClickPreview(e) {
    const input = document.getElementById('destCoverInput');
    input?.click();
  }

  // Add listeners at DOMContentLoaded (initTravels)
  function activateCoverDropArea() {
    coverDropArea = document.getElementById('destCoverDrop');
    if (!coverDropArea) return;
    // drag&drop
    coverDropArea.addEventListener('dragover', e => { e.preventDefault(); coverDropArea.classList.add('drag-over'); });
    coverDropArea.addEventListener('dragleave', () => coverDropArea.classList.remove('drag-over'));
    coverDropArea.addEventListener('drop', onDrop);

    // paste (ctrl+v)
    coverDropArea.addEventListener('paste', onPaste);
    // let user paste everywhere in add-destination section
    const section = document.getElementById('addDestSection');
    if (section) section.addEventListener('paste', onPaste);
    // click on preview image = upload again
    document.getElementById('destCoverPreviewImg')?.addEventListener('click', onClickPreview);
  }

  // Immediately activate on module load, but will be safe if missing
  if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', activateCoverDropArea);
  } else {
    activateCoverDropArea();
  }
})();

async function handleAddDest() {
  const name = document.getElementById('destName').value.trim();
  if (!name) { showTravelError('Informe o nome do destino.'); return; }
  showTravelError('');
  try {
    await push(ref(db, 'travels'), {
      name,
      image: state.pendingDestCover || '',
      cats: createEmptyTravelCats(),
      addedAt: Date.now()
    });
    document.getElementById('destName').value = '';
    clearDestCover();
    showToast('Destino adicionado! ✈️');
  } catch {
    showTravelError('Erro ao salvar.');
  }
}

async function removeDest(key) {
  if (!confirm('Remover este destino e tudo o que está dentro?')) return;
  try {
    await remove(ref(db, `travels/${key}`));
    showToast('Destino removido.');
    showListView();
  } catch {
    showToast('Erro ao remover.');
  }
}

function closeDestEditor() {
  document.getElementById('travelDestEditorSlot').innerHTML = '';
}

function toggleDestEditor() {
  const key = state.activeTravelKey;
  const dest = getDest(key);
  if (!dest) return;
  const slot = document.getElementById('travelDestEditorSlot');
  if (slot.querySelector('.inline-editor')) { closeDestEditor(); return; }

  slot.innerHTML = `<div class="inline-editor travel-dest-editor" id="travel-dest-editor">
    <div class="inline-editor-title">✏️ Editar destino</div>
    <div class="editor-row">
      <input class="field-inp" type="text" id="editDestName" value="${escH(dest.name)}" placeholder="Nome do destino *" style="width:100%" />
    </div>
    <div class="img-drop-zone" style="margin-top:8px">
      <input type="file" accept="image/*" data-edit-img-input />
      <div data-edit-img-prompt><p>🖼️ Trocar imagem de capa</p></div>
      <div data-edit-img-preview style="display:none"><div class="img-preview-wrap">
        <img class="img-preview" data-edit-img-el alt="" />
        <button type="button" class="img-clear-btn" data-edit-img-clear>✕</button>
      </div></div>
    </div>
    <div class="editor-actions">
      <button type="button" class="editor-cancel" id="cancelDestEdit">Cancelar</button>
      <button type="button" class="editor-save" id="saveDestEdit">Salvar</button>
    </div>
  </div>`;

  const editor = document.getElementById('travel-dest-editor');
  bindEditorImage(editor, dest.image || '');
  document.getElementById('cancelDestEdit').addEventListener('click', closeDestEditor);
  document.getElementById('saveDestEdit').addEventListener('click', () => saveDestEditor(key));
}

async function saveDestEditor(key) {
  const editor = document.getElementById('travel-dest-editor');
  const dest = getDest(key);
  const name = document.getElementById('editDestName')?.value.trim();
  if (!name) { showToast('Informe o nome do destino.'); return; }
  const image = getEditorImage(editor, dest.image || '');
  try {
    await update(ref(db, `travels/${key}`), { name, image });
    closeDestEditor();
    showToast('Destino atualizado! ✓');
    renderTravelDetail();
  } catch {
    showToast('Erro ao salvar.');
  }
}

// ── Detalhe do destino ──

function renderTravelDetail() {
  const key = state.activeTravelKey;
  const dest = getDest(key);
  if (!dest) { showListView(); return; }

  closeDestEditor();

  const hero = document.getElementById('travelDetailHero');
  hero.innerHTML = dest.image
    ? `<img class="travel-hero-img" src="${escH(dest.image)}" alt="" /><div class="travel-hero-name">${escH(dest.name)}</div>`
    : `<div class="travel-hero-placeholder">✈️</div><div class="travel-hero-name">${escH(dest.name)}</div>`;

  const tabs = document.getElementById('travelCatTabs');
  tabs.innerHTML = TRAVEL_CATS.map(c =>
    `<button type="button" class="travel-cat-tab ${state.activeTravelCat === c.key ? 'active' : ''}" data-cat="${c.key}">${c.label}</button>`
  ).join('');
  tabs.querySelectorAll('.travel-cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTravelCat = btn.dataset.cat;
      renderTravelDetail();
    });
  });

  renderTravelAddPanel(key, dest);
  renderTravelItems(key, dest);
}

function renderTravelAddPanel(travelKey, dest) {
  const panel = document.getElementById('travelAddPanel');
  const cat = state.activeTravelCat;

  if (cat === 'culinaria') {
    panel.innerHTML = `
      <h4>Adicionar em Culinária</h4>
      <div class="travel-type-btns">
        <button type="button" class="travel-type-btn active" data-culinaria-type="food">🍽️ Comida</button>
        <button type="button" class="travel-type-btn" data-culinaria-type="restaurant">📍 Restaurante</button>
      </div>
      <div id="culinariaFoodForm">
        <div class="input-row" style="margin-bottom:10px">
          <input class="field-inp" id="foodNameInp" type="text" placeholder="Nome da comida *" />
        </div>
        <div class="img-drop-zone" id="foodImgDrop">
          <input type="file" id="foodImgInput" accept="image/*" />
          <div id="foodImgPrompt"><p>📷 Foto da comida</p></div>
          <div id="foodImgPreview" style="display:none"><img class="img-preview" id="foodImgEl" alt="" style="max-width:80px;border-radius:8px" /></div>
          <button type="button" class="img-clear-btn" id="foodImgClear" style="display:none;position:absolute;top:10px;right:10px;z-index:2">✕</button>
        </div>
        <button type="button" class="add-btn" id="addFoodBtn" style="margin-top:12px;width:100%">+ Comida</button>
      </div>
      <div id="culinariaRestForm" style="display:none">
        <p class="travel-hint">Use a aba <strong>Restaurantes</strong> para cadastrar com nome, nota, Maps e status. O restaurante ficará salvo aqui na viagem também.</p>
        <button type="button" class="travel-link-rest-btn" id="goAddRestaurantBtn">Ir para aba Restaurantes →</button>
        <div class="travel-existing-rest">
          <p style="font-size:11px;color:var(--text-muted);margin:8px 0 6px">Ou vincule um já cadastrado:</p>
          <select id="linkExistingRestSelect"><option value="">Selecione...</option></select>
          <button type="button" class="add-btn" id="linkExistingRestBtn" style="margin-top:8px;width:100%">Vincular selecionado</button>
        </div>
      </div>`;
    bindCulinariaPanel(travelKey);
    return;
  }

  if (cat === 'passeios') {
    panel.innerHTML = `
      <h4>Adicionar Passeio</h4>
      <div class="input-row" style="margin-bottom:8px">
        <input class="field-inp" id="tourNameInp" type="text" placeholder="Nome do passeio *" />
      </div>
      <textarea class="field-inp" id="tourNoteInp" rows="2" placeholder="Observações (opcional)" style="width:100%"></textarea>
      <button type="button" class="add-btn" id="addTourBtn" style="margin-top:12px;width:100%">+ Passeio</button>`;
    document.getElementById('addTourBtn')?.addEventListener('click', () => addTourItem(travelKey));
    document.getElementById('tourNameInp')?.addEventListener('keydown', e => e.key === 'Enter' && addTourItem(travelKey));
    return;
  }

  if (cat === 'atracoes') {
    panel.innerHTML = `
      <h4>Adicionar Atração</h4>
      <div class="input-row" style="margin-bottom:10px">
        <input class="field-inp" id="attrNameInp" type="text" placeholder="Nome da atração *" />
      </div>
      <div class="img-drop-zone" id="attrImgDrop">
        <input type="file" id="attrImgInput" accept="image/*" />
        <div id="attrImgPrompt"><p>📷 Foto de exibição (opcional)</p></div>
        <div id="attrImgPreview" style="display:none"><img class="img-preview" id="attrImgEl" alt="" style="max-width:80px;border-radius:8px" /></div>
        <button type="button" class="img-clear-btn" id="attrImgClear" style="display:none;position:absolute;top:10px;right:10px;z-index:2">✕</button>
      </div>
      <button type="button" class="add-btn" id="addAttrBtn" style="margin-top:12px;width:100%">+ Atração</button>`;
    bindAttractionPanel(travelKey);
    return;
  }

  if (cat === 'hospedagem') {
    panel.innerHTML = `
      <h4>Adicionar Hospedagem</h4>
      <div class="input-row" style="margin-bottom:8px">
        <input class="field-inp" id="lodgingNameInp" type="text" placeholder="Nome *" />
      </div>
      <div class="img-drop-zone" id="lodgingImgDrop">
        <input type="file" id="lodgingImgInput" accept="image/*" />
        <div id="lodgingImgPrompt"><p>📷 Imagem do local</p></div>
        <div id="lodgingImgPreview" style="display:none"><img class="img-preview" id="lodgingImgEl" alt="" style="max-width:80px;border-radius:8px" /></div>
        <button type="button" class="img-clear-btn" id="lodgingImgClear" style="display:none;position:absolute;top:10px;right:10px;z-index:2">✕</button>
      </div>
      <div class="input-row" style="margin-top:10px">
        <input class="field-inp" id="lodgingUrlInp" type="url" placeholder="Link de reservas (opcional)" />
      </div>
      <button type="button" class="add-btn" id="addLodgingBtn" style="margin-top:12px;width:100%">+ Hospedagem</button>`;
    bindLodgingPanel(travelKey);
  }
}

let pendingFoodImg = null;
let pendingAttrImg = null;
let pendingLodgingImg = null;

function bindImageDrop(inputId, promptId, previewId, imgElId, onSet) {
  const input = document.getElementById(inputId);
  const prompt = document.getElementById(promptId);
  const preview = document.getElementById(previewId);
  const imgEl = document.getElementById(imgElId);

  // Optional clearBtn (needs to exist if you want clear)
  let clearBtn;
  if (inputId === "foodImgInput") clearBtn = document.getElementById('foodImgClear');
  if (inputId === "attrImgInput") clearBtn = document.getElementById('attrImgClear');
  if (inputId === "lodgingImgInput") clearBtn = document.getElementById('lodgingImgClear');

  function setPreview(b64) {
    onSet(b64);
    if (prompt) prompt.style.display = 'none';
    if (preview) preview.style.display = 'block';
    if (imgEl) imgEl.src = b64;
    if (clearBtn) clearBtn.style.display = 'block';
  }

  function clearPreview() {
    onSet(null);
    if (prompt) prompt.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (imgEl) imgEl.src = '';
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
  }

  input?.addEventListener('change', async () => {
    const f = input.files[0];
    if (!f) return;
    const b64 = await compressImage(f);
    setPreview(b64);
  });

  // Drag & Drop
  const dropZone = input?.closest('.img-drop-zone') || input?.parentElement;
  if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', async e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith('image/')) {
        setPreview(await compressImage(f));
      }
    });
    // Ctrl+V, copy/paste
    dropZone.addEventListener('paste', async e => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setPreview(await compressImage(file));
            e.preventDefault();
            return;
          }
        }
        // Paste image url
        if (item.kind === 'string' && item.type === 'text/plain') {
          item.getAsString(async str => {
            if (/^data:image\/|^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(str.trim())) {
              setPreview(str.trim());
              e.preventDefault();
              return;
            }
          });
        }
      }
    });
  }

  // Clear button support (add if exists)
  clearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearPreview();
  });

  // Initialize clearBtn state
  if (clearBtn) clearBtn.style.display = 'none';
}

function bindCulinariaPanel(travelKey) {
  const foodForm = document.getElementById('culinariaFoodForm');
  const restForm = document.getElementById('culinariaRestForm');
  pendingFoodImg = null;

  document.querySelectorAll('[data-culinaria-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-culinaria-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isFood = btn.dataset.culinariaType === 'food';
      foodForm.style.display = isFood ? 'block' : 'none';
      restForm.style.display = isFood ? 'none' : 'block';
    });
  });

  bindImageDrop('foodImgInput', 'foodImgPrompt', 'foodImgPreview', 'foodImgEl', b64 => { pendingFoodImg = b64; });
  document.getElementById('addFoodBtn')?.addEventListener('click', () => addFoodItem(travelKey));

  document.getElementById('goAddRestaurantBtn')?.addEventListener('click', () => {
    state.pendingTravelRestaurant = { travelKey };
    window.__goRestaurantsForTravel?.();
  });

  const select = document.getElementById('linkExistingRestSelect');
  const rests = Object.entries(state.restaurantsData);
  rests.forEach(([rk, r]) => {
    const opt = document.createElement('option');
    opt.value = rk;
    opt.textContent = r.name || 'Sem nome';
    select?.appendChild(opt);
  });
  if (!rests.length) {
    select.innerHTML = '<option value="">Nenhum restaurante cadastrado</option>';
    document.getElementById('linkExistingRestBtn').disabled = true;
  }
  document.getElementById('linkExistingRestBtn')?.addEventListener('click', () => linkExistingRestaurant(travelKey));
}

async function addFoodItem(travelKey) {
  const name = document.getElementById('foodNameInp')?.value.trim();
  if (!name) { showToast('Informe o nome da comida.'); return; }
  if (!pendingFoodImg) { showToast('Adicione a foto da comida.'); return; }
  try {
    await push(ref(db, `travels/${travelKey}/cats/culinaria/items`), {
      type: 'food', name, image: pendingFoodImg || '', addedAt: Date.now()
    });
    document.getElementById('foodNameInp').value = '';
    pendingFoodImg = null;
    document.getElementById('foodImgPrompt').style.display = 'block';
    document.getElementById('foodImgPreview').style.display = 'none';
    document.getElementById('foodImgEl').src = '';
    document.getElementById('foodImgClear').style.display = 'none';
    showToast('Comida adicionada!');
  } catch {
    showToast('Erro ao salvar.');
  }
}

async function linkExistingRestaurant(travelKey) {
  const rk = document.getElementById('linkExistingRestSelect')?.value;
  if (!rk) { showToast('Selecione um restaurante.'); return; }
  try {
    await push(ref(db, `travels/${travelKey}/cats/culinaria/items`), {
      type: 'restaurant', restaurantKey: rk, addedAt: Date.now()
    });
    showToast('Restaurante vinculado!');
  } catch {
    showToast('Erro ao vincular.');
  }
}

/** Chamado após adicionar restaurante na aba principal */
export async function linkRestaurantToActiveTravel(restaurantKey) {
  const pending = state.pendingTravelRestaurant;
  if (!pending?.travelKey) return false;
  try {
    await push(ref(db, `travels/${pending.travelKey}/cats/culinaria/items`), {
      type: 'restaurant', restaurantKey, addedAt: Date.now()
    });
    const travelKey = pending.travelKey;
    state.pendingTravelRestaurant = null;
    renderTravelRestBanner();
    window.__goTravels?.();
    openTravelDetail(travelKey);
    showToast('Restaurante vinculado à viagem! ✈️');
    return true;
  } catch {
    showToast('Restaurante salvo, mas falhou ao vincular à viagem.');
    return false;
  }
}

export function renderTravelRestBanner() {
  const banner = document.getElementById('travelRestBanner');
  if (!banner) return;
  const pending = state.pendingTravelRestaurant;
  if (!pending || state.activeSection !== 'restaurants') {
    banner.style.display = 'none';
    return;
  }
  const dest = getDest(pending.travelKey);
  banner.style.display = 'flex';
  banner.innerHTML = `
    <p>✈️ Cadastrando restaurante para <strong>${escH(dest?.name || 'viagem')}</strong></p>
    <button type="button" data-cancel-travel-link>Cancelar</button>`;
  banner.querySelector('[data-cancel-travel-link]')?.addEventListener('click', () => {
    state.pendingTravelRestaurant = null;
    banner.style.display = 'none';
    window.__goTravels?.();
  });
}

async function addTourItem(travelKey) {
  const name = document.getElementById('tourNameInp')?.value.trim();
  const note = document.getElementById('tourNoteInp')?.value.trim() || '';
  if (!name) { showToast('Informe o nome do passeio.'); return; }
  try {
    await push(ref(db, `travels/${travelKey}/cats/passeios/items`), {
      type: 'tour', name, note, addedAt: Date.now()
    });
    document.getElementById('tourNameInp').value = '';
    document.getElementById('tourNoteInp').value = '';
    showToast('Passeio adicionado!');
  } catch {
    showToast('Erro ao salvar.');
  }
}

function bindAttractionPanel(travelKey) {
  pendingAttrImg = null;
  bindImageDrop('attrImgInput', 'attrImgPrompt', 'attrImgPreview', 'attrImgEl', b64 => { pendingAttrImg = b64; });
  document.getElementById('addAttrBtn')?.addEventListener('click', () => addAttractionItem(travelKey));
}

async function addAttractionItem(travelKey) {
  const name = document.getElementById('attrNameInp')?.value.trim();
  if (!name) { showToast('Informe o nome da atração.'); return; }
  try {
    await push(ref(db, `travels/${travelKey}/cats/atracoes/items`), {
      type: 'attraction', name, image: pendingAttrImg || '', addedAt: Date.now()
    });
    document.getElementById('attrNameInp').value = '';
    pendingAttrImg = null;
    document.getElementById('attrImgPrompt').style.display = 'block';
    document.getElementById('attrImgPreview').style.display = 'none';
    document.getElementById('attrImgEl').src = '';
    document.getElementById('attrImgClear').style.display = 'none';
    showToast('Atração adicionada!');
  } catch {
    showToast('Erro ao salvar.');
  }
}

function bindLodgingPanel(travelKey) {
  pendingLodgingImg = null;
  bindImageDrop('lodgingImgInput', 'lodgingImgPrompt', 'lodgingImgPreview', 'lodgingImgEl', b64 => { pendingLodgingImg = b64; });
  document.getElementById('addLodgingBtn')?.addEventListener('click', () => addLodgingItem(travelKey));
}

async function addLodgingItem(travelKey) {
  const name = document.getElementById('lodgingNameInp')?.value.trim();
  const bookingUrl = document.getElementById('lodgingUrlInp')?.value.trim() || '';
  if (!name) { showToast('Informe o nome da hospedagem.'); return; }
  if (!pendingLodgingImg) { showToast('Adicione a imagem da hospedagem.'); return; }
  try {
    await push(ref(db, `travels/${travelKey}/cats/hospedagem/items`), {
      type: 'lodging', name, image: pendingLodgingImg || '', bookingUrl, addedAt: Date.now()
    });
    document.getElementById('lodgingNameInp').value = '';
    document.getElementById('lodgingUrlInp').value = '';
    pendingLodgingImg = null;
    document.getElementById('lodgingImgPrompt').style.display = 'block';
    document.getElementById('lodgingImgPreview').style.display = 'none';
    document.getElementById('lodgingImgEl').src = '';
    document.getElementById('lodgingImgClear').style.display = 'none';
    showToast('Hospedagem adicionada!');
  } catch {
    showToast('Erro ao salvar.');
  }
}

function renderTravelItems(travelKey, dest) {
  const list = document.getElementById('travelItemsList');
  const catKey = state.activeTravelCat;
  const items = Object.entries(getCatItems(dest, catKey)).sort((a, b) => (a[1].addedAt || 0) - (b[1].addedAt || 0));

  if (!items.length) {
    list.innerHTML = `<div class="empty-state" style="padding:2rem 0"><p style="font-size:14px;color:var(--text-muted)">Nada nesta categoria ainda</p></div>`;
    return;
  }

  list.innerHTML = items.map(([ik, it]) => renderTravelItemCard(travelKey, catKey, ik, it)).join('');

  list.querySelectorAll('[data-travel-item-edit]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openTravelItemEditor(travelKey, catKey, btn.dataset.travelItemEdit);
    });
  });
  list.querySelectorAll('[data-travel-item-del]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      // Adicionando confirmação para remoção do item
      const nomeItem = btn.closest('.travel-item-card')?.querySelector('.travel-item-title')?.textContent?.trim();
      let confirmMsg = 'Tem certeza que deseja remover este item? Esta ação não poderá ser desfeita.';
      if (nomeItem) confirmMsg = `Remover "${nomeItem}"? Essa ação não poderá ser desfeita.`;
      if (!confirm(confirmMsg)) return;
      removeTravelItem(travelKey, catKey, btn.dataset.travelItemDel);
    });
  });
  list.querySelectorAll('[data-rest-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = btn.dataset.restOpen;
      if (link) window.open(link, '_blank');
    });
  });
  list.querySelectorAll('[data-booking-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.bookingOpen;
      if (url) window.open(url.startsWith('http') ? url : 'https://' + url, '_blank');
    });
  });
}

async function removeTravelItem(travelKey, catKey, itemKey) {
  // A confirmação já foi feita no handler do botão agora
  const pathKey = resolveCatPath(travelKey, catKey);
  try {
    await remove(ref(db, `travels/${travelKey}/cats/${pathKey}/items/${itemKey}`));
    document.getElementById(`travel-item-editor-${itemKey}`)?.remove();
    showToast('Removido.');
  } catch {
    showToast('Erro ao remover.');
  }
}

function openTravelItemEditor(travelKey, catKey, itemKey) {
  const editorId = `travel-item-editor-${itemKey}`;
  if (document.getElementById(editorId)) {
    document.getElementById(editorId).remove();
    return;
  }

  const dest = getDest(travelKey);
  const pathKey = resolveCatPath(travelKey, catKey);
  const it = dest?.cats?.[pathKey]?.items?.[itemKey] || getCatItems(dest, catKey)[itemKey];
  const card = document.querySelector(`[data-travel-item="${itemKey}"]`);
  if (!card || !it) return;

  const div = document.createElement('div');
  div.className = 'inline-editor';
  div.id = editorId;
  div.style.margin = '0';
  div.style.borderRadius = '0 0 12px 12px';

  if (it.type === 'food' || (catKey === 'culinaria' && it.name && !it.restaurantKey)) {
    div.innerHTML = buildFoodEditorHtml(itemKey, it);
  } else if (it.type === 'attraction' || catKey === 'atracoes') {
    div.innerHTML = buildAttractionEditorHtml(itemKey, it);
  } else if (it.type === 'lodging' || catKey === 'hospedagem') {
    div.innerHTML = buildLodgingEditorHtml(itemKey, it);
  } else if (it.type === 'tour' || catKey === 'passeios') {
    div.innerHTML = buildTourEditorHtml(itemKey, it);
  } else {
    div.innerHTML = buildGenericEditorHtml(itemKey, it);
  }

  card.appendChild(div);
  if (div.querySelector('[data-edit-img-input]')) bindEditorImage(div, it.image || '');
  div.querySelector('[data-item-cancel]')?.addEventListener('click', () => div.remove());
  div.querySelector('[data-item-save]')?.addEventListener('click', () => saveTravelItemEditor(travelKey, catKey, itemKey, it));
}

function buildFoodEditorHtml(itemKey, it) {
  return `<div class="inline-editor-title">✏️ Editar comida</div>
    <input class="field-inp" type="text" id="edit-item-name-${itemKey}" value="${escH(it.name)}" placeholder="Nome *" style="width:100%;margin-bottom:8px" />
    <div class="img-drop-zone"><input type="file" accept="image/*" data-edit-img-input />
      <div data-edit-img-prompt><p>📷 Trocar foto</p></div>
      <div data-edit-img-preview style="display:none"><div class="img-preview-wrap"><img class="img-preview" data-edit-img-el alt="" /><button type="button" class="img-clear-btn" data-edit-img-clear>✕</button></div></div>
    </div>
    <div class="editor-actions"><button type="button" class="editor-cancel" data-item-cancel>Cancelar</button><button type="button" class="editor-save" data-item-save>Salvar</button></div>`;
}

function buildAttractionEditorHtml(itemKey, it) {
  return `<div class="inline-editor-title">✏️ Editar atração</div>
    <input class="field-inp" type="text" id="edit-item-name-${itemKey}" value="${escH(it.name || it.text)}" placeholder="Nome *" style="width:100%;margin-bottom:8px" />
    <div class="img-drop-zone"><input type="file" accept="image/*" data-edit-img-input />
      <div data-edit-img-prompt><p>📷 Foto (opcional)</p></div>
      <div data-edit-img-preview style="display:none"><div class="img-preview-wrap"><img class="img-preview" data-edit-img-el alt="" /><button type="button" class="img-clear-btn" data-edit-img-clear>✕</button></div></div>
    </div>
    <div class="editor-actions"><button type="button" class="editor-cancel" data-item-cancel>Cancelar</button><button type="button" class="editor-save" data-item-save>Salvar</button></div>`;
}

function buildLodgingEditorHtml(itemKey, it) {
  return `<div class="inline-editor-title">✏️ Editar hospedagem</div>
    <input class="field-inp" type="text" id="edit-item-name-${itemKey}" value="${escH(it.name)}" placeholder="Nome *" style="width:100%;margin-bottom:8px" />
    <div class="img-drop-zone" style="margin-bottom:8px"><input type="file" accept="image/*" data-edit-img-input />
      <div data-edit-img-prompt><p>📷 Trocar imagem</p></div>
      <div data-edit-img-preview style="display:none"><div class="img-preview-wrap"><img class="img-preview" data-edit-img-el alt="" /><button type="button" class="img-clear-btn" data-edit-img-clear>✕</button></div></div>
    </div>
    <input class="field-inp" type="url" id="edit-item-url-${itemKey}" value="${escH(it.bookingUrl || '')}" placeholder="Link de reservas (opcional)" style="width:100%" />
    <div class="editor-actions"><button type="button" class="editor-cancel" data-item-cancel>Cancelar</button><button type="button" class="editor-save" data-item-save>Salvar</button></div>`;
}

function buildTourEditorHtml(itemKey, it) {
  return `<div class="inline-editor-title">✏️ Editar passeio</div>
    <input class="field-inp" type="text" id="edit-item-name-${itemKey}" value="${escH(it.name || it.text)}" placeholder="Nome *" style="width:100%;margin-bottom:8px" />
    <textarea class="field-inp" id="edit-item-note-${itemKey}" rows="2" placeholder="Observações" style="width:100%">${escH(it.note || '')}</textarea>
    <div class="editor-actions"><button type="button" class="editor-cancel" data-item-cancel>Cancelar</button><button type="button" class="editor-save" data-item-save>Salvar</button></div>`;
}

function buildGenericEditorHtml(itemKey, it) {
  return `<div class="inline-editor-title">✏️ Editar item</div>
    <input class="field-inp" type="text" id="edit-item-name-${itemKey}" value="${escH(it.text || it.name || '')}" placeholder="Nome *" style="width:100%" />
    <div class="editor-actions"><button type="button" class="editor-cancel" data-item-cancel>Cancelar</button><button type="button" class="editor-save" data-item-save>Salvar</button></div>`;
}

async function saveTravelItemEditor(travelKey, catKey, itemKey, it) {
  const editor = document.getElementById(`travel-item-editor-${itemKey}`);
  const name = document.getElementById(`edit-item-name-${itemKey}`)?.value.trim();
  if (!name) { showToast('O nome não pode estar vazio.'); return; }

  const updates = { name, addedAt: it.addedAt || Date.now() };
  if (it.type) updates.type = it.type;

  if (it.type === 'food' || (catKey === 'culinaria' && !it.restaurantKey)) {
    updates.type = 'food';
    const image = getEditorImage(editor, it.image || '');
    if (!image) { showToast('A comida precisa de uma foto.'); return; }
    updates.image = image;
  } else if (it.type === 'attraction' || catKey === 'atracoes') {
    updates.type = 'attraction';
    updates.image = getEditorImage(editor, it.image || '');
  } else if (it.type === 'lodging' || catKey === 'hospedagem') {
    updates.type = 'lodging';
    const image = getEditorImage(editor, it.image || '');
    if (!image) { showToast('A hospedagem precisa de uma imagem.'); return; }
    updates.image = image;
    updates.bookingUrl = document.getElementById(`edit-item-url-${itemKey}`)?.value.trim() || '';
  } else if (it.type === 'tour' || catKey === 'passeios') {
    updates.type = 'tour';
    updates.note = document.getElementById(`edit-item-note-${itemKey}`)?.value.trim() || '';
  } else {
    updates.text = name;
  }

  try {
    await update(ref(db, itemDbPath(travelKey, catKey, itemKey)), updates);
    showToast('Salvo! ✓');
    editor?.remove();
  } catch {
    showToast('Erro ao salvar.');
  }
}

function renderTravelItemCard(travelKey, catKey, itemKey, it) {
  const actions = (btnKey, editable) => itemActionBtns(btnKey, editable);

  if (it.type === 'restaurant' || (catKey === 'culinaria' && it.restaurantKey)) {
    const rk = it.restaurantKey;
    const r = state.restaurantsData[rk];
    if (!r) {
      return `<div class="travel-item-card rest-linked" data-travel-item="${itemKey}">${actions(itemKey, false)}
        <div class="travel-rest-inner"><div class="travel-item-title">Restaurante removido</div><span class="travel-item-sub">Referência ${escH(rk)}</span></div></div>`;
    }
    const stars = r.visited && r.stars ? renderStarsHtml(r.stars) : '';
    const linkBtn = r.link
      ? `<button type="button" class="rest-action-btn" data-rest-open="${escH(r.link)}" style="margin-top:8px">📍 Abrir no Maps</button>`
      : '';
    return `<div class="travel-item-card rest-linked" data-travel-item="${itemKey}">${actions(itemKey, false)}
      <div class="travel-rest-inner">
        <div class="travel-item-title">${escH(r.name)}</div>
        <span class="travel-item-badge">${r.visited ? '✓ Já fomos' : 'Quero ir'}</span>
        ${stars ? `<div style="margin-top:6px">${stars}</div>` : ''}
        ${r.note ? `<div class="travel-item-sub" style="font-style:italic;margin-top:6px">"${escH(r.note)}"</div>` : ''}
        ${linkBtn}
        <p class="travel-item-sub" style="margin-top:8px">Edite na aba Restaurantes</p>
      </div></div>`;
  }

  if (it.type === 'food' || (catKey === 'culinaria' && it.name && !it.restaurantKey)) {
    const img = it.image ? `<img class="travel-item-thumb" src="${escH(it.image)}" alt="" />` : '';
    return `<div class="travel-item-card ${it.image ? 'has-img' : ''}" data-travel-item="${itemKey}">${actions(itemKey)}${img}
      <div class="travel-item-body"><div class="travel-item-title">${escH(it.name)}</div><span class="travel-item-badge">Comida</span></div></div>`;
  }

  if (it.type === 'attraction' || catKey === 'atracoes') {
    const img = it.image ? `<img class="travel-item-thumb" src="${escH(it.image)}" alt="" />` : '';
    return `<div class="travel-item-card ${it.image ? 'has-img' : ''}" data-travel-item="${itemKey}">${actions(itemKey)}${img}
      <div class="travel-item-body"><div class="travel-item-title">${escH(it.name || it.text)}</div><span class="travel-item-badge">Atração</span></div></div>`;
  }

  if (it.type === 'lodging' || catKey === 'hospedagem') {
    const img = it.image ? `<img class="travel-item-thumb" src="${escH(it.image)}" alt="" />` : '';
    const book = it.bookingUrl
      ? `<button type="button" class="rest-action-btn" data-booking-open="${escH(it.bookingUrl)}" style="margin-top:8px">🔗 Reservar</button>`
      : '';
    return `<div class="travel-item-card ${it.image ? 'has-img' : ''}" data-travel-item="${itemKey}">${actions(itemKey)}${img}
      <div class="travel-item-body"><div class="travel-item-title">${escH(it.name)}</div>${book}</div></div>`;
  }

  if (it.type === 'tour' || catKey === 'passeios') {
    return `<div class="travel-item-card" data-travel-item="${itemKey}">${actions(itemKey)}
      <div class="travel-item-body"><div class="travel-item-title">${escH(it.name || it.text)}</div>
      ${it.note ? `<div class="travel-item-sub">${escH(it.note)}</div>` : ''}</div></div>`;
  }

  return `<div class="travel-item-card" data-travel-item="${itemKey}">${actions(itemKey)}
    <div class="travel-item-body"><div class="travel-item-title">${escH(it.text || it.name || 'Item')}</div></div></div>`;
}

// ── Init ──

export function initTravels() {
  document.getElementById('addDestBtn')?.addEventListener('click', handleAddDest);
  document.getElementById('destName')?.addEventListener('keydown', e => e.key === 'Enter' && handleAddDest());
  document.getElementById('travelBackBtn')?.addEventListener('click', showListView);
  document.getElementById('travelEditDestBtn')?.addEventListener('click', toggleDestEditor);
  document.getElementById('travelDeleteBtn')?.addEventListener('click', () => {
    if (state.activeTravelKey) {
      // Adicionando confirmação para remoção de destino
      const dest = getDest(state.activeTravelKey);
      let confirmMsg = 'Remover este destino e tudo o que está dentro? Essa ação não poderá ser desfeita.';
      if (dest?.name) confirmMsg = `Tem certeza que deseja remover a viagem "${dest.name}"?\n\nIsso removerá tudo que está dentro e não poderá ser desfeito.`;
      if (confirm(confirmMsg)) removeDest(state.activeTravelKey);
    }
  });

  // O drag/copy/paste/clear está implementado em setupCoverDropArea e bindImageDrop agora, para as duas áreas possíveis

  document.getElementById('destCoverInput')?.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (f) setDestCoverPreview(await compressImage(f), f.name);
  });
  document.getElementById('destCoverClear')?.addEventListener('click', clearDestCover);
  // Os eventos de drag e drop, paste são tratados agora via setupCoverDropArea()

  // Para retrocompatibilidade, se precisar explicitamente:
  const coverDrop = document.getElementById('destCoverDrop');
  if (coverDrop) {
    // Nada necessário, já delegado no setupCoverDropArea()
  }
}
