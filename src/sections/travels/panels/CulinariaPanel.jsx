import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../../../firebase/firebase';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';
import ImageDropzone from '../../../components/ImageDropzone';

export default function CulinariaPanel({ travelKey }) {
  const { restaurantsData, setPendingTravelRestaurant, setActiveSection } = useApp();
  const showToast = useToast();
  const [mode, setMode] = useState('food'); // food | restaurant
  const [foodName, setFoodName] = useState('');
  const [foodImg, setFoodImg] = useState('');
  const [foodLink, setFoodLink] = useState('');
  const [selectedRest, setSelectedRest] = useState('');

  async function addFood() {
    const name = foodName.trim();
    if (!name) { showToast('Informe o nome da comida.'); return; }
    if (!foodImg) { showToast('Adicione a foto da comida.'); return; }
    try {
      await push(ref(db, `travels/${travelKey}/cats/culinaria/items`), { type: 'food', name, image: foodImg, link: foodLink.trim(), addedAt: Date.now() });
      setFoodName('');
      setFoodImg('');
      setFoodLink('');
      showToast('Comida adicionada!');
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  function goAddRestaurant() {
    setPendingTravelRestaurant({ travelKey });
    setActiveSection('restaurants');
    showToast('Cadastre o restaurante — ele será vinculado à viagem.');
  }

  async function linkExisting() {
    if (!selectedRest) { showToast('Selecione um restaurante.'); return; }
    try {
      await push(ref(db, `travels/${travelKey}/cats/culinaria/items`), { type: 'restaurant', restaurantKey: selectedRest, addedAt: Date.now() });
      showToast('Restaurante vinculado!');
      setSelectedRest('');
    } catch {
      showToast('Erro ao vincular.');
    }
  }

  const rests = Object.entries(restaurantsData);

  return (
    <div>
      <h4>Adicionar em Culinária</h4>
      <div className="travel-type-btns">
        <button type="button" className={`travel-type-btn${mode === 'food' ? ' active' : ''}`} onClick={() => setMode('food')}>🍽️ Comida</button>
        <button type="button" className={`travel-type-btn${mode === 'restaurant' ? ' active' : ''}`} onClick={() => setMode('restaurant')}>📍 Restaurante</button>
      </div>

      {mode === 'food' ? (
        <div>
          <div className="input-row" style={{ marginBottom: 10 }}>
            <input className="field-inp" type="text" placeholder="Nome da comida *" value={foodName} onChange={(e) => setFoodName(e.target.value)} />
          </div>
          <ImageDropzone value={foodImg} onChange={setFoodImg} prompt="📷 Foto da comida" compact />
          <div className="input-row" style={{ marginTop: 10 }}>
            <input className="field-inp" type="url" placeholder="Link do Google Maps (opcional)" value={foodLink} onChange={(e) => setFoodLink(e.target.value)} />
          </div>
          <button type="button" className="add-btn" style={{ marginTop: 12, width: '100%' }} onClick={addFood}>+ Comida</button>
        </div>
      ) : (
        <div>
          <p className="travel-hint">Use a aba <strong>Restaurantes</strong> para cadastrar com nome, nota, Maps e status. O restaurante ficará salvo aqui na viagem também.</p>
          <button type="button" className="travel-link-rest-btn" onClick={goAddRestaurant}>Ir para aba Restaurantes →</button>
          <div className="travel-existing-rest">
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 6px' }}>Ou vincule um já cadastrado:</p>
            <select value={selectedRest} onChange={(e) => setSelectedRest(e.target.value)} disabled={!rests.length}>
              <option value="">{rests.length ? 'Selecione...' : 'Nenhum restaurante cadastrado'}</option>
              {rests.map(([rk, r]) => <option key={rk} value={rk}>{r.name || 'Sem nome'}</option>)}
            </select>
            <button type="button" className="add-btn" style={{ marginTop: 8, width: '100%' }} disabled={!rests.length} onClick={linkExisting}>
              Vincular selecionado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}