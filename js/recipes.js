import { ref, push, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { showToast, escH, compressImage } from './utils.js';

function renderIngChips() {
  const wrap = document.getElementById('recipeIngChips');
  wrap.innerHTML = state.draftIngredients.map((ing, i) =>
    `<span class="recipe-ing-chip">${escH(ing)}<button type="button" data-remove-ing="${i}">✕</button></span>`
  ).join('');
  wrap.querySelectorAll('[data-remove-ing]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.draftIngredients.splice(Number(btn.dataset.removeIng), 1);
      renderIngChips();
    });
  });
}

function addIngredientFromInput() {
  const inp = document.getElementById('recipeIngInp');
  const val = inp.value.trim();
  if (!val) return;
  state.draftIngredients.push(val);
  inp.value = '';
  renderIngChips();
}

function setPendingImage(b64, name) {
  state.pendingRecipeImage = b64;
  document.getElementById('recipeDropPrompt').style.display = 'none';
  document.getElementById('recipeDropPreview').style.display = 'block';
  document.getElementById('recipeImgPreviewEl').src = b64;
  document.getElementById('recipeImgPreviewName').textContent = name || 'imagem';
}

function clearPendingImage(e) {
  e?.stopPropagation();
  state.pendingRecipeImage = null;
  document.getElementById('recipeDropPrompt').style.display = 'block';
  document.getElementById('recipeDropPreview').style.display = 'none';
  document.getElementById('recipeImgPreviewEl').src = '';
  document.getElementById('recipeImgFileInput').value = '';
}

function showRecipeError(m) {
  const e = document.getElementById('recipeErrMsg');
  e.textContent = m;
  e.style.display = m ? 'block' : 'none';
}

function setRecipeLoading(on) {
  document.getElementById('saveRecipeBtn').disabled = on;
  document.getElementById('saveRecipeBtnInner').innerHTML = on ? '<div class="spinner"></div>' : (state.activeRecipeKey ? 'Salvar edição' : '+ Salvar receita');
}

function resetDraftForm() {
  document.getElementById('recipeNameInp').value = '';
  document.getElementById('recipeIngInp').value = '';
  document.getElementById('recipeInstrInp').value = '';
  document.getElementById('recipeLinkInp').value = '';
  state.draftIngredients = [];
  renderIngChips();
  clearPendingImage();
  state.activeRecipeKey = null;
  document.getElementById('recipeFormTitle').textContent = '🍇 Nova Receita';
  document.getElementById('saveRecipeBtnInner').textContent = '+ Salvar receita';
  document.getElementById('cancelRecipeEditBtn').style.display = 'none';
}

async function handleSaveRecipe() {
  showRecipeError('');
  const name = document.getElementById('recipeNameInp').value.trim();
  if (!name) { showRecipeError('Informe o nome da receita.'); return; }
  if (!state.draftIngredients.length) { showRecipeError('Adicione ao menos um ingrediente.'); return; }

  const instructions = document.getElementById('recipeInstrInp').value.trim();
  const link = document.getElementById('recipeLinkInp').value.trim();
  const image = state.pendingRecipeImage || '';

  const payload = {
    name,
    ingredients: state.draftIngredients.slice(),
    instructions,
    link,
    image
  };

  setRecipeLoading(true);
  try {
    if (state.activeRecipeKey) {
      const existing = state.recipesData[state.activeRecipeKey];
      await update(ref(db, `recipes/${state.activeRecipeKey}`), { ...payload, addedAt: existing?.addedAt || Date.now() });
      showToast('Receita atualizada! ✓');
    } else {
      await push(ref(db, 'recipes'), { ...payload, addedAt: Date.now() });
      showToast('Receita salva! 🍇');
    }
    resetDraftForm();
  } catch {
    showRecipeError('Erro ao salvar.');
  }
  setRecipeLoading(false);
}

