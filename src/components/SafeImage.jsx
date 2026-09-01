import { useEffect, useState } from 'react';

/**
 * <img> com fallback para quando a URL falha ao carregar (link quebrado, imagem removida, etc.).
 * Substitui o padrão antigo `onError={(e) => e.currentTarget.outerHTML = '...'}`, que manipulava
 * o DOM por fora do React e podia causar erros de reconciliação (ex.: "Failed to execute
 * 'removeChild' on 'Node'") na próxima renderização daquele nó.
 */
export default function SafeImage({ src, alt = '', className, placeholderClassName, placeholder }) {
  const [failed, setFailed] = useState(false);

  // Se a imagem mudar (ex.: usuário trocou a foto), dá uma nova chance de carregar.
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return <div className={placeholderClassName}>{placeholder}</div>;
  }

  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}
