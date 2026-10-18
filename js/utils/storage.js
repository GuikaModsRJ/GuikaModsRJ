(function configurarStorage(global) {
  'use strict';

  function criarStorageSeguro(storage, nome) {
    return Object.freeze({
      getItem(chave) {
        try { return storage.getItem(chave); }
        catch (erro) { console.error(`Falha ao ler ${nome}:`, erro); return null; }
      },
      setItem(chave, valor) {
        try { storage.setItem(chave, valor); return true; }
        catch (erro) { console.error(`Falha ao gravar ${nome}:`, erro); return false; }
      },
      removeItem(chave) {
        try { storage.removeItem(chave); return true; }
        catch (erro) { console.error(`Falha ao remover item de ${nome}:`, erro); return false; }
      }
    });
  }

  global.GuikaStorage = Object.freeze({
    local: criarStorageSeguro(global.localStorage, 'localStorage'),
    session: criarStorageSeguro(global.sessionStorage, 'sessionStorage')
  });
})(window);
