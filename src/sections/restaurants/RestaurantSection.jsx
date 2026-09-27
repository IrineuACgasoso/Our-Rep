import { Suspense, lazy, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import AddRestaurantForm from './AddRestaurantForm';
import TagFilters from './TagFilters';
import RestaurantCard from './RestaurantCard';

// Leaflet é uma lib pesada (~150KB) usada só quando o mapa é aberto — carregar sob demanda
// evita que todo mundo pague esse custo no bundle inicial, mesmo quem nunca abre o mapa.
const PlacesMap = lazy(() => import('../../components/PlacesMap'));

export default function RestaurantsSection() {
  const { restaurantsData, tagsData, pendingTravelRestaurant, setPendingTravelRestaurant, travelsData, setActiveSection, activeSection } = useApp();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState(null);
  const [mapVisible, setMapVisible] = useState(false);
  // Só monta o <PlacesMap> (e o import lazy do Leaflet) na primeira vez que o usuário
  // realmente abre o mapa — depois disso ele fica montado (visible=false só esconde via CSS)
  // pra não perder o estado do mapa ao trocar de aba.
  const [mapEverOpened, setMapEverOpened] = useState(false);

  const entries = useMemo(() => {
    let list = Object.entries(restaurantsData).sort((a, b) =>
      (a[1].name || '').localeCompare(b[1].name || '', 'pt-BR', { sensitivity: 'base' })
    );
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(([, r]) => r.name?.toLowerCase().includes(q));
    if (tagFilter) list = list.filter(([, r]) => r.tags?.includes(tagFilter));
    return list;
  }, [restaurantsData, search, tagFilter]);

  const mapEntries = useMemo(() => {
    let list = Object.entries(restaurantsData);
    if (tagFilter) list = list.filter(([, r]) => r.tags?.includes(tagFilter));
    return list;
  }, [restaurantsData, tagFilter]);

  const destName = pendingTravelRestaurant ? travelsData[pendingTravelRestaurant.travelKey]?.name : null;

  return (
    <div>
      {pendingTravelRestaurant && (
        <div className="travel-link-banner" style={{ display: 'flex' }}>
          <p>✈️ Cadastrando restaurante para <strong>{destName || 'viagem'}</strong></p>
          <button
            type="button"
            onClick={() => { setPendingTravelRestaurant(null); setActiveSection('travels'); }}
          >
            Cancelar
          </button>
        </div>
      )}

      <AddRestaurantForm tagsData={tagsData} />

      <div className="rest-toolbar">
        <div className="rest-toolbar-top">
          <div className="rest-search-wrap">
            <span className="rest-search-icon">🔍</span>
            <input className="rest-search" type="text" placeholder="Pesquisar restaurante..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button
            type="button"
            className={`map-toggle-btn${mapVisible ? ' active' : ''}`}
            onClick={() => { setMapVisible((v) => !v); setMapEverOpened(true); }}
          >
            🗺️ Mapa
          </button>
        </div>
        <TagFilters tagsData={tagsData} activeTagFilter={tagFilter} onFilterChange={setTagFilter} />
      </div>

      {mapEverOpened && (
        <Suspense fallback={null}>
          <PlacesMap visible={mapVisible && activeSection === 'restaurants'} entries={mapEntries} tagsData={tagsData} />
        </Suspense>
      )}

      <div className="rest-list">
        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <p>{search || tagFilter ? 'Nenhum resultado' : 'Nenhum restaurante ainda'}</p>
            <span>{search || tagFilter ? 'Tente outra busca ou categoria' : 'Adicione um restaurante acima!'}</span>
          </div>
        ) : (
          entries.map(([key, r]) => <RestaurantCard key={key} restKey={key} rest={r} tagsData={tagsData} />)
        )}
      </div>
    </div>
  );
}