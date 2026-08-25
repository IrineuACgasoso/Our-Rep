import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { escapeHtml } from '../../utils/escapeHtml';

const CIDADE_PADRAO = 'Recife';
const coordsCache = {};

async function geocodeRestaurant(key, r) {
  if (coordsCache[key]) return coordsCache[key];
  if (r.link) {
    const match = r.link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      const coords = { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      coordsCache[key] = coords;
      return coords;
    }
  }
  try {
    await new Promise((res) => setTimeout(res, 300));
    const termoBusca = encodeURIComponent(`${r.name} ${CIDADE_PADRAO}`);
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${termoBusca}&format=json&limit=1`, {
      headers: { 'User-Agent': 'NossaListinha/1.0', 'Accept-Language': 'pt-BR' },
    });
    const data = await resp.json();
    if (data?.[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      coordsCache[key] = coords;
      return coords;
    }
  } catch {
    console.error('Erro ao buscar coordenadas para:', r.name);
  }
  return null;
}

/** Mapa Leaflet com marcadores dos restaurantes (filtrados por categoria ativa). */
export default function RestaurantMap({ visible, entries, tagsData }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Inicializa o mapa uma única vez, na primeira vez que fica visível.
  useEffect(() => {
    if (!visible || mapRef.current || !containerRef.current) return;
    mapRef.current = L.map(containerRef.current, { zoomControl: true }).setView([-8.05, -34.9], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);
    setTimeout(() => mapRef.current?.invalidateSize(), 100);
  }, [visible]);

  // Atualiza marcadores sempre que a lista filtrada mudar, com o mapa visível.
  useEffect(() => {
    if (!visible || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      for (const [key, r] of entries) {
        const coords = await geocodeRestaurant(key, r);
        if (cancelled) return;
        if (!coords) {
          console.warn(`Restaurante invisível no mapa (sem coordenadas): "${r.name}".`);
          continue;
        }
        const color = r.visited ? '#2196F3' : '#F44336';
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          popupAnchor: [0, -7],
        });
        const tagNames = (r.tags || []).map((tk) => tagsData[tk]?.name || '').filter(Boolean).join(' · ');
        const starsText = r.visited && r.stars ? ` · ⭐ ${r.stars % 1 === 0 ? r.stars + '.0' : r.stars}` : '';
        const popup = `<div style="font-family:'Nunito',sans-serif;min-width:150px;padding:2px">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#e2dbd6">${escapeHtml(r.name)}</div>
          <div style="font-size:12px;color:${color};font-weight:600;margin-bottom:4px">${r.visited ? '✅ Já fomos' : '📍 Queremos ir'}${starsText}</div>
          ${tagNames ? `<div style="font-size:11px;color:#888;margin-bottom:4px">${tagNames}</div>` : ''}
          ${r.note ? `<div style="font-size:12px;font-style:italic;color:#aaa;margin-bottom:4px">"${escapeHtml(r.note)}"</div>` : ''}
          ${r.link ? `<a href="${escapeHtml(r.link)}" target="_blank" style="font-size:11px;color:${color};text-decoration:none">📍 Ver no Maps</a>` : ''}
        </div>`;
        const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(mapRef.current);
        marker.bindPopup(popup, { maxWidth: 220 });
        markersRef.current.push(marker);
      }

      if (cancelled) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 14),
        () => mapRef.current?.setView([-8.0476, -34.877], 13)
      );
      mapRef.current?.invalidateSize();
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entries, tagsData]);

  return <div id="restMap" ref={containerRef} className={visible ? 'visible' : ''} />;
}