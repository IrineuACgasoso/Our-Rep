/**
 * Escapa HTML. Só é necessário para os pontos onde ainda montamos strings de HTML cru
 * fora do React (popups do Leaflet, que não é uma biblioteca React) — em todo o resto do
 * app, o próprio JSX já escapa valores automaticamente, então este helper não é usado
 * dentro de componentes normais.
 */
export function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}