/**
 * Pilha de "telas internas" para integrar com o botão voltar físico/gestual do Android.
 * Cada vez que uma view interna abre (detalhe de receita, detalhe de viagem, editor, etc.)
 * chamamos pushView(id, onClose). O botão voltar do celular vai chamar onClose() em vez de
 * fechar o app, até a pilha esvaziar.
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
  // Cria uma entrada de histórico "fantasma" pra essa view
  history.pushState({ navstack: id }, '');
}

/** Chame quando a view for fechada por um botão normal (clique em "Voltar" na tela, X, etc.) */
export function popView(id) {
  const idx = stack.findIndex(v => v.id === id);
  if (idx === -1) return;
  stack.splice(idx, 1);
  // Desfaz a entrada de histórico sem disparar onClose de novo
  if (history.state?.navstack === id) {
    history.back();
  }
}