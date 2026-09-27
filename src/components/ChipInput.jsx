import { useState } from 'react';

/**
 * Input + lista de chips removíveis (usado para ingredientes, links, etc.).
 *
 * O input fica dentro de um <form onSubmit>: isso é o que faz a tecla OK/Concluído do
 * teclado virtual mobile funcionar. onKeyDown checando e.key === 'Enter' não é confiável em
 * teclados mobile (Gboard/SwiftKey no Android disparam 'insertLineBreak' em vez de um keydown
 * de Enter de verdade) — o evento nativo 'submit' do form, com um único input, é acionado pela
 * tecla de ação do teclado em qualquer plataforma.
 */
export default function ChipInput({ id, type = 'text', placeholder, values, onAdd, onRemove }) {
  const [val, setVal] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const v = val.trim();
    if (!v) return;
    onAdd(v);
    setVal('');
  }

  return (
    <div>
      <form className="input-row" onSubmit={handleSubmit}>
        <input
          id={id}
          className="field-inp"
          type={type}
          enterKeyHint="done"
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
      </form>
      {values.length > 0 && (
        <div className="recipe-ing-chips">
          {values.map((v, i) => (
            <span key={i} className="recipe-ing-chip">
              {v}
              <button type="button" onClick={() => onRemove(i)}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
