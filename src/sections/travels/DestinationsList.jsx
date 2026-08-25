import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useApp, TRAVEL_CATS } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import ImageDropzone from '../../components/ImageDropzone';

function createEmptyTravelCats() {
  const cats = {};
  TRAVEL_CATS.forEach((c) => { cats[c.key] = { label: c.label, items: {} }; });
  return cats;
}

export default function DestinationsList({ onOpen }) {
  const { travelsData } = useApp();
  const showToast = useToast();
  const [name, setName] = useState('');
  const [cover, setCover] = useState('');
  const [error, setError] = useState('');

  async function handleAdd() {
    const n = name.trim();
    if (!n) { setError('Informe o nome do destino.'); return; }
    setError('');
    try {
      await push(ref(db, 'travels'), { name: n, image: cover || '', cats: createEmptyTravelCats(), addedAt: Date.now() });
      setName('');
      setCover('');
      showToast('Destino adicionado! ✈️');
    } catch {
      setError('Erro ao salvar.');
    }
  }

  const entries = Object.entries(travelsData).sort((a, b) => (a[1].addedAt || 0) - (b[1].addedAt || 0));

  return (
    <div className="travels-wrap">
      <div className="travel-add-section">
        <h3>✈️ Adicionar Destino</h3>
        <div className="input-row" style={{ marginBottom: 10 }}>
          <input
            className="field-inp"
            type="text"
            placeholder="Nome do destino (ex: Lisboa, Portugal)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <ImageDropzone
          value={cover}
          onChange={setCover}
          prompt="🖼️ Imagem do destino (arraste, cole ou clique)"
          hint="Opcional — aparece no card"
        />
        <div style={{ marginTop: 12 }}>
          <button className="add-btn" onClick={handleAdd}>+ Destino</button>
        </div>
        <div className="err-msg" style={{ display: error ? 'block' : 'none' }}>{error}</div>
      </div>

      <div className="destinations-grid destinations-tiles">
        {entries.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-icon">✈️</div>
            <p>Nenhum destino ainda</p>
            <span>Adicione um destino acima!</span>
          </div>
        ) : (
          entries.map(([key, dest]) => (
            <article key={key} className="dest-tile" tabIndex={0} onClick={() => onOpen(key)} onKeyDown={(e) => e.key === 'Enter' && onOpen(key)}>
              {dest.image ? <img className="dest-tile-img" src={dest.image} alt="" /> : <div className="dest-tile-placeholder">✈️</div>}
              <div className="dest-tile-name">{dest.name}</div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}