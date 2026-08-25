import { useRef, useState } from 'react';
import { compressImage, getImageFileFromClipboard, getImageUrlFromClipboardText } from '../utils/utils';

/**
 * Zona de imagem reutilizável: arrastar/soltar, colar (Ctrl+V), ou clicar para escolher arquivo.
 * Comprime a imagem antes de expor via onChange(dataUrlOrEmpty).
 *
 * Consolida a lógica que no projeto original estava duplicada (com pequenas variações) em
 * gifts.js, recipes.js e travels.js (capa do destino, comida, atração, hospedagem, editores).
 */
export default function ImageDropzone({
  value,
  onChange,
  prompt = '📎 Arraste uma imagem, cole (Ctrl+V) ou clique para escolher',
  hint = '',
  compact = false,
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file || !file.type?.startsWith('image/')) return;
    const b64 = await compressImage(file);
    onChange(b64);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function handlePaste(e) {
    const file = getImageFileFromClipboard(e.clipboardData);
    if (file) {
      handleFile(file);
      return;
    }
    const url = getImageUrlFromClipboardText(e.clipboardData);
    if (url) onChange(url);
  }

  function handleClick(e) {
    if (e.target.closest('.img-clear-btn')) return;
    inputRef.current?.click();
  }

  function clear(e) {
    e?.stopPropagation();
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div
      className={`img-drop-zone${dragOver ? ' drag-over' : ''}`}
      onClick={handleClick}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {!value ? (
        <div>
          <p>{prompt}</p>
          {hint && <span>{hint}</span>}
        </div>
      ) : (
        <div style={{ display: compact ? 'inline-block' : 'block' }}>
          <div className="img-preview-wrap">
            <img className="img-preview" src={value} alt="" style={compact ? { maxWidth: 80, borderRadius: 8 } : undefined} />
            <button type="button" className="img-clear-btn" onClick={clear}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}