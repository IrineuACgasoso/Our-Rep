export const state = {
  activeSection: 'gifts',
  activeGiftTab: 'mine',
  giftsData: { mine: {}, hers: {} },
  restaurantsData: {},
  travelsData: {},
  tagsData: {},
  recipesData: {},              // NOVO
  activeRecipeKey: null,        // NOVO — chave em edição, se houver
  draftIngredients: [],         // NOVO — ingredientes do rascunho atual
  pendingRecipeImage: null,     // NOVO
  fetchingGift: false,
  fetchingRest: false,
  pendingImage: null,
  addStars: 0,
  activeTagFilter: null,
  activeTravelKey: null,
  activeTravelCat: 'culinaria',
  pendingDestCover: null,
  pendingTravelRestaurant: null,
  leafletMap: null,
  mapMarkers: [],
  mapVisible: false,
  coordsCache: {}
};

export const TRAVEL_CATS = [
  { key: 'culinaria', label: '🍜 Culinária' },
  { key: 'passeios', label: '🏛️ Passeios' },
  { key: 'atracoes', label: '🎡 Atrações' },
  { key: 'hospedagem', label: '🏨 Hospedagem' }
];