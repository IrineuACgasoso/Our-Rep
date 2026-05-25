import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebase.js';
import { state } from './state.js';
import { setStatus } from './utils.js';
import { initAuth } from './auth.js';
import { initGifts, renderGiftsGrid, updateGiftCounts } from './gifts.js';
import { initRestaurants, renderRestaurants, renderTagFilters, renderAddRestTags, updateMapMarkers } from './restaurants.js';
import { initTravels, renderTravels } from './travels.js';

const SECTIONS = ['gifts', 'restaurants', 'travels'];
let listenersStarted = false;

/** Carrega HTML parcial de cada aba */
async function loadSections() {
  const panels = {
    gifts: 'panel-gifts',
    restaurants: 'panel-restaurants',
    travels: 'panel-travels'
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
  if (s === 'restaurants') { renderTagFilters(); renderAddRestTags(); renderRestaurants(); }
  if (s === 'travels') renderTravels();
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
  }, () => setStatus('error'));
}

function initNavigation() {
  SECTIONS.forEach(id => {
    document.getElementById('nav-' + id).addEventListener('click', () => setSection(id));
  });
}

async function bootstrap() {
  try {
    await loadSections();
    initNavigation();
    initGifts();
    initRestaurants();
    initTravels();
    initAuth(startListeners);
    setSection(state.activeSection);
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('beforeend',
      '<p style="padding:2rem;text-align:center;color:#f09080">Erro ao carregar o app. Recarregue a página.</p>');
  }
}

bootstrap();

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
