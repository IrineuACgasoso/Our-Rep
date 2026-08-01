import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { setStatus, showToast } from './utils.js';
import { initAuth } from './auth.js';
import { initGifts, renderGiftsGrid, updateGiftCounts } from './gifts.js';
import { initRestaurants, renderRestaurants, renderTagFilters, renderAddRestTags, updateMapMarkers } from './restaurants.js';
import { initTravels, renderTravels, renderTravelRestBanner } from './travels.js';
import { initRecipes, renderRecipes } from './recipes.js';

const SECTIONS = ['gifts', 'restaurants', 'travels', 'recipes'];
let listenersStarted = false;

async function loadSections() {
  const panels = {
    gifts: 'panel-gifts',
    restaurants: 'panel-restaurants',
    travels: 'panel-travels',
    recipes: 'panel-recipes'
  };
  await Promise.all(
    Object.entries(panels).map(async ([name, panelId]) => {
      const res = await fetch(`sections/${name}.html`);
      if (!res.ok) throw new Error(`Falha ao carregar sections/${name}.html`);
      document.getElementById(panelId).innerHTML = await res.text();
    })
  );
}

export function setSection(s) {
  state.activeSection = s;
  document.documentElement.setAttribute('data-section', s);
  SECTIONS.forEach(id => {
    document.getElementById('nav-' + id).classList.toggle('active', id === s);
    document.getElementById('panel-' + id).classList.toggle('active', id === s);
  });
  if (s === 'gifts') renderGiftsGrid();
  if (s === 'restaurants') {
    renderTagFilters();
    renderAddRestTags();
    renderRestaurants();
    renderTravelRestBanner();
  }
  if (s === 'travels') {
    if (!state.activeTravelKey) {
      document.getElementById('travelsListView')?.removeAttribute('hidden');
      document.getElementById('travelDetailView')?.setAttribute('hidden', '');
    }
    renderTravels();
  }
  if (s === 'recipes') renderRecipes();
}

export function startListeners() {
  if (listenersStarted) return;
  listenersStarted = true;

  ['mine', 'hers'].forEach(tab => {
    onValue(ref(db, `gifts/${tab}`), snap => {
      state.giftsData[tab] = snap.val() || {};
      updateGiftCounts();
      if (state.activeGiftTab === tab && state.activeSection === 'gifts') renderGiftsGrid();
      setStatus('connected');
    }, () => setStatus('error'));
  });

  onValue(ref(db, 'restaurants'), snap => {
    state.restaurantsData = snap.val() || {};
    if (state.activeSection === 'restaurants') {
      renderRestaurants();
      if (state.mapVisible) updateMapMarkers();
    }
  }, () => setStatus('error'));

  onValue(ref(db, 'restTags'), snap => {
    state.tagsData = snap.val() || {};
    if (state.activeSection === 'restaurants') {
      renderTagFilters();
      renderAddRestTags();
    }
  }, () => setStatus('error'));

  onValue(ref(db, 'travels'), snap => {
    state.travelsData = snap.val() || {};
    if (state.activeSection === 'travels') renderTravels();
    if (state.pendingTravelRestaurant) renderTravelRestBanner();
  }, () => setStatus('error'));

  onValue(ref(db, 'recipes'), snap => {
    state.recipesData = snap.val() || {};
    if (state.activeSection === 'recipes') renderRecipes();
  }, () => setStatus('error'));
}

function initNavigation() {
  SECTIONS.forEach(id => {
    document.getElementById('nav-' + id).addEventListener('click', () => setSection(id));
  });
  window.__goRestaurantsForTravel = () => {
    setSection('restaurants');
    renderTravelRestBanner();
    showToast('Cadastre o restaurante — ele será vinculado à viagem.');
  };
  window.__goTravels = () => setSection('travels');
}

async function bootstrap() {
  try {
    await loadSections();
    initNavigation();
    initGifts();
    initRestaurants();
    initTravels();
    initRecipes();
    initAuth(startListeners);
    setSection(state.activeSection);
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('beforeend',
      '<p style="padding:2rem;text-align:center;color:#f09080">Erro ao carregar o app. Recarregue a página.</p>');
  }
}

bootstrap();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}