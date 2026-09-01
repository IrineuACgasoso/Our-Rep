import { useState } from 'react';
import { ref, update, remove } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { StarSelector, DualStarsDisplay } from '../../components/StarSelector';
import ImageDropzone from '../../components/ImageDropzone';
import { PERSON_LABELS, personFromEmail, friendlyDbError, safeExternalUrl } from '../../utils/utils';

export default function RestaurantCard({ restKey, rest, tagsData }) {
  const { user } = useApp();
  const showToast = useToast();
  const person = personFromEmail(user?.email);
  const [editorMode, setEditorMode] = useState(null); // null | 'note' | 'edit'
  const [name, setName] = useState(rest.name || '');
  const [link, setLink] = useState(rest.link || '');
  const [visited, setVisited] = useState(rest.visited || false);
  const [starsCaio, setStarsCaio] = useState(rest.starsCaio || 0);
  const [starsClarice, setStarsClarice] = useState(rest.starsClarice || 0);
  const [note, setNote] = useState(rest.note || '');
  const [photo, setPhoto] = useState(rest.photo || '');
  const [selectedTags, setSelectedTags] = useState(rest.tags || []);

  function openEditor(mode) {
    if (editorMode === mode) { setEditorMode(null); return; }
    setName(rest.name || '');
    setLink(rest.link || '');
    setVisited(rest.visited || false);
    setStarsCaio(rest.starsCaio || 0);
    setStarsClarice(rest.starsClarice || 0);
    setNote(rest.note || '');
    setPhoto(rest.photo || '');
    setSelectedTags(rest.tags || []);
    setEditorMode(mode);
  }

  function toggleTag(k) {
    setSelectedTags((prev) => (prev.includes(k) ? prev.filter((t) => t !== k) : [...prev, k]));
  }

  async function save() {
    const updates = {
      note: visited ? note.trim() : '',
      starsCaio: visited ? starsCaio : 0,
      starsClarice: visited ? starsClarice : 0,
      visited,
      tags: selectedTags,
      photo: photo || '',
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
    } catch (err) {
      showToast(friendlyDbError(err));
    }
  }

  async function handleDelete() {
    const suffix = rest.name ? ` (${rest.name})` : '';
    if (!confirm(`Tem certeza que deseja remover este restaurante${suffix}? Esta ação não pode ser desfeita.`)) return;
    try {
      await remove(ref(db, `restaurants/${restKey}`));
      showToast('Removido.');
    } catch (err) {
      showToast(friendlyDbError(err, 'Erro.'));
    }
  }

  const tagsHtml = (rest.tags || []).map((tk) => tagsData[tk]?.name).filter(Boolean);

  return (
    <div className="rest-card">
      <div className="rest-card-top">
        {rest.photo ? (
          <img className="rest-photo" src={rest.photo} alt="" />
        ) : (
          <div className="rest-photo rest-photo-placeholder">{rest.visited ? '✅' : '📍'}</div>
        )}
        <div className="rest-body">
          {rest.link ? (
            <button type="button" className="rest-name-btn" onClick={() => window.open(safeExternalUrl(rest.link), '_blank', 'noopener,noreferrer')}>
              {rest.name} <span className="map-icon">📍</span>
            </button>
          ) : (
            <button type="button" className="rest-name-btn no-link">{rest.name}</button>
          )}
          <div className="rest-meta">
            <span className={`rest-badge ${rest.visited ? 'visited' : 'unvisited'}`}>
              {rest.visited ? '✓ Já fomos' : 'Queremos ir'}
            </span>
          </div>
          {rest.visited && (rest.starsCaio > 0 || rest.starsClarice > 0) && (
            <DualStarsDisplay starsCaio={rest.starsCaio} starsClarice={rest.starsClarice} />
          )}
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
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>FOTO (opcional)</div>
              <ImageDropzone
                value={photo}
                onChange={setPhoto}
                prompt="📎 Arraste, cole (Ctrl+V) ou clique para adicionar uma foto"
                compact
              />
            </>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, marginTop: 10, fontWeight: 600 }}>CATEGORIAS</div>
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
                <StarSelector
                  value={starsCaio}
                  onChange={setStarsCaio}
                  label={`Nota do ${PERSON_LABELS.caio}${person === 'caio' ? ' (você)' : ''}:`}
                />
              </div>
              <div style={{ marginTop: 6 }}>
                <StarSelector
                  value={starsClarice}
                  onChange={setStarsClarice}
                  label={`Nota da ${PERSON_LABELS.clarice}${person === 'clarice' ? ' (você)' : ''}:`}
                />
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
