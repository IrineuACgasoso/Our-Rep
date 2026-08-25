import { useState } from 'react';
import { ref, update, remove } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useToast } from '../../context/ToastContext';
import { StarSelector, StarsDisplay } from '../../components/StarSelector';

export default function RestaurantCard({ restKey, rest, tagsData }) {
  const showToast = useToast();
  const [editorMode, setEditorMode] = useState(null); // null | 'note' | 'edit'
  const [name, setName] = useState(rest.name || '');
  const [link, setLink] = useState(rest.link || '');
  const [visited, setVisited] = useState(rest.visited || false);
  const [stars, setStars] = useState(rest.stars || 0);
  const [note, setNote] = useState(rest.note || '');
  const [selectedTags, setSelectedTags] = useState(rest.tags || []);

  function openEditor(mode) {
    if (editorMode === mode) { setEditorMode(null); return; }
    setName(rest.name || '');
    setLink(rest.link || '');
    setVisited(rest.visited || false);
    setStars(rest.stars || 0);
    setNote(rest.note || '');
    setSelectedTags(rest.tags || []);
    setEditorMode(mode);
  }

  function toggleTag(k) {
    setSelectedTags((prev) => (prev.includes(k) ? prev.filter((t) => t !== k) : [...prev, k]));
  }

  async function save() {
    const updates = {
      note: visited ? note.trim() : '',
      stars: visited ? stars : 0,
      visited,
      tags: selectedTags,
    };
    if (editorMode === 'edit') {
      const n = name.trim();
      if (!n) { showToast('O nome não pode estar vazio.'); return; }
      updates.name = n;
      updates.link = link.trim() || '';
    }
    try {
      await update(ref(db, `restaurants/${restKey}`), updates);
      showToast('Salvo! ✓');
      setEditorMode(null);
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  async function handleDelete() {
    const suffix = rest.name ? ` (${rest.name})` : '';
    if (!confirm(`Tem certeza que deseja remover este restaurante${suffix}? Esta ação não pode ser desfeita.`)) return;
    try {
      await remove(ref(db, `restaurants/${restKey}`));
      showToast('Removido.');
    } catch {
      showToast('Erro.');
    }
  }

  const tagsHtml = (rest.tags || []).map((tk) => tagsData[tk]?.name).filter(Boolean);

  return (
    <div className="rest-card">
      <div className="rest-card-top">
        <div className="rest-icon">{rest.visited ? '✅' : '📍'}</div>
        <div className="rest-body">
          {rest.link ? (
            <button type="button" className="rest-name-btn" onClick={() => window.open(rest.link, '_blank')}>
              {rest.name} <span className="map-icon">📍</span>
            </button>
          ) : (
            <button type="button" className="rest-name-btn no-link">{rest.name}</button>
          )}
          <div className="rest-meta">
            <span className={`rest-badge ${rest.visited ? 'visited' : 'unvisited'}`}>
              {rest.visited ? '✓ Já fomos' : 'Queremos ir'}
            </span>
            {rest.visited && rest.stars > 0 && <StarsDisplay value={rest.stars} />}
          </div>
          {tagsHtml.length > 0 && (
            <div className="rest-card-tags">
              {tagsHtml.map((t) => <span key={t} className="rest-card-tag">{t}</span>)}
            </div>
          )}
          {rest.note && <div className="rest-note">"{rest.note}"</div>}
        </div>
        <div className="rest-actions">
          <button type="button" className="rest-action-btn" onClick={() => openEditor('note')}>📝 Nota</button>
          <button type="button" className="rest-action-btn" onClick={() => openEditor('edit')}>✏️ Editar</button>
          <button type="button" className="rest-action-btn danger" onClick={handleDelete}>🗑️</button>
        </div>
      </div>

      {editorMode && (
        <div className="rest-editor">
          <div className="rest-editor-title">{editorMode === 'edit' ? '✏️ Editar restaurante' : '📝 Nota & avaliação'}</div>
          {editorMode === 'edit' && (
            <>
              <div className="editor-row">
                <input className="field-inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome *" />
              </div>
              <div className="editor-row">
                <input className="field-inp" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link Maps" />
              </div>
            </>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>CATEGORIAS</div>
          <div className="editor-tags-wrap">
            {Object.keys(tagsData).length === 0 ? (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sem categorias criadas</span>
            ) : (
              Object.entries(tagsData).map(([k, t]) => (
                <button key={k} type="button" className={`editor-tag-chip${selectedTags.includes(k) ? ' selected' : ''}`} onClick={() => toggleTag(k)}>
                  {t.name}
                </button>
              ))
            )}
          </div>
          <div className="toggle-row" style={{ marginTop: 10 }}>
            <span className={`toggle-label-left${!visited ? ' active' : ''}`}>Ainda não</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={visited} onChange={(e) => setVisited(e.target.checked)} />
              <span className="toggle-track" />
            </label>
            <span className={`toggle-label-right${visited ? ' active' : ''}`}>Já fomos!</span>
          </div>
          {visited && (
            <div>
              <div style={{ marginTop: 10 }}>
                <StarSelector value={stars} onChange={setStars} />
              </div>
              <textarea
                placeholder="Nota sobre este restaurante..."
                style={{ marginTop: 8, width: '100%', resize: 'vertical', minHeight: 52, border: 'none', background: 'transparent', fontFamily: "'Nunito',sans-serif", fontSize: 13, color: 'var(--text)', outline: 'none' }}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}
          <div className="editor-actions">
            <button type="button" className="editor-cancel" onClick={() => setEditorMode(null)}>Cancelar</button>
            <button type="button" className="editor-save" onClick={save}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}