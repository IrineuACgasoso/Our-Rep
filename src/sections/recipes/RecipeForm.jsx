import { useEffect, useState } from 'react';
import { ref, push, update } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import ImageDropzone from '../../components/ImageDropzone';
import ChipInput from '../../components/ChipInput';
import { compressImage, getImageFileFromClipboard } from '../../utils/utils';

const emptyDraft = { name: '', instructions: '', links: [], image: '', ingredients: [] };

/** Uma receita antiga só tem `link` (string única) — normaliza pra `links` (array) ao carregar. */
function toLinks(r) {
  if (Array.isArray(r.links)) return r.links.slice();
  return r.link ? [r.link] : [];
}

export default function RecipeForm({ editingKey, onDoneEditing }) {
  const { recipesData, activeSection } = useApp();
  const showToast = useToast();
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingKey && recipesData[editingKey]) {
      const r = recipesData[editingKey];
      setDraft({
        name: r.name || '',
        instructions: r.instructions || '',
        links: toLinks(r),
        image: r.image || '',
        ingredients: (r.ingredients || []).slice(),
      });
      document.getElementById('recipeNameInp')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingKey, recipesData]);

  // Permite colar (Ctrl+V) uma imagem em qualquer lugar da tela enquanto a aba estiver ativa.
  useEffect(() => {
    if (activeSection !== 'recipes') return;
    async function onPaste(e) {
      const file = getImageFileFromClipboard(e.clipboardData);
      if (!file) return;
      const b64 = await compressImage(file);
      setDraft((d) => ({ ...d, image: b64 }));
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [activeSection]);

  function addIngredient(val) {
    setDraft((d) => ({ ...d, ingredients: [...d.ingredients, val] }));
  }
  function removeIngredient(i) {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, idx) => idx !== i) }));
  }

  function addLink(val) {
    setDraft((d) => ({ ...d, links: [...d.links, val] }));
  }
  function removeLink(i) {
    setDraft((d) => ({ ...d, links: d.links.filter((_, idx) => idx !== i) }));
  }

  function reset() {
    setDraft(emptyDraft);
    setError('');
    onDoneEditing();
  }

  async function handleSave() {
    setError('');
    const name = draft.name.trim();
    if (!name) { setError('Informe o nome da receita.'); return; }

    const payload = {
      name,
      ingredients: draft.ingredients.slice(),
      instructions: draft.instructions.trim(),
      links: draft.links.slice(),
      image: draft.image || '',
    };

    setSaving(true);
    try {
      if (editingKey) {
        const existing = recipesData[editingKey];
        await update(ref(db, `recipes/${editingKey}`), { ...payload, addedAt: existing?.addedAt || Date.now() });
        showToast('Receita atualizada! ✓');
      } else {
        await push(ref(db, 'recipes'), { ...payload, addedAt: Date.now() });
        showToast('Receita salva! 🍇');
      }
      reset();
    } catch {
      setError('Erro ao salvar.');
    }
    setSaving(false);
  }

  return (
    <div className="add-section" style={{ marginTop: '1.5rem' }}>
      <h3>{editingKey ? `✏️ Editando: ${recipesData[editingKey]?.name || ''}` : '🍇 Nova Receita'}</h3>
      <div className="input-row" style={{ marginBottom: 10 }}>
        <input
          id="recipeNameInp"
          className="field-inp"
          type="text"
          placeholder="Nome da receita *"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
      </div>

      <ChipInput
        id="recipeIngInp"
        placeholder="Ingrediente (opcional) + OK para adicionar"
        values={draft.ingredients}
        onAdd={addIngredient}
        onRemove={removeIngredient}
      />

      <div className="name-row" style={{ marginTop: 10 }}>
        <textarea
          className="field-inp"
          rows={3}
          placeholder="Modo de preparo (opcional)"
          value={draft.instructions}
          onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <ChipInput
          id="recipeLinkInp"
          type="url"
          placeholder="Link do vídeo/receita (Instagram, YouTube, TikTok...) + OK"
          values={draft.links}
          onAdd={addLink}
          onRemove={removeLink}
        />
      </div>

      <ImageDropzone value={draft.image} onChange={(img) => setDraft((d) => ({ ...d, image: img }))} hint="Opcional — foto da receita" />

      <div className="editor-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
        <button className="add-btn" disabled={saving} onClick={handleSave}>
          {saving ? <div className="spinner" /> : (editingKey ? 'Salvar edição' : '+ Salvar receita')}
        </button>
        {editingKey && (
          <button className="editor-cancel" onClick={reset}>Cancelar edição</button>
        )}
      </div>
      <div className="err-msg" style={{ display: error ? 'block' : 'none' }}>{error}</div>
    </div>
  );
}
