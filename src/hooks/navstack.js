/**
 * Pilha de "telas internas" para integrar com o botão voltar físico/gestual do Android.
 * Cada vez que uma view interna abre (detalhe de receita, detalhe de viagem, etc.)
 * chamamos pushView(id, onClose). O botão voltar do celular vai chamar onClose() em vez de
 * fechar o app, até a pilha esvaziar.
 *
 * Mantido como módulo simples (fora do ciclo de vida do React) porque lida diretamente com
 * `history.pushState`/`popstate`, que é estado do navegador, não estado de componente.
 */

const stack = [];
let popstateBound = false;

function bindPopstateOnce() {
  if (popstateBound) return;
  popstateBound = true;
  window.addEventListener('popstate', () => {
    const top = stack.pop();
    if (top && typeof top.onClose === 'function') {
      top.onClose();
    }
  });
}

/** Registra uma view interna como "aberta". Chame ao abrir a tela. */
export function pushView(id, onClose) {
  bindPopstateOnce();
  stack.push({ id, onClose });
  history.pushState({ navstack: id }, '');
}

/** Chame quando a view for fechada por um botão normal dentro do app (evita duplo-fechamento). */
export function popView(id) {
  const idx = stack.findIndex((v) => v.id === id);
  if (idx === -1) return;
  stack.splice(idx, 1);
  if (history.state?.navstack === id) {
    history.back();
  }
}