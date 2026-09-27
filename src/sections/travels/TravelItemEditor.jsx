import { useState } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useToast } from '../../context/ToastContext';
import ImageDropzone from '../../components/ImageDropzone';
import { itemDbPath } from './catHelpers';

/** Deduz o "tipo efetivo" do item, igual à heurística original (type explícito, com fallback pela categoria). */
function effectiveType(it, catKey) {
  if (it.type) return it.type;
  if (catKey === 'culinaria' && !it.restaurantKey) return 'food';
  if (catKey === 'hospedagem') return 'lodging';
  if (catKey === 'passeios') return 'tour';
  return 'generic';
}

// Tipos que podem carregar um link do Google Maps (tudo exceto dicas/generic).
const HAS_MAPS_LINK = new Set(['food', 'attraction', 'lodging', 'tour']);

export default function TravelItemEditor({ dest, travelKey, catKey, itemKey, item, onClose }) {
  const showToast = useToast();
  const type = effectiveType(item, catKey);
  const [name, setName] = useState(item.name || item.text || '');
  const [image, setImage] = useState(item.image || '');
  const [note, setNote] = useState(item.note || '');
  const [bookingUrl, setBookingUrl] = useState(item.bookingUrl || '');
  const [link, setLink] = useState(item.link || '');

  async function save() {
    const n = name.trim();
    if (!n) { showToast('O nome não pode estar vazio.'); return; }

    const updates = { name: n, addedAt: item.addedAt || Date.now() };
    if (type === 'food') {
      updates.type = 'food';
      if (!image) { showToast('A comida precisa de uma foto.'); return; }
      updates.image = image;
    } else if (type === 'attraction') {
      updates.type = 'attraction';
      updates.image = image || '';
    } else if (type === 'lodging') {
      updates.type = 'lodging';
      if (!image) { showToast('A hospedagem precisa de uma imagem.'); return; }
      updates.image = image;
      updates.bookingUrl = bookingUrl.trim();
    } else if (type === 'tour') {
      updates.type = 'tour';
      updates.note = note.trim();
    } else {
      updates.text = n;
    }
    if (HAS_MAPS_LINK.has(type)) updates.link = link.trim();

    try {
      await update(ref(db, itemDbPath(dest, travelKey, catKey, itemKey)), updates);
      showToast('Salvo! ✓');
      onClose();
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  const title = {
    food: '✏️ Editar comida',
    attraction: '✏️ Editar atração',
    lodging: '✏️ Editar hospedagem',
    tour: '✏️ Editar passeio',
    generic: '✏️ Editar item',
  }[type];

  return (
    <div className="inline-editor" style={{ margin: 0, borderRadius: '0 0 12px 12px' }}>
      <div className="inline-editor-title">{title}</div>
      <input
        className="field-inp"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome *"
        style={{ width: '100%', marginBottom: 8 }}
      />
      {(type === 'food' || type === 'attraction' || type === 'lodging') && (
        <div style={{ marginBottom: type === 'lodging' ? 8 : 0 }}>
          <ImageDropzone
            value={image}
            onChange={setImage}
            prompt={type === 'attraction' ? '📷 Foto (opcional)' : '📷 Trocar foto'}
          />
        </div>
      )}
      {type === 'lodging' && (
        <input
          className="field-inp"
          type="url"
          value={bookingUrl}
          onChange={(e) => setBookingUrl(e.target.value)}
          placeholder="Link de reservas (opcional)"
          style={{ width: '100%' }}
        />
      )}
      {type === 'tour' && (
        <textarea
          className="field-inp"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observações"
          style={{ width: '100%' }}
        />
      )}
      {HAS_MAPS_LINK.has(type) && (
        <input
          className="field-inp"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link do Google Maps (opcional)"
          style={{ width: '100%', marginTop: 8 }}
        />
      )}
      <div className="editor-actions">
        <button type="button" className="editor-cancel" onClick={onClose}>Cancelar</button>
        <button type="button" className="editor-save" onClick={save}>Salvar</button>
      </div>
    </div>
  );
}