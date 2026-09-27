import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../../../firebase/firebase';
import { useToast } from '../../../context/ToastContext';
import ImageDropzone from '../../../components/ImageDropzone';

export default function HospedagemPanel({ travelKey }) {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [img, setImg] = useState('');
  const [url, setUrl] = useState('');
  const [mapsLink, setMapsLink] = useState('');

  async function add() {
    const n = name.trim();
    if (!n) { showToast('Informe o nome da hospedagem.'); return; }
    if (!img) { showToast('Adicione a imagem da hospedagem.'); return; }
    try {
      await push(ref(db, `travels/${travelKey}/cats/hospedagem/items`), {
        type: 'lodging', name: n, image: img, bookingUrl: url.trim(), link: mapsLink.trim(), addedAt: Date.now(),
      });
      setName('');
      setImg('');
      setUrl('');
      setMapsLink('');
      showToast('Hospedagem adicionada!');
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  return (
    <div>
      <h4>Adicionar Hospedagem</h4>
      <div className="input-row" style={{ marginBottom: 8 }}>
        <input className="field-inp" type="text" placeholder="Nome *" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <ImageDropzone value={img} onChange={setImg} prompt="📷 Imagem do local" compact />
      <div className="input-row" style={{ marginTop: 10 }}>
        <input className="field-inp" type="url" placeholder="Link de reservas (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="input-row" style={{ marginTop: 10 }}>
        <input className="field-inp" type="url" placeholder="Link do Google Maps (opcional)" value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} />
      </div>
      <button type="button" className="add-btn" style={{ marginTop: 12, width: '100%' }} onClick={add}>+ Hospedagem</button>
    </div>
  );
}