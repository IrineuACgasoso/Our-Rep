import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../../../firebase/firebase';
import { useToast } from '../../../context/ToastContext';
import ImageDropzone from '../../../components/ImageDropzone';

export default function AtracoesPanel({ travelKey }) {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [img, setImg] = useState('');

  async function add() {
    const n = name.trim();
    if (!n) { showToast('Informe o nome da atração.'); return; }
    try {
      await push(ref(db, `travels/${travelKey}/cats/atracoes/items`), { type: 'attraction', name: n, image: img || '', addedAt: Date.now() });
      setName('');
      setImg('');
      showToast('Atração adicionada!');
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  return (
    <div>
      <h4>Adicionar Atração</h4>
      <div className="input-row" style={{ marginBottom: 10 }}>
        <input className="field-inp" type="text" placeholder="Nome da atração *" value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      </div>
      <ImageDropzone value={img} onChange={setImg} prompt="📷 Foto de exibição (opcional)" compact />
      <button type="button" className="add-btn" style={{ marginTop: 12, width: '100%' }} onClick={add}>+ Atração</button>
    </div>
  );
}