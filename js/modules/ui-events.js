(function configurarEventosDaInterface(global) {
  'use strict';

  const actions = {
    abrirLogin: () => global.abrirModalLogin?.(),
    fecharLogin: () => global.fecharModalLogin?.(),
    loginGoogle: () => global.loginComGoogle?.(),
    loginDiscord: () => global.loginComDiscord?.(),
    loginEmail: () => global.fazerLoginEmail?.(),
    mostrarCadastro: () => global.alternarParaCadastro?.(),
    criarConta: () => global.criarContaEmail?.(),
    mostrarLogin: () => global.alternarParaLogin?.(),
    fecharPerfil: () => global.fecharPerfil?.(),
    abrirPerfil: () => global.abrirPerfil?.(),
    logout: () => global.fazerLogout?.(),
    enviarContato: () => global.enviarContato?.()
  };

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    const action = trigger.dataset.action;
    if (action === 'trocarAbaPerfil') {
      global.trocarAbaPerfil?.(trigger.dataset.tab, trigger);
    } else if (action === 'curtirMod') {
      global.curtirMod?.(trigger.dataset.modId);
    } else if (action === 'enviarComentario') {
      global.enviarComentario?.(trigger.dataset.modId, trigger);
    } else if (action === 'apagarComentario') {
      global.apagarComentario?.(trigger.dataset.commentId, trigger.dataset.modId);
    } else if (action === 'abrirResposta') {
      global.abrirResposta?.(trigger.dataset.commentId);
    } else if (action === 'cancelarResposta') {
      global.cancelarResposta?.(trigger.dataset.commentId);
    } else if (action === 'enviarResposta') {
      global.enviarResposta?.(trigger.dataset.commentId, trigger.dataset.modId);
    } else if (action === 'apagarResposta') {
      global.apagarResposta?.(trigger.dataset.commentId, trigger.dataset.modId);
    } else if (action === 'abrirMod') {
      global.fecharPerfil?.();
      location.hash = `mod-${trigger.dataset.modId}`;
    } else if (actions[action]) {
      event.preventDefault();
      actions[action]();
    }
  });

  document.addEventListener('error', event => {
    if (event.target.matches('img[data-hide-on-error]')) event.target.style.display = 'none';
  }, true);

  document.addEventListener('click', event => {
    if (event.target.matches('[data-close-on-backdrop="perfil"]')) global.fecharPerfil?.();
  });

  document.addEventListener('submit', event => {
    if (event.target.id === 'search-form') event.preventDefault();
  });
})(window);
