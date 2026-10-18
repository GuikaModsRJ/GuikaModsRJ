(function configurarServicoDeMods(global) {
  'use strict';

  let canalAtual = null;

  function normalizarMod(valor, idAlternativo) {
    const mod = { ...valor };
    if (!mod.id) mod.id = idAlternativo;
    if (mod.title && !mod.titulo) mod.titulo = mod.title;
    if (mod.desc && !mod.descricao) mod.descricao = mod.desc;
    if (mod.category && !mod.categoria) mod.categoria = mod.category;
    if (mod.image && !mod.img) mod.img = mod.image;
    if (mod.link && !mod.download) mod.download = mod.link;
    if (!mod.tituloTopo) mod.tituloTopo = mod.title || mod.titulo;
    if (mod.data && !mod.timestamp) mod.timestamp = mod.data;
    mod.views = Number.parseInt(mod.views, 10) || 0;
    mod.likes = Number.parseInt(mod.likes, 10) || 0;
    return mod;
  }

  function removerDuplicados(lista) {
    const porId = new Map();
    lista.forEach(mod => {
      if (mod?.id) porId.set(mod.id, { ...(porId.get(mod.id) || {}), ...mod });
    });
    return [...porId.values()];
  }

  function salvar(mods) {
    global.GuikaStorage.local.setItem('modsSalvos', JSON.stringify(mods));
  }

  function substituir(mods, novosMods) {
    const ordenar = lista => [...lista].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const mudou = JSON.stringify(ordenar(mods)) !== JSON.stringify(ordenar(novosMods));
    if (mudou) {
      mods.splice(0, mods.length, ...novosMods);
      salvar(mods);
    }
    return mudou;
  }

  function mesclar(mods, novosMods) {
    const porId = new Map(mods.map(mod => [mod.id, mod]));
    let mudou = false;
    novosMods.forEach(novo => {
      if (!novo?.id) return;
      const atual = porId.get(novo.id);
      if (!atual) {
        mods.push(novo);
        mudou = true;
      } else if (JSON.stringify(atual) !== JSON.stringify({ ...atual, ...novo })) {
        Object.assign(atual, novo);
        mudou = true;
      }
    });
    if (mudou) salvar(mods);
    return mudou;
  }

  function remover(mods, id) {
    const indice = mods.findIndex(mod => mod.id === id);
    if (indice < 0) return false;
    mods.splice(indice, 1);
    salvar(mods);
    return true;
  }

  async function iniciar({ client, mods, aoAtualizar, aoCarregar }) {
    try {
      const { data, error } = await client.from('mods').select('*');
      if (error) console.error('Erro ao carregar mods:', error);
      if (data) {
        const normalizados = removerDuplicados(data.map(mod => normalizarMod(mod, mod.id)));
        if (substituir(mods, normalizados)) aoAtualizar();
      }
    } catch (erro) {
      console.error('Falha inesperada ao carregar mods:', erro);
    } finally {
      aoCarregar();
    }

    if (canalAtual) await client.removeChannel(canalAtual);
    canalAtual = client
      .channel('public:mods')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mods' }, payload => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (mesclar(mods, [normalizarMod(payload.new, payload.new.id)])) aoAtualizar();
        } else if (payload.eventType === 'DELETE' && remover(mods, payload.old.id)) {
          aoAtualizar();
        }
      })
      .subscribe();
  }

  global.GuikaModsService = Object.freeze({ iniciar, normalizarMod });
})(window);
