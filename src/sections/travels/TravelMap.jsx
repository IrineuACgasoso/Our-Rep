import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import PlacesMap from '../../components/PlacesMap';
import TagFilters from '../restaurants/TagFilters';
import { getCatItems } from './catHelpers';

const SELECTORS = [
  { key: 'hospedagem', label: '🏨 Hospedagem' },
  { key: 'passeios', label: '🏛️ Passeios' },
  { key: 'restaurantes', label: '🍽️ Restaurantes' },
];

/** Mapa de uma viagem: mostra só o que está cadastrado nela, com seletores combináveis. */
export default function TravelMap({ dest, visible }) {
  const { restaurantsData, tagsData } = useApp();
  const [selected, setSelected] = useState(['hospedagem']);
  const [tagFilter, setTagFilter] = useState(null);

  function toggle(key) {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      return [...prev, key];
    });
  }

  const entries = useMemo(() => {
    const result = [];
    if (selected.includes('hospedagem')) {
      result.push(...Object.entries(getCatItems(dest, 'hospedagem')).filter(([, it]) => it.name));
    }
    if (selected.includes('passeios')) {
      result.push(...Object.entries(getCatItems(dest, 'passeios')).filter(([, it]) => it.name));
    }
    if (selected.includes('restaurantes')) {
      let list = Object.values(getCatItems(dest, 'culinaria'))
        .filter((it) => it.type === 'restaurant' && restaurantsData[it.restaurantKey])
        .map((it) => [it.restaurantKey, restaurantsData[it.restaurantKey]]);
      if (tagFilter) list = list.filter(([, r]) => r.tags?.includes(tagFilter));
      result.push(...list);
    }
    return result;
  }, [dest, selected, tagFilter, restaurantsData]);

  return (
    <div className="travel-map-wrap">
      <div className="travel-cat-tabs" style={{ padding: '0 1.5rem .75rem' }}>
        {SELECTORS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`travel-cat-tab${selected.includes(s.key) ? ' active' : ''}`}
            onClick={() => toggle(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {selected.includes('restaurantes') && (
        <TagFilters tagsData={tagsData} activeTagFilter={tagFilter} onFilterChange={setTagFilter} />
      )}
      <PlacesMap visible={visible} entries={entries} tagsData={tagsData} cityHint={dest?.name || 'Recife'} />
    </div>
  );
}