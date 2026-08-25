import { useEffect, useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../../firebase/firebase';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import ImageDropzone from '../../components/ImageDropzone';
import GiftCard from './GiftCard';
import { fetchOG } from './fetchOG';
import { compressImage, getImageFileFromClipboard } from '../../utils/utils';

const TABS = [
  { id: 'mine', label: '💙 Presentes de Caio' },
  { id: 'hers', label: '🩷 Presentes de Clarice' },
];

export default function GiftsSection() {
  const { giftsData, activeSection } = useApp();
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState('mine');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [pendingImage, setPendingImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Permite colar (Ctrl+V) uma imagem em qualquer lugar da tela enquanto a aba Presentes
  // estiver ativa, igual ao comportamento original (listener global de paste).
  useEffect(() => {
    if (activeSection !== 'gifts') return;
    async function onPaste(e) {
      const file = getImageFileFromClipboard(e.clipboardData);
      if (file) setPendingImage(await compressImage(file));
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [activeSection]);

  async function handleAddGift() {
    if (loading) return;
    setError('');
    let rawUrl = url.trim();
    const customName = name.trim();
    if (!rawUrl && !customName) { setError('Informe um link ou o nome do presente.'); return; }
    if (rawUrl && !rawUrl.startsWith('http')) rawUrl = 'https://' + rawUrl;
    if (rawUrl) {
      try { new URL(rawUrl); } catch { setError('Link inválido.'); return; }
    }
    setLoading(true);
    let title = customName;
    let image = pendingImage || '';
    if (rawUrl) {
      try {
        const og = await fetchOG(rawUrl);
        if (!title) title = og.title || new URL(rawUrl).hostname;
        if (!image) image = og.image;
      } catch {
        if (!title) title = rawUrl;
      }
    }
    if (!title) title = 'Presente';
    try {
      await push(ref(db, `gifts/${activeTab}`), { url: rawUrl || '', title, image: image || '', addedAt: Date.now() });
      setUrl('');
      setName('');
      setPendingImage('');
      showToast('Presente adicionado! 🎁');
    } catch {
      setError('Erro ao salvar.');
    }
    setLoading(false);
  }

  const entries = Object.entries(giftsData[activeTab] || {}).sort((a, b) => (b[1].addedAt || 0) - (a[1].addedAt || 0));

  return (
    <div>
      <div className="tabs-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label} <span className="tab-count">{Object.keys(giftsData[t.id] || {}).length}</span>
          </button>
        ))}
      </div>

      <div className="add-section">
        <h3>Adicionar presente ({activeTab === 'mine' ? 'Caio' : 'Clarice'})</h3>
        <div className="input-row">
          <input
            className="field-inp"
            type="url"
            placeholder="Cole o link do presente aqui..."
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGift()}
          />
          <button className="add-btn" disabled={loading} onClick={handleAddGift}>
            {loading ? <div className="spinner" /> : '+ Adicionar'}
          </button>
        </div>
        <div className="name-row">
          <input
            className="field-inp"
            type="text"
            placeholder="Nome do presente (obrigatório se não tiver link)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGift()}
          />
        </div>
        <ImageDropzone value={pendingImage} onChange={setPendingImage} hint="Opcional — substitui a imagem do link" />
        <div className="err-msg" style={{ display: error ? 'block' : 'none' }}>{error}</div>
      </div>

      <div className="gifts-grid">
        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{activeTab === 'mine' ? '💙' : '🩷'}</div>
            <p>Nenhum presente ainda</p>
            <span>Cole um link acima para começar!</span>
          </div>
        ) : (
          entries.map(([key, g]) => <GiftCard key={key} giftKey={key} gift={g} activeTab={activeTab} />)
        )}
      </div>
    </div>
  );
}