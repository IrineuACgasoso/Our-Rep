/** Utilitários puros e compartilhados entre seções. */

export function domain(u) {
  try {
    return new URL(u).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Comprime uma imagem (File/Blob) para um data URL JPEG, redimensionando
 * para no máximo `maxW` pixels de largura. Mantido idêntico à lógica original
 * porque o Realtime Database tem limite de payload por nó — as imagens são
 * salvas como base64 inline, então precisam ser pequenas.
 */
export function compressImage(file, maxW = 600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const c = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Extrai a primeira imagem de um evento de paste (DataTransferItemList). */
export function getImageFileFromClipboard(clipboardData) {
  if (!clipboardData) return null;
  const item = [...clipboardData.items].find((i) => i.type.startsWith('image/'));
  return item ? item.getAsFile() : null;
}

/** Extrai uma URL de imagem colada como texto (ex: copiar endereço de imagem). */
export function getImageUrlFromClipboardText(clipboardData) {
  if (!clipboardData) return null;
  const text = clipboardData.getData('text/plain')?.trim();
  if (text && /^data:image\/|^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)$/i.test(text)) {
    return text;
  }
  return null;
}

export function formatStars(val) {
  return val % 1 === 0 ? `${val}.0` : `${val}`;
}

/** Rótulos de exibição das duas pessoas que avaliam restaurantes. */
export const PERSON_LABELS = { caio: 'Caio', clarice: 'Clarice' };

/**
 * Só permite abrir/exibir links http(s). Bloqueia esquemas como `javascript:` ou `data:`
 * que, se alguém colar num campo de link (presente, restaurante, receita...), poderiam
 * rodar código ao clicar (self-XSS). Retorna '' se a URL não for http(s) válida.
 */
export function safeExternalUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.href);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {
    /* URL inválida */
  }
  return '';
}
export function personFromEmail(email) {
  if (email === 'clarifloralmeida@gmail.com') return 'clarice';
  return 'caio';
}

/**
 * Converte um erro de leitura/escrita do Firebase numa mensagem amigável para toast.
 * As Database Rules exigem e-mail verificado, então PERMISSION_DENIED normalmente
 * significa isso — mostramos essa dica em vez de um "Erro." genérico.
 */
export function friendlyDbError(err, fallback = 'Erro ao salvar.') {
  if (err?.code === 'PERMISSION_DENIED') {
    return 'Confirme seu e-mail para ter acesso.';
  }
  return fallback;
}