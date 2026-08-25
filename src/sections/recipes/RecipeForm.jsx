import { useEffect, useState } from 'react';
import { ref, push, update } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import ImageDropzone from '../../components/ImageDropzone';
import { compressImage, getImageFileFromClipboard } from '../../utils/utils';

const emptyDraft = { name: '', instructions: '', link: '', image: '', ingredients: [] };

export default function RecipeForm({ editingKey, onDoneEditing }) {
  const { recipesData, activeSection } = useApp();
  const showToast = useToast();
  const [draft, setDraft] = useState(emptyDraft);
  const [ingInput, setIngInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingKey && recipesData[editingKey]) {
      const r = recipesData[editingKey];
      setDraft({
        name: r.name || '',
        instructions: r.instructions || '',
        link: r.link || '',
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

  function addIngredient() {
    const val = ingInput.trim();
    if (!val) return;
    setDraft((d) => ({ ...d, ingredients: [...d.ingredients, val] }));
    setIngInput('');
  }

  function removeIngredient(i) {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, idx) => idx !== i) }));
  }

  function reset() {
    setDraft(emptyDraft);
    setIngInput('');
    setError('');
    onDoneEditing();
  }

  async function handleSave() {
    setError('');
    const name = draft.name.trim();
    if (!name) { setError('Informe o nome da receita.'); return; }
    if (!draft.ingredients.length) { setError('Adicione ao menos um ingrediente.'); return; }

    const payload = {
      name,
      ingredients: draft.ingredients.slice(),
      instructions: draft.instructions.trim(),
      link: draft.link.trim(),
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
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('recipeIngInp')?.focus(); } }}
        />
      </div>

      <div className="input-row">
        <input
          id="recipeIngInp"
          className="field-inp"
          type="text"
          placeholder="Ingrediente + Enter para adicionar"
          value={ingInput}
          onChange={(e) => setIngInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
        />
      </div>
      <div className="recipe-ing-chips">
        {draft.ingredients.map((ing, i) => (
          <span key={i} className="recipe-ing-chip">
            {ing}
            <button type="button" onClick={() => removeIngredient(i)}>✕</button>
          </span>
        ))}
      </div>

      <div className="name-row" style={{ marginTop: 10 }}>
        <textarea
          className="field-inp"
          rows={3}
          placeholder="Modo de preparo (opcional)"
          value={draft.instructions}
          onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
        />
      </div>

      <div className="input-row" style={{ marginTop: 10 }}>
        <input
          className="field-inp"
          type="url"
          placeholder="Link da receita (Instagram, YouTube, TikTok...) — opcional"
          value={draft.link}
          onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
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