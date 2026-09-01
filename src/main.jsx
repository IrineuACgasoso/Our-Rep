import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// leaflet.css precisa vir ANTES de restaurants.css: o Leaflet define popups brancos por
// padrão, e restaurants.css sobrescreve isso pro tema escuro do app. Como RestaurantMap.jsx
// é carregado sob demanda (lazy) por otimização, seu próprio import de leaflet.css viraria um
// chunk separado que podia carregar DEPOIS de restaurants.css — aí o branco padrão do Leaflet
// vencia a cascata e o popup ficava ilegível (texto claro pensado pro fundo escuro, sobre
// fundo branco). Importar aqui, no bundle principal e antes das nossas folhas de estilo,
// garante a ordem certa sempre, mesmo com o mapa carregando depois.
import 'leaflet/dist/leaflet.css';
import './base.css';
import './gifts.css';
import './restaurants.css';
import './travels.css';
import './recipes.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}