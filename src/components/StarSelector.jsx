import { useState } from 'react';
import { formatStars, PERSON_LABELS } from '../utils/utils';

/** Um dos 5 ícones de estrela clicável, com metade esquerda/direita sensíveis a hover/click. */
function StarUnit({ index, value, onPick }) {
  const [hoverPct, setHoverPct] = useState(null);
  const full = value >= index;
  const half = !full && value >= index - 0.5;
  const pct = hoverPct ?? (full ? '100%' : half ? '50%' : '0%');

  function pctFromEvent(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeft = e.clientX - rect.left < rect.width / 2;
    return isLeft ? '50%' : '100%';
  }

  return (
    <div
      className="hstar-wrap"
      onMouseMove={(e) => setHoverPct(pctFromEvent(e))}
      onMouseLeave={() => setHoverPct(null)}
      onClick={(e) => {
        const isLeft = e.clientX - e.currentTarget.getBoundingClientRect().left < e.currentTarget.getBoundingClientRect().width / 2;
        const newVal = isLeft ? index - 0.5 : index;
        onPick(value === newVal ? 0 : newVal);
      }}
    >
      <span className="hstar-bg">★</span>
      <span className="hstar-fill" style={{ width: pct }}>★</span>
    </div>
  );
}

/** Seletor de nota (0 a 5, em passos de 0.5). Usado no form de adicionar/editar restaurante. */
export function StarSelector({ value, onChange, showLabel = true, label = 'Nota:' }) {
  return (
    <div className="half-star-row">
      <label>{label}</label>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarUnit key={i} index={i} value={value} onPick={onChange} />
      ))}
      {showLabel && value > 0 && (
        <span style={{ fontSize: 12, color: 'var(--acc-dark)', marginLeft: 6, fontWeight: 700 }}>
          {formatStars(value)}
        </span>
      )}
    </div>
  );
}

/** Exibição estática (não interativa) da nota, usada em cards de restaurante. */
export function StarsDisplay({ value }) {
  if (!value) return null;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    let cls = 's-empty';
    if (value >= i) cls = 's-full';
    else if (value >= i - 0.5) cls = 's-half';
    stars.push(<span key={i} className={cls}>★</span>);
  }
  return (
    <span className="rest-stars">
      {stars}
      <span style={{ fontSize: 11, color: 'var(--acc-dark)', marginLeft: 4, fontWeight: 700 }}>
        {formatStars(value)}
      </span>
    </span>
  );
}

/**
 * Exibição estática das notas de Caio e Clarice lado a lado, usada nos cards de restaurante
 * (lista) e nos itens de viagem vinculados a um restaurante.
 */
export function DualStarsDisplay({ starsCaio, starsClarice, compact = false }) {
  if (!starsCaio && !starsClarice) return null;
  return (
    <div className="rest-dual-stars">
      {starsCaio > 0 && (
        <span className="rest-dual-stars-row">
          {!compact && <span className="rest-dual-stars-label">{PERSON_LABELS.caio}</span>}
          <StarsDisplay value={starsCaio} />
        </span>
      )}
      {starsClarice > 0 && (
        <span className="rest-dual-stars-row">
          {!compact && <span className="rest-dual-stars-label">{PERSON_LABELS.clarice}</span>}
          <StarsDisplay value={starsClarice} />
        </span>
      )}
    </div>
  );
}