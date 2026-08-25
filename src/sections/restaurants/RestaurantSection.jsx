import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import AddRestaurantForm from './AddRestaurantForm';
import TagFilters from './TagFilters';
import RestaurantCard from './RestaurantCard';
import RestaurantMap from './RestaurantMap';

export default function RestaurantsSection() {
  const { restaurantsData, tagsData, pendingTravelRestaurant, setPendingTravelRestaurant, travelsData, setActiveSection } = useApp();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState(null);
  const [mapVisible, setMapVisible] = useState(false);

  const entries = useMemo(() => {
    let list = Object.entries(restaurantsData).sort((a, b) => (b[1].addedAt || 0) - (a[1].addedAt || 0));
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
          <button type="button" className={`map-toggle-btn${mapVisible ? ' active' : ''}`} onClick={() => setMapVisible((v) => !v)}>
            🗺️ Mapa
          </button>
        </div>
        <TagFilters tagsData={tagsData} activeTagFilter={tagFilter} onFilterChange={setTagFilter} />
      </div>

      <RestaurantMap visible={mapVisible} entries={mapEntries} tagsData={tagsData} />

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