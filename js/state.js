/** Estado compartilhado entre módulos das abas */
export const state = {
  activeSection: 'gifts',
  activeGiftTab: 'mine',
  giftsData: { mine: {}, hers: {} },
  restaurantsData: {},
  travelsData: {},
  tagsData: {},
  fetchingGift: false,
  fetchingRest: false,
  pendingImage: null,
  addStars: 0,
  activeTagFilter: null,
  // viagens
  activeTravelKey: null,
  activeTravelCat: 'culinaria',
  pendingDestCover: null,
  pendingTravelRestaurant: null,
  // mapa
  leafletMap: null,
  mapMarkers: [],
  mapVisible: false,
  coordsCache: {}
};

/** Categorias ativas na aba viagens (sem Dicas e Compras) */
export const TRAVEL_CATS = [
  { key: 'culinaria', label: '🍜 Culinária' },
  { key: 'passeios', label: '🏛️ Passeios' },
  { key: 'atracoes', label: '🎡 Atrações' },
  { key: 'hospedagem', label: '🏨 Hospedagem' }
];
