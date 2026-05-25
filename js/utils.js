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

export function renderStarsHtml(val) {
  let h = '<span class="rest-stars">';
  for (let i = 1; i <= 5; i++) {
    if (val >= i) h += '<span class="s-full">★</span>';
    else if (val >= i - 0.5) h += '<span class="s-half">★</span>';
    else h += '<span class="s-empty">★</span>';
  }
  h += `<span style="font-size:11px;color:var(--acc-dark);margin-left:4px;font-weight:700">${val % 1 === 0 ? val + '.0' : val}</span>`;
  return h + '</span>';
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
