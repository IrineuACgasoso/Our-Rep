import { useState } from 'react';
import { ref, update, remove } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { domain } from '../../utils/utils';
import { useToast } from '../../context/ToastContext';
import ImageDropzone from '../../components/ImageDropzone';

export default function GiftCard({ giftKey, gift, activeTab }) {
  const showToast = useToast();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(gift.title || '');
  const [image, setImage] = useState(gift.image || '');
  const [saving, setSaving] = useState(false);

  function openEditor() {
    setTitle(gift.title || '');
    setImage(gift.image || '');
    setEditing((v) => !v);
  }

  async function save() {
    const t = title.trim();
    if (!t) { showToast('O nome não pode estar vazio.'); return; }
    setSaving(true);
    try {
      await update(ref(db, `gifts/${activeTab}/${giftKey}`), { title: t, image: image || '' });
      showToast('Presente atualizado! ✓');
      setEditing(false);
    } catch {
      showToast('Erro ao salvar.');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja remover este presente?')) return;
    try {
      await remove(ref(db, `gifts/${activeTab}/${giftKey}`));
      showToast('Removido.');
    } catch {
      showToast('Erro.');
    }
  }

  return (
    <div className={`gift-card${editing ? ' editing' : ''}`}>
      <div className="card-top-actions">
        <button type="button" className="edit-btn" title="Editar" onClick={(e) => { e.stopPropagation(); openEditor(); }}>✏️</button>
        <span className="spacer" style={{ flex: 1 }} />
        <button type="button" className="del-btn" title="Remover" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>✕</button>
      </div>
      <div onClick={() => { if (!editing && gift.url) window.open(gift.url, '_blank'); }} style={{ cursor: gift.url ? 'pointer' : 'default' }}>
        {gift.image ? (
          <img className="gift-img" src={gift.image} alt="" onError={(e) => { e.currentTarget.outerHTML = '<div class="gift-img-placeholder">🎁</div>'; }} />
        ) : (
          <div className="gift-img-placeholder">🎁</div>
        )}
        <div className="gift-info">
          <div className="gift-title">{gift.title}</div>
          {gift.url && <div className="gift-domain">{domain(gift.url)}</div>}
        </div>
      </div>

      {editing && (
        <div className="inline-editor" onClick={(e) => e.stopPropagation()}>
          <div className="inline-editor-title">✏️ Editar presente</div>
          <div className="editor-row">
            <input
              className="field-inp"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do presente *"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <ImageDropzone value={image} onChange={setImage} prompt="📷 Trocar foto" hint="Arraste ou cole sua foto, ou clique para escolher arquivo. Deixe em branco para manter a atual" />
          </div>
          <div className="editor-actions">
            <button type="button" className="editor-cancel" onClick={openEditor}>Cancelar</button>
            <button type="button" className="editor-save" disabled={saving} onClick={save}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}