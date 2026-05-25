/** Utilitários compartilhados */
export function showToast(m) {
  const t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

export function setStatus(s) {
  const bar = document.getElementById('statusBar');
  bar.className = 'status-bar ' + s;
  document.getElementById('statusText').textContent =
    s === 'connected' ? 'Sincronizado ✓' :
    s === 'error' ? 'Erro de conexão' : 'Conectando...';
}

export function domain(u) {
  try { return new URL(u).hostname.replace('www.', ''); }
  catch { return ''; }
}

export function esc(s) {
  return String(s || '').replace(/'/g, "\\'");
}

export function escH(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function compressImage(file, maxW = 600, quality = 0.75) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => {
      img.onload = () => {
        const c = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
