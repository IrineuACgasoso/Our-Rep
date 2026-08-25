/** Busca título e imagem OpenGraph de uma URL, via proxy CORS público (allorigins). */
export async function fetchOG(url) {
  const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(8000),
  });
  const j = await r.json();
  const doc = new DOMParser().parseFromString(j.contents || '', 'text/html');
  const base = new URL(url);
  let title = doc.querySelector('meta[property="og:title"]')?.content || doc.querySelector('title')?.textContent || '';
  let image = doc.querySelector('meta[property="og:image"]')?.content || '';
  if (image && image.startsWith('/')) image = base.origin + image;
  return { title: title.trim().slice(0, 120), image };
}