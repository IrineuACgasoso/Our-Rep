import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../../../firebase/firebase';
import { useToast } from '../../../context/ToastContext';

export default function DicasPanel({ travelKey }) {
  const showToast = useToast();
  const [text, setText] = useState('');

  async function add() {
    const t = text.trim();
    if (!t) { showToast('Escreva uma dica ou comentário.'); return; }
    try {
      await push(ref(db, `travels/${travelKey}/cats/dicas/items`), { text: t, addedAt: Date.now() });
      setText('');
      showToast('Dica adicionada!');
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  return (
    <div>
      <h4>Adicionar Dica</h4>
      <div className="input-row" style={{ marginBottom: 8 }}>
        <textarea className="field-inp" rows={2} placeholder="Escreva um comentário ou dica..." style={{ width: '100%' }}
          value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <button type="button" className="add-btn" style={{ marginTop: 4, width: '100%' }} onClick={add}>+ Dica</button>
    </div>
  );
}
