import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useToast } from '../../context/ToastContext';

export default function TagFilters({ tagsData, activeTagFilter, onFilterChange }) {
  const showToast = useToast();
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  async function confirmNewTag() {
    const name = newTagName.trim();
    if (!name) return;
    try {
      await push(ref(db, 'restTags'), { name, createdAt: Date.now() });
      showToast(`Categoria "${name}" criada!`);
      setNewTagName('');
      setShowNewTag(false);
    } catch {
      showToast('Erro ao criar categoria.');
    }
  }

  return (
    <div className="rest-tags-row">
      <button
        type="button"
        className={`rest-tag-filter rest-tag-all${!activeTagFilter ? ' active' : ''}`}
        onClick={() => onFilterChange(null)}
      >
        Todos
      </button>
      {Object.entries(tagsData).map(([k, t]) => (
        <button
          key={k}
          type="button"
          className={`rest-tag-filter${activeTagFilter === k ? ' active' : ''}`}
          onClick={() => onFilterChange(k)}
        >
          {t.name}
        </button>
      ))}
      <div id="newTagArea">
        {showNewTag && (
          <div className="new-tag-wrap">
            <input
              className="new-tag-inp"
              autoFocus
              placeholder="Ex: Japonês"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmNewTag()}
            />
            <button type="button" className="new-tag-confirm" onClick={confirmNewTag}>OK</button>
            <button type="button" className="new-tag-cancel" onClick={() => { setShowNewTag(false); setNewTagName(''); }}>✕</button>
          </div>
        )}
      </div>
      <button type="button" className="rest-tag-add" onClick={() => setShowNewTag((v) => !v)}>＋ Nova categoria</button>
    </div>
  );
}