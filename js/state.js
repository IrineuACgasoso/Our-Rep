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
  activeCats: {},
  // mapa
  leafletMap: null,
  mapMarkers: [],
  mapVisible: false,
  coordsCache: {}
};

export const DEST_CATS = [
  '🍜 Culinária', '🏛️ Passeios', '🎡 Atrações',
  '💡 Dicas', '🏨 Hospedagem', '🛍️ Compras'
];