function loadRecipeIntoForm(key) {
  const r = state.recipesData[key];
  if (!r) return;
  state.activeRecipeKey = key;
  document.getElementById('recipeNameInp').value = r.name || '';
  document.getElementById('recipeInstrInp').value = r.instructions || '';
  document.getElementById('recipeLinkInp').value = r.link || '';
  state.draftIngredients = (r.ingredients || []).slice();
  renderIngChips();
  if (r.image) setPendingImage(r.image, 'imagem atual');
  else clearPendingImage();
  document.getElementById('recipeFormTitle').textContent = `✏️ Editando: ${r.name}`;
  document.getElementById('saveRecipeBtnInner').textContent = 'Salvar edição';
  document.getElementById('cancelRecipeEditBtn').style.display = 'inline-block';
  document.getElementById('recipeNameInp').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteRecipe(key) {
  const r = state.recipesData[key];
  if (!confirm(`Remover a receita "${r?.name || ''}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await remove(ref(db, `recipes/${key}`));
    if (state.activeRecipeKey === key) resetDraftForm();
    showToast('Receita removida.');
  } catch {
    showToast('Erro ao remover.');
  }
}

function toggleRecipeDetail(key) {
  const card = document.querySelector(`[data-recipe-key="${key}"]`);
  const existing = card?.querySelector('.recipe-detail');
  if (existing) { existing.remove(); return; }
  document.querySelectorAll('.recipe-detail').forEach(el => el.remove());
  if (!card) return;

  const r = state.recipesData[key];
  const ingsHtml = (r.ingredients || []).map(i => `<li>${escH(i)}</li>`).join('');
  const linkBtn = r.link
    ? `<button type="button" class="rest-action-btn" data-recipe-open-link="${escH(r.link)}">🔗 Ver origem</button>`
    : '';

  const div = document.createElement('div');
  div.className = 'recipe-detail';
  div.innerHTML = `
    <h4>Ingredientes</h4>
    <ul class="recipe-detail-ings">${ingsHtml}</ul>
    ${r.instructions ? `<h4>Maneira de fazer</h4><p class="recipe-detail-instr">${escH(r.instructions)}</p>` : ''}
    <div class="recipe-detail-actions">
      ${linkBtn}
      <button type="button" class="rest-action-btn" data-recipe-edit="${key}">✏️ Editar</button>
      <button type="button" class="rest-action-btn danger" data-recipe-del="${key}">🗑️ Remover</button>
    </div>`;
  card.appendChild(div);

  div.querySelector('[data-recipe-open-link]')?.addEventListener('click', e => {
    e.stopPropagation();
    window.open(e.currentTarget.dataset.recipeOpenLink, '_blank');
  });
  div.querySelector('[data-recipe-edit]')?.addEventListener('click', e => {
    e.stopPropagation();
    loadRecipeIntoForm(key);
  });
  div.querySelector('[data-recipe-del]')?.addEventListener('click', e => {
    e.stopPropagation();
    deleteRecipe(key);
  });
}

export function renderRecipesGrid() {
  const grid = document.getElementById('recipesGrid');
  if (!grid) return;
  const query = (document.getElementById('recipeSearch')?.value || '').toLowerCase().trim();

  let entries = Object.entries(state.recipesData);
  if (query) entries = entries.filter(([, r]) => r.name?.toLowerCase().includes(query));
  entries.sort((a, b) => (a[1].name || '').localeCompare(b[1].name || '', 'pt-BR'));

  if (!entries.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🍇</div><p>${query ? 'Nenhum resultado' : 'Nenhuma receita ainda'}</p><span>${query ? 'Tente outra busca' : 'Cadastre a primeira acima!'}</span></div>`;
    return;
  }

  grid.innerHTML = entries.map(([key, r]) => `
    <div class="recipe-card" data-recipe-key="${key}">
      ${r.image ? `<img class="recipe-img" src="${escH(r.image)}" alt="" onerror="this.outerHTML='<div class=recipe-img-placeholder>🍇</div>'">` : `<div class="recipe-img-placeholder">🍇</div>`}
      <div class="recipe-info">
        <div class="recipe-title">${escH(r.name)}</div>
        <div class="recipe-ing-count">${(r.ingredients || []).length} ingrediente${(r.ingredients || []).length === 1 ? '' : 's'}</div>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => toggleRecipeDetail(card.dataset.recipeKey));
  });
}

export function renderRecipes() {
  renderRecipesGrid();
}

function bindImageArea() {
  const zone = document.getElementById('recipeDropZone');
  const input = document.getElementById('recipeImgFileInput');

  input.addEventListener('change', async () => {
    const f = input.files[0];
    if (f) setPendingImage(await compressImage(f), f.name);
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
    if (state.activeSection !== 'recipes') return;
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) setPendingImage(await compressImage(item.getAsFile()), 'imagem colada');
  });

  document.getElementById('recipeImgClearBtn').addEventListener('click', clearPendingImage);
}

export function initRecipes() {
  renderIngChips();
  bindImageArea();

  document.getElementById('recipeIngInp').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addIngredientFromInput(); }
  });
  document.getElementById('recipeNameInp').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('recipeIngInp').focus(); }
  });
  document.getElementById('saveRecipeBtn').addEventListener('click', handleSaveRecipe);
  document.getElementById('cancelRecipeEditBtn').addEventListener('click', resetDraftForm);
  document.getElementById('recipeSearch').addEventListener('input', renderRecipesGrid);
}