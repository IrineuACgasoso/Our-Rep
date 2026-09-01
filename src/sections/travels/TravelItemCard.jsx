import { useState } from 'react';
import { ref, remove } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { DualStarsDisplay } from '../../components/StarSelector';
import SafeImage from '../../components/SafeImage';
import { safeExternalUrl } from '../../utils/utils';
import { resolveCatPath } from './catHelpers';
import TravelItemEditor from './TravelItemEditor';

export default function TravelItemCard({ dest, travelKey, catKey, itemKey, item }) {
  const { restaurantsData } = useApp();
  const showToast = useToast();
  const [editing, setEditing] = useState(false);

  const isLinkedRestaurant = item.type === 'restaurant' || (catKey === 'culinaria' && item.restaurantKey);

  async function handleDelete() {
    const label = item.name || item.text || (isLinkedRestaurant ? restaurantsData[item.restaurantKey]?.name : '') || '';
    const msg = label ? `Remover "${label}"? Essa ação não poderá ser desfeita.` : 'Tem certeza que deseja remover este item? Esta ação não poderá ser desfeita.';
    if (!confirm(msg)) return;
    const pathKey = resolveCatPath(dest, catKey);
    try {
      await remove(ref(db, `travels/${travelKey}/cats/${pathKey}/items/${itemKey}`));
      showToast('Removido.');
    } catch {
      showToast('Erro ao remover.');
    }
  }

  const actions = (editable) => (
    <div className="travel-item-actions">
      {editable && <button type="button" className="travel-item-edit" title="Editar" onClick={(e) => { e.stopPropagation(); setEditing((v) => !v); }}>✏️</button>}
      <button type="button" className="travel-item-del" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>✕</button>
    </div>
  );

  if (isLinkedRestaurant) {
    const r = restaurantsData[item.restaurantKey];
    if (!r) {
      return (
        <div className="travel-item-card rest-linked">
          {actions(false)}
          <div className="travel-rest-inner">
            <div className="travel-item-title">Restaurante removido</div>
            <span className="travel-item-sub">Referência {item.restaurantKey}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="travel-item-card rest-linked">
        {actions(false)}
        <div className="travel-rest-inner">
          <div className="travel-item-title">{r.name}</div>
          <span className="travel-item-badge">{r.visited ? '✓ Já fomos' : 'Quero ir'}</span>
          {r.visited && (r.starsCaio > 0 || r.starsClarice > 0) && (
            <div style={{ marginTop: 6 }}><DualStarsDisplay starsCaio={r.starsCaio} starsClarice={r.starsClarice} compact /></div>
          )}
          {r.note && <div className="travel-item-sub" style={{ fontStyle: 'italic', marginTop: 6 }}>"{r.note}"</div>}
          {r.link && (
            <button type="button" className="rest-action-btn" style={{ marginTop: 8 }} onClick={() => window.open(safeExternalUrl(r.link), '_blank', 'noopener,noreferrer')}>📍 Abrir no Maps</button>
          )}
          <p className="travel-item-sub" style={{ marginTop: 8 }}>Edite na aba Restaurantes</p>
        </div>
      </div>
    );
  }

  const type = item.type || (catKey === 'culinaria' ? 'food' : catKey === 'atracoes' ? 'attraction' : catKey === 'hospedagem' ? 'lodging' : catKey === 'passeios' ? 'tour' : 'generic');

  let body;
  if (type === 'food' || type === 'attraction' || type === 'lodging') {
    body = (
      <>
        {actions(true)}
        {item.image && <img className="travel-item-thumb" src={item.image} alt="" />}
        <div className="travel-item-body">
          <div className="travel-item-title">{item.name || item.text}</div>
          {type === 'food' && <span className="travel-item-badge">Comida</span>}
          {type === 'attraction' && <span className="travel-item-badge">Atração</span>}
          {type === 'lodging' && item.bookingUrl && (
            <button type="button" className="rest-action-btn" style={{ marginTop: 8 }} onClick={() => window.open(safeExternalUrl(item.bookingUrl.startsWith('http') ? item.bookingUrl : 'https://' + item.bookingUrl), '_blank', 'noopener,noreferrer')}>
              🔗 Reservar
            </button>
          )}
        </div>
      </>
    );
  } else if (type === 'tour') {
    body = (
      <>
        {actions(true)}
        <div className="travel-item-body">
          <div className="travel-item-title">{item.name || item.text}</div>
          {item.note && <div className="travel-item-sub">{item.note}</div>}
        </div>
      </>
    );
  } else {
    body = (
      <>
        {actions(true)}
        <div className="travel-item-body">
          <div className="travel-item-title">{item.text || item.name || 'Item'}</div>
        </div>
      </>
    );
  }

  return (
    <div className={`travel-item-card${item.image ? ' has-img' : ''}`}>
      {body}
      {editing && <TravelItemEditor dest={dest} travelKey={travelKey} catKey={catKey} itemKey={itemKey} item={item} onClose={() => setEditing(false)} />}
    </div>
  );
}