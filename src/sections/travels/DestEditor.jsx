import { useState } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useToast } from '../../context/ToastContext';
import ImageDropzone from '../../components/ImageDropzone';

export default function DestEditor({ travelKey, dest, onClose }) {
  const showToast = useToast();
  const [name, setName] = useState(dest.name || '');
  const [image, setImage] = useState(dest.image || '');

  async function save() {
    const n = name.trim();
    if (!n) { showToast('Informe o nome do destino.'); return; }
    try {
      await update(ref(db, `travels/${travelKey}`), { name: n, image: image || '' });
      showToast('Destino atualizado! ✓');
      onClose();
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  return (
    <div className="inline-editor travel-dest-editor">
      <div className="inline-editor-title">✏️ Editar destino</div>
      <div className="editor-row">
        <input className="field-inp" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do destino *" style={{ width: '100%' }} />
      </div>
      <div style={{ marginTop: 8 }}>
        <ImageDropzone value={image} onChange={setImage} prompt="🖼️ Trocar imagem de capa" />
      </div>
      <div className="editor-actions">
        <button type="button" className="editor-cancel" onClick={onClose}>Cancelar</button>
        <button type="button" className="editor-save" onClick={save}>Salvar</button>
      </div>
    </div>
  );
}