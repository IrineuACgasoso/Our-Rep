import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { StarSelector } from '../../components/StarSelector';
import ImageDropzone from '../../components/ImageDropzone';
import { PERSON_LABELS, personFromEmail, friendlyDbError } from '../../utils/utils';
import { linkRestaurantToActiveTravel } from '../travels/TravelActions';

export default function AddRestaurantForm({ tagsData }) {
  const { user, pendingTravelRestaurant, setPendingTravelRestaurant, setActiveSection, setReopenTravelKey } = useApp();
  const showToast = useToast();
  const person = personFromEmail(user?.email);

  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [visited, setVisited] = useState(false);
  const [starsCaio, setStarsCaio] = useState(0);
  const [starsClarice, setStarsClarice] = useState(0);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleTag(k) {
    setSelectedTags((prev) => (prev.includes(k) ? prev.filter((t) => t !== k) : [...prev, k]));
  }

  async function handleAdd() {
    if (loading) return;
    setError('');
    const n = name.trim();
    if (!n) { setError('Informe o nome do restaurante.'); return; }
    setLoading(true);
    try {
      const newRef = await push(ref(db, 'restaurants'), {
        name: n,
        link: link.trim() || '',
        visited,
        starsCaio: visited ? starsCaio : 0,
        starsClarice: visited ? starsClarice : 0,
        note: visited ? note.trim() : '',
        photo: photo || '',
        tags: selectedTags,
        addedAt: Date.now(),
      });
      if (pendingTravelRestaurant && newRef.key) {
        await linkRestaurantToActiveTravel(newRef.key, pendingTravelRestaurant, setPendingTravelRestaurant, setActiveSection, showToast, setReopenTravelKey);
      }
      setName('');
      setLink('');
      setVisited(false);
      setStarsCaio(0);
      setStarsClarice(0);
      setNote('');
      setPhoto('');
      setSelectedTags([]);
      if (!pendingTravelRestaurant) showToast('Restaurante adicionado! 🍽️');
    } catch (err) {
      setError(friendlyDbError(err, 'Erro ao salvar.'));
    }
    setLoading(false);
  }

  return (
    <div className="add-section" style={{ marginTop: '1.5rem' }}>
      <h3>🍽️ Adicionar Restaurante</h3>
      <div className="input-row" style={{ marginBottom: 10 }}>
        <input className="field-inp" type="text" placeholder="Nome do restaurante *" value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
      </div>
      <div className="input-row">
        <input className="field-inp" type="url" placeholder="Link do Google Maps (opcional)" value={link}
          onChange={(e) => setLink(e.target.value)} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>FOTO (opcional)</div>
        <ImageDropzone
          value={photo}
          onChange={setPhoto}
          prompt="📎 Arraste, cole (Ctrl+V) ou clique para adicionar uma foto"
          compact
        />
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>CATEGORIAS</div>
        <div className="editor-tags-wrap">
          {Object.keys(tagsData).length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sem categorias ainda — crie uma abaixo ↓</span>
          ) : (
            Object.entries(tagsData).map(([k, t]) => (
              <button
                key={k}
                type="button"
                className={`editor-tag-chip${selectedTags.includes(k) ? ' selected' : ''}`}
                onClick={() => toggleTag(k)}
              >
                {t.name}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="toggle-row">
        <span className={`toggle-label-left${!visited ? ' active' : ''}`}>Ainda não</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={visited} onChange={(e) => setVisited(e.target.checked)} />
          <span className="toggle-track" />
        </label>
        <span className={`toggle-label-right${visited ? ' active' : ''}`}>Já fomos!</span>
      </div>
      {visited && (
        <div style={{ marginTop: 10 }}>
          <StarSelector
            value={starsCaio}
            onChange={setStarsCaio}
            label={`Nota do ${PERSON_LABELS.caio}${person === 'caio' ? ' (você)' : ''}:`}
          />
          <div style={{ marginTop: 6 }}>
            <StarSelector
              value={starsClarice}
              onChange={setStarsClarice}
              label={`Nota da ${PERSON_LABELS.clarice}${person === 'clarice' ? ' (você)' : ''}:`}
            />
          </div>
          <div className="name-row" style={{ marginTop: 8 }}>
            <textarea className="field-inp" rows={2} placeholder="Observações (prato favorito, ambiente, etc.)"
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button className="add-btn" disabled={loading} onClick={handleAdd}>
          {loading ? <div className="spinner" /> : '+ Adicionar'}
        </button>
      </div>
      <div className="err-msg" style={{ display: error ? 'block' : 'none' }}>{error}</div>
    </div>
  );
}
