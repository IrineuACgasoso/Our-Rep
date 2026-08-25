import { useMemo, useState } from 'react';
import { ref, remove } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { TRAVEL_CATS } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { getCatItems } from './catHelpers';
import DestEditor from './DestEditor';
import TravelItemCard from './TravelItemCard';
import CulinariaPanel from './panels/CulinariaPanel';
import PasseiosPanel from './panels/PasseiosPanel';
import AtracoesPanel from './panels/AtracoesPanel';
import HospedagemPanel from './panels/HospedagemPanel';

export default function TravelDetail({ travelKey, dest, onBack }) {
  const showToast = useToast();
  const [activeCat, setActiveCat] = useState('culinaria');
  const [editingDest, setEditingDest] = useState(false);

  const items = useMemo(
    () => Object.entries(getCatItems(dest, activeCat)).sort((a, b) => (a[1].addedAt || 0) - (b[1].addedAt || 0)),
    [dest, activeCat]
  );

  async function handleDeleteDest() {
    const msg = dest?.name
      ? `Tem certeza que deseja remover a viagem "${dest.name}"?\n\nIsso removerá tudo que está dentro e não poderá ser desfeito.`
      : 'Remover este destino e tudo o que está dentro? Essa ação não poderá ser desfeita.';
    if (!confirm(msg)) return;
    try {
      await remove(ref(db, `travels/${travelKey}`));
      showToast('Destino removido.');
      onBack();
    } catch {
      showToast('Erro ao remover.');
    }
  }

  return (
    <div className="travels-detail-wrap">
      <div className="travel-detail-top">
        <button type="button" className="travel-back-btn" onClick={onBack}>← Voltar</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="travel-edit-btn" onClick={() => setEditingDest((v) => !v)}>✏️ Editar destino</button>
          <button type="button" className="travel-delete-btn" onClick={handleDeleteDest}>Remover destino</button>
        </div>
      </div>

      <div className="travel-detail-hero">
        {dest.image ? (
          <>
            <img className="travel-hero-img" src={dest.image} alt="" />
            <div className="travel-hero-name">{dest.name}</div>
          </>
        ) : (
          <>
            <div className="travel-hero-placeholder">✈️</div>
            <div className="travel-hero-name">{dest.name}</div>
          </>
        )}
      </div>

      {editingDest && <DestEditor travelKey={travelKey} dest={dest} onClose={() => setEditingDest(false)} />}

      <div className="travel-cat-tabs">
        {TRAVEL_CATS.map((c) => (
          <button key={c.key} type="button" className={`travel-cat-tab${activeCat === c.key ? ' active' : ''}`} onClick={() => setActiveCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="travel-detail-body">
        <div className="travel-add-panel">
          {activeCat === 'culinaria' && <CulinariaPanel travelKey={travelKey} />}
          {activeCat === 'passeios' && <PasseiosPanel travelKey={travelKey} />}
          {activeCat === 'atracoes' && <AtracoesPanel travelKey={travelKey} />}
          {activeCat === 'hospedagem' && <HospedagemPanel travelKey={travelKey} />}
        </div>
        <div className="travel-items-list">
          {items.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nada nesta categoria ainda</p>
            </div>
          ) : (
            items.map(([ik, it]) => (
              <TravelItemCard key={ik} dest={dest} travelKey={travelKey} catKey={activeCat} itemKey={ik} item={it} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}