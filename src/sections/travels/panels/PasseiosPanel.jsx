import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../../../firebase/firebase';
import { useToast } from '../../../context/ToastContext';

export default function PasseiosPanel({ travelKey }) {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [mapsLink, setMapsLink] = useState('');

  async function add() {
    const n = name.trim();
    if (!n) { showToast('Informe o nome do passeio.'); return; }
    try {
      await push(ref(db, `travels/${travelKey}/cats/passeios/items`), { type: 'tour', name: n, note: note.trim(), link: mapsLink.trim(), addedAt: Date.now() });
      setName('');
      setNote('');
      setMapsLink('');
      showToast('Passeio adicionado!');
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  return (
    <div>
      <h4>Adicionar Passeio</h4>
      <div className="input-row" style={{ marginBottom: 8 }}>
        <input className="field-inp" type="text" placeholder="Nome do passeio *" value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      </div>
      <textarea className="field-inp" rows={2} placeholder="Observações (opcional)" style={{ width: '100%' }}
        value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="input-row" style={{ marginTop: 10 }}>
        <input className="field-inp" type="url" placeholder="Link do Google Maps (opcional)" value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} />
      </div>
      <button type="button" className="add-btn" style={{ marginTop: 12, width: '100%' }} onClick={add}>+ Passeio</button>
    </div>
  );
}