// Hambúrguer mobile
(function() {
  const btn = document.getElementById('hamburger-btn');
  const menu = document.getElementById('nav-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', function() {
    const open = menu.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
  });
  menu.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' || e.target.classList.contains('interativo')) {
      if (window.innerWidth <= 768) {
        menu.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', false);
      }
    }
  });
})();

// Admin verificado via banco de dados (is_admin na tabela perfis)
async function verificarSeAdmin(userId) {
    if (!userId || !window.supabaseGlobal) return false;
    try {
        const { data } = await window.supabaseGlobal
            .from('perfis').select('is_admin').eq('id', userId).maybeSingle();
        return data?.is_admin === true;
    } catch(e) { console.error('Erro ao verificar permissão administrativa:', e); return false; }
}
window.currentUserIsAdmin = false;

// Função global para conversão de username → email interno
function usernameParaEmail(username) {
    return username.toLowerCase().trim() + '@guikamods.internal';
}

document.addEventListener("DOMContentLoaded",()=>{
  const { escaparHtml, urlSegura } = window.GuikaUtils;
  const container=document.getElementById("cards"); const titulo=document.getElementById("titulo-section");
  const searchInput=document.getElementById("search-input"); const searchBtn=document.getElementById("search-button"); 

  const modsSalvos=JSON.parse(GuikaStorage.local.getItem("modsSalvos"))||[];
  let LOADED = false; let paginaAtualGlobal = 1; let ultimaCategoriaCache = null; let ultimaBuscaCache = "";

  const nomesCategorias={ motos:"Motos",mapas:"Mods pro Mapa",pecas:"Peças Zmodler", personagens:"Mods de Personagem",outros:"Outros Mods",todos:"Todos os Mods" };

  window.supabaseGlobal = null;
  window.currentUser = null;

  function limparSkeletons() {
    ['skeleton-1','skeleton-2','skeleton-3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function fadeOutIn(callback){
    container.style.transition = 'opacity 0.2s ease'; container.style.opacity = '0';
    setTimeout(()=>{ callback(); window.scrollTo({top:0, behavior:'auto'}); setTimeout(() => { container.style.transition = 'opacity 0.6s ease-out'; container.style.opacity = '1'; }, 50); }, 200); 
  }
  
  function formatarData(dataValor) {
      const data = dataValor ? new Date(dataValor) : null;
      if (!data || isNaN(data.getTime())) return "Data Desconhecida";
      const dia = String(data.getDate()).padStart(2, '0'); const mes = String(data.getMonth() + 1).padStart(2, '0'); const ano = data.getFullYear();
      return `${dia}/${mes}/${ano}`;
  }

  function renderMods(cat, query=""){
    limparSkeletons();
    container.innerHTML=""; container.style.alignItems = "center"; container.style.left = "calc((25% + 2.5rem)/2)"; container.style.width = "100%";
    if(!LOADED && modsSalvos.length === 0){ container.innerHTML = "<p>Carregando mods…</p>"; return; }
    if(cat !== ultimaCategoriaCache || query !== ultimaBuscaCache) { paginaAtualGlobal = 1; ultimaCategoriaCache = cat; ultimaBuscaCache = query; }

    let lista=modsSalvos;
    if(cat && cat!=="todos" && !cat.startsWith("mod")) lista=modsSalvos.filter(m=>m.categoria===cat);
    if(query.trim()!==""){ const q = query.toLowerCase(); lista = lista.filter(m => (m.titulo||"").toLowerCase().includes(q) || (m.descricao||"").toLowerCase().includes(q)); }
    if(lista.length===0){container.innerHTML="<p>Nenhum mod encontrado.</p>";return;}

    const itensPorPagina = 3; const totalPaginas = Math.ceil(lista.length / itensPorPagina);

    function exibirPagina(pagina){
      container.innerHTML = ""; const inicio = (pagina - 1) * itensPorPagina; const fim = inicio + itensPorPagina; const paginaMods = lista.slice(inicio, fim);
      paginaMods.forEach(mod=>{
        const dataLancamento = formatarData(mod.timestamp || mod.data);
        const card=document.createElement("div"); card.className="card"; card.setAttribute("data-id",mod.id);
        card.innerHTML=`<img src="${escaparHtml(urlSegura(mod.img, ''))}" alt="${escaparHtml(mod.titulo)}"><div class='card-content'><h3>${escaparHtml(mod.titulo)}</h3><div style='display:flex; gap:1.5rem; flex-wrap:wrap; margin-top:0.4rem;'><span style='color:var(--muted); font-size:0.95rem;'><strong style='color:#e4e4e7;'>Categoria:</strong> ${escaparHtml(mod.categoria)}</span><span style='color:var(--muted); font-size:0.95rem;'><strong style='color:#e4e4e7;'>Lançamento:</strong> ${escaparHtml(dataLancamento)}</span></div></div>`;
        card.addEventListener("click",()=>{location.hash="mod-"+mod.id;}); container.appendChild(card);
      });

      if(totalPaginas > 1){
        const paginacao = document.createElement("div"); paginacao.style.textAlign = "center"; paginacao.style.margin = "2rem 0";
        const btnPrev = document.createElement("button"); btnPrev.textContent = "← Anterior"; btnPrev.className = "btn-voltar"; btnPrev.style.width = "auto"; btnPrev.style.padding = "0 15px";
        const info = document.createElement("span"); info.style.margin = "0 1rem"; info.style.color = "var(--muted)";
        const btnNext = document.createElement("button"); btnNext.textContent = "Próxima →"; btnNext.className = "btn-voltar"; btnNext.style.width = "auto"; btnNext.style.padding = "0 15px";
        function atualizarBotoes(){ info.textContent = `Página ${paginaAtualGlobal} de ${totalPaginas}`; btnPrev.style.display = paginaAtualGlobal === 1 ? "none" : "inline-block"; btnNext.style.display = paginaAtualGlobal === totalPaginas ? "none" : "inline-block"; }
        btnPrev.onclick = ()=>{ if(paginaAtualGlobal > 1){ paginaAtualGlobal--; exibirPagina(paginaAtualGlobal); atualizarBotoes(); window.scrollTo({top:0, behavior:'smooth'}); } };
        btnNext.onclick = ()=>{ if(paginaAtualGlobal < totalPaginas){ paginaAtualGlobal++; exibirPagina(paginaAtualGlobal); atualizarBotoes(); window.scrollTo({top:0, behavior:'smooth'}); } };
        paginacao.appendChild(btnPrev); paginacao.appendChild(info); paginacao.appendChild(btnNext); container.appendChild(paginacao); atualizarBotoes();
      }
    }
    exibirPagina(paginaAtualGlobal);
  }

  // Verifica no Supabase se o usuário logado já curtiu um mod
  async function verificarCurtida(modId) {
      if(!window.supabaseGlobal || !window.currentUser) return false;
      try {
          const { data } = await window.supabaseGlobal
              .from('curtidas')
              .select('id')
              .eq('mod_id', modId)
              .eq('user_id', window.currentUser.id)
              .maybeSingle();
          return !!data;
      } catch(e) { console.error('Erro ao verificar curtida:', e); return false; }
  }

  window.curtirMod = async function(id) {
      if(!window.supabaseGlobal) return;
      // Exige login para curtir
      if(!window.currentUser) { abrirModalLogin(); return; }
      const likeBtn = document.getElementById("btn-curtir");
      likeBtn.disabled = true; likeBtn.innerHTML = "Curtindo...";
      try {
          // Salva a curtida vinculada ao user_id no Supabase
          const { error: errInsert } = await window.supabaseGlobal
              .from('curtidas')
              .insert({ mod_id: id, user_id: window.currentUser.id });
          if(errInsert && errInsert.code !== '23505') { // 23505 = unique violation (já curtiu)
              likeBtn.innerHTML = "❤️ Curtir"; likeBtn.disabled = false; return;
          }
          // Incrementa contador no banco
          const { error } = await window.supabaseGlobal.rpc('increment_likes', { mod_id_text: id });
          if(!error) {
              const mod = modsSalvos.find(m => m.id === id);
              if(mod) { mod.likes = (mod.likes || 0) + 1; GuikaStorage.local.setItem("modsSalvos", JSON.stringify(modsSalvos)); }
              const contador = document.getElementById("like-counter");
              if(contador && mod) contador.innerText = mod.likes;
              likeBtn.innerHTML = "✅ Curtido"; likeBtn.style.background = "#ef4444"; likeBtn.style.color = "white";
          } else { likeBtn.innerHTML = "❤️ Curtir"; likeBtn.disabled = false; }
      } catch (err) { console.error('Erro ao curtir mod:', err); likeBtn.innerHTML = "❤️ Curtir"; likeBtn.disabled = false; }
  };

  async function mostrarDetalhe(id){
    limparSkeletons();
    const mod=modsSalvos.find(m=>m.id===id);
    if(!mod){inicializar();return;}

    const isLiked = await verificarCurtida(id);

    if(window.supabaseGlobal) {
        const viewKey = `viewed_${id}`;
        if (!GuikaStorage.session.getItem(viewKey)) {
            window.supabaseGlobal.rpc('increment_views', { mod_id_text: id }).then(({error}) => {
                if(!error) {
                    mod.views = (mod.views || 0) + 1; GuikaStorage.local.setItem("modsSalvos", JSON.stringify(modsSalvos));
                    const viewEl = document.getElementById("view-counter"); if(viewEl) viewEl.innerText = mod.views;
                    GuikaStorage.session.setItem(viewKey, 'true');
                }
            });
        }
    }

    container.style.alignItems = "center"; container.style.left = "calc((25% + 2.5rem)/2)"; 
    const dataLancamento = formatarData(mod.timestamp || mod.data);
    const tituloTopo = mod.tituloTopo && mod.tituloTopo.trim() !== "" ? mod.tituloTopo : mod.titulo;
    titulo.textContent=tituloTopo;
    
    let downloadButtons = "";
    if (mod.downloadMediafire) downloadButtons += `<a href="${escaparHtml(urlSegura(mod.downloadMediafire))}" target="_blank" rel="noopener" class="btn-dl btn-mediafire">MEDIAFIRE</a>`;
    if (mod.downloadMega) downloadButtons += `<a href="${escaparHtml(urlSegura(mod.downloadMega))}" target="_blank" rel="noopener" class="btn-dl btn-mega">MEGA</a>`;
    if (mod.downloadDrive) downloadButtons += `<a href="${escaparHtml(urlSegura(mod.downloadDrive))}" target="_blank" rel="noopener" class="btn-dl btn-drive">GOOGLE DRIVE</a>`;
    if (!downloadButtons && mod.download) downloadButtons = `<a href="${escaparHtml(urlSegura(mod.download))}" target="_blank" rel="noopener" class="btn-dl btn-mediafire">BAIXAR MOD</a>`;

    const curtidoHtml = isLiked ? '✅ Curtido' : '❤️ Curtir';
    const curtidoStyle = isLiked ? 'background: #ef4444; color: white;' : '';
    const curtidoDisabled = isLiked ? 'disabled' : '';

    container.innerHTML=`<div class='mod-detalhe'>
        <div class='mod-detalhe-card'>
          <a href="${escaparHtml(urlSegura(mod.img))}" target="_blank" rel="noopener"><img src="${escaparHtml(urlSegura(mod.img, ''))}" alt="${escaparHtml(mod.titulo)}"></a>
          <div class='card-content'>
            <h3>${escaparHtml(mod.titulo)}</h3>
            <div class="stats-container">
                <div class="stats-info">
                    <span>👁️ <span id="view-counter">${mod.views || 0}</span> visualizações</span>
                    <span>❤️ <span id="like-counter">${mod.likes || 0}</span> curtidas</span>
                </div>
                <button id="btn-curtir" class="btn-like" data-action="curtirMod" data-mod-id="${escaparHtml(mod.id)}" style="${curtidoStyle}" ${curtidoDisabled}>${curtidoHtml}</button>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:0; flex-wrap:wrap; justify-content:center; margin:0.8rem 0; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; width:100%;"><span style="flex:1; min-width:160px; text-align:center; padding:0.7rem 1rem; color:var(--muted); font-size:0.9rem; border-right:1px solid rgba(255,255,255,0.08);"><strong style="color:#e4e4e7;">Categoria:</strong> ${escaparHtml(mod.categoria)}</span><span style="flex:1; min-width:160px; text-align:center; padding:0.7rem 1rem; color:var(--muted); font-size:0.9rem;"><strong style="color:#e4e4e7;">Lançamento:</strong> ${escaparHtml(dataLancamento)}</span></div>
        <p class="descricao-texto">${escaparHtml(mod.descricao||"")}</p>
        <div class="btn-group-container"><div class="download-container">${downloadButtons}</div><a href="#" class="btn-voltar">Voltar</a></div>
        
        <div class="comments-wrapper" id="comments-wrapper">
            <h3>Comentários</h3>
            <div id="comments-container">Carregando comentários...</div>
        </div>
      </div>`;
    
    document.querySelector(".btn-voltar").addEventListener("click",(e)=>{ e.preventDefault(); history.back(); });
    carregarComentarios(mod.id);
  }

  // LÓGICA DE COMENTÁRIOS E RESPOSTA
  window.carregarComentarios = async function(modId) {
      const cContainer = document.getElementById('comments-container');
      if(!window.supabaseGlobal || !cContainer) return;

      // Busca sessao fresca — fonte de verdade para user_id e username
      const { data: sessionData } = await window.supabaseGlobal.auth.getSession();
      const sessionUser = sessionData?.session?.user || null;

      // Sincroniza window.currentUser com a sessao real
      if(sessionUser) {
          if(!window.currentUser) window.currentUser = sessionUser;
          window.currentUser.id = sessionUser.id;
          // Garante username correto
          if(!window.currentUser.username) {
              window.currentUser.username = sessionUser.user_metadata?.username
                  || sessionUser.user_metadata?.full_name?.split(' ')[0]
                  || sessionUser.user_metadata?.name?.split(' ')[0]
                  || sessionUser.email?.replace('@guikamods.internal','')
                  || 'Usuario';
          }
      } else {
          window.currentUser = null;
      }

      const { data, error } = await window.supabaseGlobal
          .from('comentarios').select('*').eq('mod_id', modId).order('criado_em', { ascending: false });

      let html = '';

      if(sessionUser && window.currentUser) {
          const username = window.currentUser.username || window.currentUser.email?.replace('@guikamods.internal','') || 'Usuario';
          html += `
          <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
              <p style="text-align: left; margin-top: 0; color: var(--muted); font-size: 0.9rem;">Comentando como: <strong style="color: white;">${escaparHtml(username)}</strong></p>
              <textarea id="novo-comentario-texto" placeholder="O que achou deste mod?" style="width: 100%; box-sizing: border-box; height: 90px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: white; padding: 12px; resize: vertical; margin-bottom: 15px; font-family: inherit; font-size: 0.95rem;"></textarea>
              <button data-action="enviarComentario" data-mod-id="${escaparHtml(modId)}" class="btn-voltar" style="margin: 0 auto; background: #2b2b2b; border: 1px solid rgba(255,255,255,0.15);">Postar Comentario</button>
          </div>`;
      } else {
          html += `
          <div class="login-prompt">
              <p style="margin-bottom: 20px; color: white; font-weight: 600; font-size: 1.1rem;">Faça login para poder fazer um comentário.</p>
              <button data-action="abrirLogin" class="btn-voltar" style="margin: 0 auto; background: #2b2b2b; color: white; width: 180px;">Criar conta / Entrar</button>
          </div>`;
      }

      let commentsHtml = '';
      if(error || !data || data.length === 0) {
          commentsHtml += `<p style="color: var(--muted); text-align: center; padding: 2rem 0;">Nenhum comentário ainda. Seja o primeiro!</p>`;
      } else {
          data.forEach(c => {
              const dataFormatada = new Date(c.criado_em).toLocaleString('pt-BR');
              const currentUsername = window.currentUser ? (window.currentUser.username || window.currentUser.email?.replace('@guikamods.internal','')) : '';
              const isAdmin = window.currentUser && window.currentUserIsAdmin;
              // Usa sessionUser.id (sessao fresca) como fonte de verdade para ownership
              const realUserId = sessionUser ? sessionUser.id : (window.currentUser ? window.currentUser.id : null);
              const isOwnerOrAdmin = realUserId && (realUserId === c.user_id || isAdmin);
              
              const deleteBtn = isOwnerOrAdmin ? `<button class="btn-delete" data-action="apagarComentario" data-comment-id="${escaparHtml(c.id)}" data-mod-id="${escaparHtml(modId)}">Apagar</button>` : '';
              const replyBtn = isAdmin && !c.resposta ? `<button class="btn-edit" style="background: transparent; border: 1px solid #3b82f6; color: #3b82f6; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;" data-action="abrirResposta" data-comment-id="${escaparHtml(c.id)}">Responder</button>` : '';

              let respostaHtml = '';
              if(c.resposta) {
                  const deleteRespostaBtn = isAdmin ? `<button class="btn-delete" style="font-size: 0.75rem; padding: 2px 6px; margin-left: 10px; border-color: transparent;" data-action="apagarResposta" data-comment-id="${escaparHtml(c.id)}" data-mod-id="${escaparHtml(modId)}">Excluir Resposta</button>` : '';
                  respostaHtml = `
                  <div style="margin-top: 10px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 10px 15px; border-radius: 0 8px 8px 0;">
                      <div style="font-size: 0.85rem; color: #3b82f6; font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">👑 Resposta do Admin ${deleteRespostaBtn}</div>
                      <div style="font-size: 0.95rem; color: var(--text);">${escaparHtml(c.resposta)}</div>
                  </div>`;
              }

              let replyBoxHtml = `<div id="reply-box-${c.id}" style="display: none; margin-top: 10px;">
                  <textarea id="reply-text-${c.id}" placeholder="Escreva a resposta do site..." style="width: 100%; box-sizing: border-box; height: 60px; background: rgba(0,0,0,0.3); border: var(--border); border-radius: 8px; color: white; padding: 8px; resize: vertical; margin-bottom: 8px; font-family: inherit; font-size: 0.9rem;"></textarea>
                  <div style="display: flex; gap: 10px; justify-content: flex-end;">
                      <button data-action="cancelarResposta" data-comment-id="${escaparHtml(c.id)}" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: var(--muted); padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Cancelar</button>
                      <button data-action="enviarResposta" data-comment-id="${escaparHtml(c.id)}" data-mod-id="${escaparHtml(modId)}" style="background: #3b82f6; border: none; color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Enviar</button>
                  </div>
              </div>`;

              const isCommentAuthorAdmin = c.is_admin_comment === true;
              const authorLabel = isCommentAuthorAdmin 
                  ? `👑 ${escaparHtml(c.user_name)} <span style="font-size:0.75rem; background: rgba(59,130,246,0.2); color: #60a5fa; padding: 2px 7px; border-radius: 4px; font-weight: 600; margin-left: 4px;">Admin</span>`
                  : `👤 ${escaparHtml(c.user_name || 'Usuário')}`;

              commentsHtml += `
              <div class="comment-item">
                  <div class="comment-top">
                      <span class="comment-author">${authorLabel}</span>
                      <span class="comment-date">${dataFormatada}</span>
                  </div>
                  <div class="comment-text">${escaparHtml(c.texto)}</div>
                  ${respostaHtml}
                  ${(deleteBtn || replyBtn) ? `<div class="comment-actions" style="margin-top: 10px;">${replyBtn} ${deleteBtn}</div>` : ''}
                  ${isAdmin ? replyBoxHtml : ''}
              </div>`;
          });
      }
      html += `<div class="comments-list">${commentsHtml}</div>`;
      cContainer.innerHTML = html;
  };

  window.enviarComentario = async function(modId, botao) {
      const texto = document.getElementById('novo-comentario-texto').value.trim();
      if(!texto) return;

      const btn = botao; btn.disabled = true; btn.innerText = "Enviando...";

      // Busca sessao fresca para garantir o user_id correto da conta atual
      const { data: sessionData } = await window.supabaseGlobal.auth.getSession();
      const sessionUser = sessionData?.session?.user;
      if(!sessionUser) {
          alert("Voce precisa estar logado para comentar.");
          btn.disabled = false; btn.innerText = "Postar Comentario";
          return;
      }

      // Sincroniza currentUser com a sessao real
      if(window.currentUser) window.currentUser.id = sessionUser.id;
      const username = window.currentUser?.username
          || sessionUser.user_metadata?.username
          || sessionUser.email?.replace('@guikamods.internal','')
          || 'Usuario';

      const { error } = await window.supabaseGlobal.from('comentarios').insert({
          mod_id: modId,
          user_id: sessionUser.id,
          user_name: username,
          texto: texto
      });

      if(!error) { carregarComentarios(modId); } 
      else { 
          alert("Erro ao enviar comentario: " + error.message); 
          btn.disabled = false; btn.innerText = "Postar Comentario"; 
      }
  };

  window.apagarComentario = async function(comentarioId, modId) {
      if(!confirm("Tem certeza que deseja apagar este comentário?")) return;
      const { error } = await window.supabaseGlobal
          .rpc('admin_apagar_comentario', { comentario_id: comentarioId });
      if(!error) { 
          carregarComentarios(modId); 
      } else { 
          console.error('Erro apagar:', error);
          alert("Erro ao apagar: " + error.message + " | " + error.code); 
      }
  };

  window.abrirResposta = function(id) {
      const box = document.getElementById('reply-box-'+id);
      if(box) box.style.display = 'block';
  };
  
  window.cancelarResposta = function(id) {
      const box = document.getElementById('reply-box-'+id);
      const txt = document.getElementById('reply-text-'+id);
      if(box) box.style.display = 'none';
      if(txt) txt.value = '';
  };

  window.enviarResposta = async function(comentarioId, modId) {
      const txtEl = document.getElementById('reply-text-'+comentarioId);
      const texto = txtEl ? txtEl.value.trim() : '';
      if(!texto) return;
      const { error } = await window.supabaseGlobal
          .rpc('admin_responder_comentario', { comentario_id: comentarioId, texto_resposta: texto });
      if(!error) { 
          carregarComentarios(modId); 
      } else { 
          console.error('Erro resposta:', error);
          alert("Erro ao enviar resposta: " + error.message + " | " + error.code); 
      }
  };

  window.apagarResposta = async function(comentarioId, modId) {
      if(!confirm("Tem certeza que deseja apagar sua resposta?")) return;
      const { error } = await window.supabaseGlobal
          .rpc('admin_apagar_resposta', { comentario_id: comentarioId });
      if(!error) { 
          carregarComentarios(modId); 
      } else { 
          console.error('Erro apagar resposta:', error);
          alert("Erro ao apagar resposta: " + error.message); 
      }
  };

  // LÓGICA DE AUTENTICAÇÃO (LOGIN VIA USERNAME + SENHA)
  window.alternarParaCadastro = () => {
      document.getElementById('auth-form-login').style.display = 'none';
      document.getElementById('auth-form-cadastro').style.display = 'flex';
      document.getElementById('auth-social-btns').style.display = 'none';
      document.getElementById('auth-modal-titulo').innerText = 'Criar Conta';
      document.getElementById('auth-modal-subtitulo').innerText = 'Escolha um usuário e senha para entrar.';
      document.getElementById('auth-msg').innerText = '';
  };

  window.alternarParaLogin = () => {
      document.getElementById('auth-form-cadastro').style.display = 'none';
      document.getElementById('auth-form-login').style.display = 'flex';
      document.getElementById('auth-social-btns').style.display = 'block';
      document.getElementById('auth-modal-titulo').innerText = 'Acesse sua Conta';
      document.getElementById('auth-modal-subtitulo').innerText = 'Entre para curtir, comentar e acompanhar mods.';
      document.getElementById('auth-msg').innerText = '';
  };

  window.abrirModalLogin = () => { 
      document.getElementById('auth-modal').style.display = 'flex'; 
      document.getElementById('auth-msg').innerText = '';
      alternarParaLogin();
  };

  window.fecharModalLogin = () => { 
      document.getElementById('auth-modal').style.display = 'none';
      document.getElementById('auth-username').value = '';
      document.getElementById('auth-senha').value = '';
      document.getElementById('cad-username').value = '';
      document.getElementById('cad-senha').value = '';
      document.getElementById('auth-msg').innerText = '';
  };

  window.fazerLoginEmail = async () => {
      if(!window.supabaseGlobal) return;
      const username = document.getElementById('auth-username').value.trim();
      const senha = document.getElementById('auth-senha').value;
      const msg = document.getElementById('auth-msg');
      
      if(!username || !senha) { msg.style.color = "#ef4444"; msg.innerText = "Preencha o usuário e a senha."; return; }
      msg.style.color = "var(--muted)"; msg.innerText = "Entrando...";

      const email = usernameParaEmail(username);
      const { data, error } = await window.supabaseGlobal.auth.signInWithPassword({ email, password: senha });

      if(error) { 
          msg.style.color = "#ef4444";
          if(error.message === "Invalid login credentials") {
              msg.innerText = "Usuário ou senha incorretos. Se você criou a conta antes da atualização do site, crie uma nova conta com o mesmo nome de usuário.";
          } else {
              msg.innerText = error.message;
          }
      } else {
          // Garante que o perfil existe e é marcado como admin se for conta admin
          if(data.session?.user) {
              const userId = data.session.user.id;
              
              await window.supabaseGlobal.from('perfis').upsert({ 
                  id: userId, 
                  username: username,
                  // is_admin gerenciado apenas pelo banco,
                  criado_em: new Date().toISOString()
              }, { onConflict: 'id' });
          }
          fecharModalLogin();
      }
  };

  window.criarContaEmail = async () => {
      if(!window.supabaseGlobal) return;
      const username = document.getElementById('cad-username').value.trim();
      const senha = document.getElementById('cad-senha').value;
      const msg = document.getElementById('auth-msg');
      
      if(!username || !senha) { msg.style.color = "#ef4444"; msg.innerText = "Preencha o usuário e a senha."; return; }
      if(username.length < 3) { msg.style.color = "#ef4444"; msg.innerText = "Usuário precisa ter pelo menos 3 caracteres."; return; }
      if(!/^[a-zA-Z0-9_]+$/.test(username)) { msg.style.color = "#ef4444"; msg.innerText = "Usuário só pode ter letras, números e _."; return; }
      if(senha.length < 6) { msg.style.color = "#ef4444"; msg.innerText = "A senha precisa ter pelo menos 6 caracteres."; return; }
      
      msg.style.color = "var(--muted)"; msg.innerText = "Criando conta...";

      const email = usernameParaEmail(username);
      const { data, error } = await window.supabaseGlobal.auth.signUp({
          email,
          password: senha,
          options: { data: { username: username } }
      });

      if(error) { 
          msg.style.color = "#ef4444";
          msg.innerText = error.message === "User already registered" ? "Este usuário já existe. Tente outro." : error.message;
      } else {
          // Pega o user do data ou da sessão atual (quando confirm email está desligado)
          const userId = data.user?.id || data.session?.user?.id;
          if(userId) {
              const { error: perfisError } = await window.supabaseGlobal.from('perfis').upsert({ 
                  id: userId, 
                  username: username,
                  criado_em: new Date().toISOString()
              }, { onConflict: 'id' });
              if(perfisError) console.error('Erro ao salvar perfil:', perfisError);
          }
          msg.style.color = "#10b981";
          msg.innerText = "Conta criada! Agora clique em Entrar.";
          setTimeout(() => alternarParaLogin(), 1500);
      }
  };

  window.loginComGoogle = async () => {
      if(!window.supabaseGlobal) return;
      const { error } = await window.supabaseGlobal.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.href }
      });
      if(error) { document.getElementById('auth-msg').style.color = '#ef4444'; document.getElementById('auth-msg').innerText = 'Erro ao entrar com Google: ' + error.message; }
  };

  window.loginComDiscord = async () => {
      if(!window.supabaseGlobal) return;
      const { error } = await window.supabaseGlobal.auth.signInWithOAuth({
          provider: 'discord',
          options: { redirectTo: window.location.href }
      });
      if(error) { document.getElementById('auth-msg').style.color = '#ef4444'; document.getElementById('auth-msg').innerText = 'Erro ao entrar com Discord: ' + error.message; }
  };

  window.abrirPerfil = async () => {
      const modal = document.getElementById('perfil-modal');
      if(!modal || !window.currentUser) return;
      modal.style.display = 'flex';

      // Reseta para a aba Atividade ao abrir
      document.querySelectorAll('.perfil-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.perfil-tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelector('.perfil-tab[data-tab="atividade"]')?.classList.add('active');
      document.getElementById('perfil-panel-atividade')?.classList.add('active');

      const username = window.currentUser.username || 'Usuário';
      const isAdmin = window.currentUserIsAdmin;
      document.getElementById('perfil-nome').innerText = username;
      document.getElementById('perfil-badge').innerText = isAdmin ? '👑 Admin' : 'Membro';

      atualizarBadgeMsgsPerfil();

      // Mods curtidos (via Supabase por user_id)
      const curtidosEl = document.getElementById('perfil-curtidos');
      curtidosEl.innerHTML = '<div class="perfil-empty">Carregando...</div>';
      try {
          const { data: curtidas } = await window.supabaseGlobal
              .from('curtidas').select('mod_id').eq('user_id', window.currentUser.id);
          if(!curtidas || curtidas.length === 0) {
              curtidosEl.innerHTML = '<div class="perfil-empty">Nenhum mod curtido ainda.</div>';
          } else {
              const likedIds = curtidas.map(c => c.mod_id);
              const modsLiked = modsSalvos.filter(m => likedIds.includes(m.id));
              if(modsLiked.length === 0) {
                  curtidosEl.innerHTML = '<div class="perfil-empty">Nenhum mod encontrado.</div>';
              } else {
                  curtidosEl.innerHTML = modsLiked.map(m => `
                       <div class="perfil-mod-item" data-action="abrirMod" data-mod-id="${escaparHtml(m.id)}">
                           <img class="perfil-mod-img" src="${escaparHtml(urlSegura(m.img, ''))}" alt="${escaparHtml(m.titulo)}" data-hide-on-error>
                           <div class="perfil-mod-info"><p>${escaparHtml(m.titulo)}</p><span>${escaparHtml(m.categoria||'')}</span></div>
                      </div>`).join('');
              }
          }
      } catch(e) { console.error('Erro ao carregar mods curtidos:', e); curtidosEl.innerHTML = '<div class="perfil-empty">Erro ao carregar.</div>'; }

      // Mods comentados (via Supabase)
      const comentadosEl = document.getElementById('perfil-comentados');
      comentadosEl.innerHTML = '<div class="perfil-empty">Carregando...</div>';
      try {
          const { data } = await window.supabaseGlobal
              .from('comentarios').select('mod_id').eq('user_id', window.currentUser.id);
          if(!data || data.length === 0) {
              comentadosEl.innerHTML = '<div class="perfil-empty">Nenhum comentário ainda.</div>';
          } else {
              const modIdsUnicos = [...new Set(data.map(c => c.mod_id))];
              const modsComentados = modsSalvos.filter(m => modIdsUnicos.includes(m.id));
              if(modsComentados.length === 0) {
                  comentadosEl.innerHTML = '<div class="perfil-empty">Mods não encontrados.</div>';
              } else {
                  comentadosEl.innerHTML = modsComentados.map(m => `
                       <div class="perfil-mod-item" data-action="abrirMod" data-mod-id="${escaparHtml(m.id)}">
                           <img class="perfil-mod-img" src="${escaparHtml(urlSegura(m.img, ''))}" alt="${escaparHtml(m.titulo)}" data-hide-on-error>
                           <div class="perfil-mod-info"><p>${escaparHtml(m.titulo)}</p><span>${escaparHtml(m.categoria||'')}</span></div>
                      </div>`).join('');
              }
          }
      } catch(e) { console.error('Erro ao carregar mods comentados:', e); comentadosEl.innerHTML = '<div class="perfil-empty">Erro ao carregar.</div>'; }
  };

  window.fecharPerfil = () => {
      const modal = document.getElementById('perfil-modal');
      if(modal) modal.style.display = 'none';
  };

  window.trocarAbaPerfil = function(aba, btn) {
      document.querySelectorAll('.perfil-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.perfil-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('perfil-panel-' + aba).classList.add('active');
      if (aba === 'mensagens') carregarMsgsPerfil();
  };

  async function carregarMsgsPerfil() {
      if (!window.supabaseGlobal || !window.currentUser) return;
      const lista = document.getElementById('perfil-msgs-lista');
      lista.innerHTML = '<div class="perfil-empty">Carregando...</div>';

      const { data, error } = await window.supabaseGlobal
          .from('mensagens_contato')
          .select('*')
          .eq('user_id', window.currentUser.id)
          .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
          lista.innerHTML = '<div class="perfil-empty">Você ainda não enviou nenhuma mensagem. <a href="contato.html" style="color:#fff;">Fale conosco</a>.</div>';
          return;
      }

      // Marca todas as respostas existentes como vistas e limpa badges
      const idsComResposta = data.filter(m => m.resposta).map(m => m.id);
      if (idsComResposta.length > 0) {
          marcarRespostasComoVistas(idsComResposta);
          // Esconde badge da aba
          const badge = document.getElementById('perfil-badge-msgs');
          if (badge) badge.style.display = 'none';
          // Remove bolinha do nav
          const navBadge = document.querySelector('.nav-perfil-badge');
          if (navBadge) navBadge.remove();
      }

      lista.innerHTML = data.map(msg => {
          const dataStr = new Date(msg.created_at).toLocaleString('pt-BR');
          const respondida = !!msg.resposta;
          const statusHtml = respondida
              ? '<span class="perfil-msg-status respondida-tag">✅ Respondido</span>'
              : '<span class="perfil-msg-status aguardando">⏳ Aguardando resposta</span>';
          const respostaHtml = respondida ? `
              <div class="perfil-resposta-box">
                  <div class="label">👑 Resposta do Admin</div>
                  <p>${escaparHtml(msg.resposta)}</p>
              </div>` : '';
          return `
          <div class="perfil-msg-item ${respondida ? 'respondida' : 'nao-respondida'}">
              <div class="perfil-msg-assunto">📌 ${escaparHtml(msg.assunto||'Sem assunto')}</div>
              <div class="perfil-msg-data">${dataStr}</div>
              ${statusHtml}
              <div class="perfil-msg-texto">${escaparHtml(msg.mensagem||'')}</div>
              ${respostaHtml}
          </div>`;
      }).join('');
  }

  // Chave do localStorage para respostas já vistas pelo usuário
  function chaveRespostasVistas() {
      return 'respostas_vistas_' + (window.currentUser?.id || '');
  }
  function getRespostasVistas() {
      try { return JSON.parse(GuikaStorage.local.getItem(chaveRespostasVistas()) || '[]'); } catch(e) { console.error('Falha ao interpretar respostas vistas:', e); return []; }
  }
  function marcarRespostasComoVistas(ids) {
      try {
          const vistas = getRespostasVistas();
          const novas = [...new Set([...vistas, ...ids])];
          GuikaStorage.local.setItem(chaveRespostasVistas(), JSON.stringify(novas));
      } catch(e) { console.error('Falha ao marcar respostas como vistas:', e); }
  }

  // Atualiza badge da aba mensagens ao abrir o perfil
  // Mostra bolinha vermelha quando há RESPOSTAS NOVAS não vistas
  async function atualizarBadgeMsgsPerfil() {
      if (!window.supabaseGlobal || !window.currentUser) return;
      try {
          const { data } = await window.supabaseGlobal
              .from('mensagens_contato')
              .select('id, resposta')
              .eq('user_id', window.currentUser.id)
              .not('resposta', 'is', null);
          const badge = document.getElementById('perfil-badge-msgs');
          if (!badge) return;
          if (!data || data.length === 0) { badge.style.display = 'none'; return; }
          const vistas = getRespostasVistas();
          const novasRespostas = data.filter(m => !vistas.includes(m.id));
          if (novasRespostas.length > 0) {
              badge.textContent = novasRespostas.length;
              badge.style.display = 'inline-flex';
          } else {
              badge.style.display = 'none';
          }
      } catch(e) { console.error('Erro ao atualizar badge de mensagens:', e); }
  }

  // Também mostra badge no nome do usuário no nav quando há respostas novas
  async function verificarRespostasNovasParaUsuario() {
      if (!window.supabaseGlobal || !window.currentUser) return;
      try {
          const { data } = await window.supabaseGlobal
              .from('mensagens_contato')
              .select('id, resposta')
              .eq('user_id', window.currentUser.id)
              .not('resposta', 'is', null);
          if (!data || data.length === 0) return;
          const vistas = getRespostasVistas();
          const novas = data.filter(m => !vistas.includes(m.id));
          if (novas.length > 0) {
              // Adiciona bolinha vermelha no link do perfil no nav
              const menuItem = document.getElementById('auth-menu-item');
              if (menuItem) {
                  const link = menuItem.querySelector('a');
                  if (link && !link.querySelector('.nav-perfil-badge')) {
                      const dot = document.createElement('span');
                      dot.className = 'nav-perfil-badge';
                      dot.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;font-size:0.65rem;font-weight:700;margin-left:4px;vertical-align:middle;animation:pulse-nav 1.5s ease-in-out infinite;';
                      dot.textContent = novas.length;
                      link.appendChild(dot);
                  }
              }
          }
      } catch(e) { console.error('Erro ao verificar respostas novas:', e); }
  }

  // Verifica mensagens não lidas (só para admins)
  async function verificarMsgsAdmin(username) {
    if (!window.supabaseGlobal || !window.currentUserIsAdmin) return;
    try {
      const { count } = await window.supabaseGlobal
        .from('mensagens_contato')
        .select('id', { count: 'exact', head: true })
        .eq('lida', false);

      // botão admin removido do nav
    } catch(e) { console.error('Erro ao verificar mensagens administrativas:', e); }
  }

  window.fazerLogout = async () => {      fecharPerfil();
      if(window.supabaseGlobal) {
          const { error } = await window.supabaseGlobal.auth.signOut();
          if(error) console.error('Erro ao fazer logout:', error);
      }
      // Força limpeza local caso o evento não dispare
      window.currentUser = null;
      window.currentUserIsAdmin = false;
      const menuItem = document.getElementById('auth-menu-item');
      if (menuItem) menuItem.innerHTML = '<a href="#" data-action="abrirLogin">Entrar</a>';
      const hash = location.hash.replace('#','');
      if(hash.startsWith('mod-')) { carregarComentarios(hash.replace('mod-','')); }
  };

  function atualizarMenuUsuario(session) {
      const menuItem = document.getElementById('auth-menu-item');
      if(session && session.user) {
          window.currentUser = session.user;
          // Suporte a login por usuário/senha, Google e Discord
          let username = session.user.user_metadata?.username 
              || session.user.user_metadata?.custom_claims?.username
              || session.user.user_metadata?.preferred_username
              || session.user.user_metadata?.full_name
              || session.user.user_metadata?.name
              || (session.user.email && !session.user.email.includes('@guikamods.internal') ? session.user.email.split('@')[0] : null)
              || session.user.email?.replace('@guikamods.internal','')
              || 'Usuário';
          // Se vier nome completo (OAuth), pegar só o primeiro nome
          if(username && username.includes(' ')) username = username.split(' ')[0];
          window.currentUser.username = username;

          // Sincroniza perfil no banco (funciona para email e OAuth)
          if(window.supabaseGlobal) {
              
              window.supabaseGlobal.from('perfis').upsert({ 
                  id: session.user.id, username: username,
                  criado_em: new Date().toISOString()
              }, { onConflict: 'id' }).then(() => {});
          }

          // Consulta is_admin no banco antes de liberar funcionalidades
          verificarSeAdmin(session.user.id).then(isAdm => {
              window.currentUserIsAdmin = isAdm;
              menuItem.innerHTML = `<a href="#" class="auth-profile-link" data-action="abrirPerfil">&#128100; ${escaparHtml(username)}</a>`;
              verificarMsgsAdmin(username);
              verificarRespostasNovasParaUsuario();
          });
      } else {
          window.currentUser = null;
          menuItem.innerHTML = `<a href="#" data-action="abrirLogin">Entrar</a>`;
      }
      const hash = location.hash.replace("#","");
      if(hash.startsWith("mod-")) { carregarComentarios(hash.replace("mod-","")); }
  }

  function atualizarContadores(){
    const contadores={motos:0,mapas:0,pecas:0,personagens:0,outros:0};
    modsSalvos.forEach(m=>{if(contadores[m.categoria]!=undefined) contadores[m.categoria]++;});
    const total=modsSalvos.length;
    document.querySelectorAll(".interativo[data-cat]").forEach(a=>{
      const c=a.getAttribute("data-cat"); const num=c==="todos"?total:(contadores[c]||0); const texto=a.textContent.replace(/\(\d+\)/,"");
      if(a.closest('aside')) { a.textContent=texto.trim()+" ("+num+")"; }
    });
  }

  function renderMaisRecentes(limite = 3) {
    const container = document.getElementById("lista-recentes"); if (!container) return;
    if(!LOADED && modsSalvos.length === 0) { container.innerHTML = "<p style='font-size:0.9rem; color:var(--muted);'>Carregando...</p>"; return; }
    const modsOrdenados = [...modsSalvos].sort((a, b) => { const dateA_ms = new Date(a.timestamp || a.data || 0).getTime() || 0; const dateB_ms = new Date(b.timestamp || b.data || 0).getTime() || 0; return dateB_ms - dateA_ms; });
    const recentes = modsOrdenados.slice(0, limite);
    container.innerHTML = ""; if (recentes.length === 0) { container.innerHTML = "<p style='font-size:0.9rem; color:var(--muted);'>Nenhum mod recente.</p>"; return; }
    recentes.forEach(mod => {
          const item = document.createElement("div"); item.className = "recent-item"; const dataMod = formatarData(mod.timestamp || mod.data); 
          item.innerHTML = `<a href="#mod-${escaparHtml(mod.id)}"><img src="${escaparHtml(urlSegura(mod.img, 'https://placehold.co/400x200?text=Mod'))}" alt="${escaparHtml(mod.titulo)}"></a><p style="font-weight: 600; margin-bottom: 0.2rem; margin-top: 0.5rem;"><a href="#mod-${escaparHtml(mod.id)}" style="color: var(--text); text-decoration: none;">${escaparHtml(mod.titulo)}</a></p><p><strong>Lançamento:</strong> ${escaparHtml(dataMod)}</p>`; 
          item.querySelector('a').addEventListener("click", (e) => { e.preventDefault(); location.hash = "mod-" + mod.id; }); container.appendChild(item);
    });
  }

  function renderPopulares() {
    const container = document.getElementById("lista-populares"); if (!container) return;
    if(!LOADED && modsSalvos.length === 0) { container.innerHTML = "<li><span style='color:var(--muted);'>Carregando...</span></li>"; return; }
    const populares = modsSalvos.filter(m => m.destaque === true);
    populares.sort((a, b) => { return new Date(b.timestamp || b.data || 0).getTime() - new Date(a.timestamp || a.data || 0).getTime(); });
    container.innerHTML = ""; if (populares.length === 0) { container.innerHTML = "<li><span style='color:var(--muted);'>Nenhum destaque.</span></li>"; return; }
    populares.forEach(mod => {
       const li = document.createElement("li"); const a = document.createElement("a"); a.href = "#mod-" + mod.id; a.textContent = mod.titulo; 
       a.addEventListener("click", (e) => { e.preventDefault(); location.hash = "mod-" + mod.id; });
       li.appendChild(a); container.appendChild(li);
    });
  }

  function atualizarTitulo(cat){
    if(!cat || cat==="inicio" || cat==="") titulo.textContent="Últimas Postagens";
    else if(cat.startsWith("mod")) titulo.textContent="Detalhes do Mod";
    else titulo.textContent=nomesCategorias[cat]||"Mods";
  }

  function inicializar(){
    const hash=location.hash.replace("#",""); const query=searchInput.value.trim();
    if(hash.startsWith("mod-")){const id=hash.replace("mod-","");mostrarDetalhe(id);return;}
    atualizarTitulo(hash); renderMods(hash,query); atualizarContadores();
  }

  window.addEventListener("hashchange", () => { fadeOutIn(inicializar); });
  document.querySelectorAll("[data-cat]").forEach(link=>{ link.addEventListener("click",e=>{ e.preventDefault(); location.hash=e.target.getAttribute("data-cat"); }); });

  inicializar();
  const hash=location.hash.replace("#",""); if(hash.startsWith("mod-")){mostrarDetalhe(hash.replace("mod-",""));}
  renderMaisRecentes(); renderPopulares(); 

  function handleSearch(){ const hash=location.hash.replace("#",""); const query=searchInput.value.trim(); fadeOutIn(()=>renderMods(hash,query)); }
  searchBtn.addEventListener("click", handleSearch); searchInput.addEventListener("keyup", (e) => { if (e.key === "Enter") { handleSearch(); } });

  // SUPABASE INICIALIZAÇÃO E LISTENERS
  (function(){
    const { supabaseUrl, supabaseAnonKey: supabaseKey } = window.GuikaConfig;
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    window.supabaseGlobal = supabase;

    supabase.auth.getSession().then(({ data: { session } }) => { atualizarMenuUsuario(session); });
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.currentUser = null;
        const menuItem = document.getElementById('auth-menu-item');
        if (menuItem) menuItem.innerHTML = '<a href="#" data-action="abrirLogin">Entrar</a>';
        fecharPerfil();
        const hash = location.hash.replace('#','');
        if(hash.startsWith('mod-')) { carregarComentarios(hash.replace('mod-','')); }
      } else {
        atualizarMenuUsuario(session);
      }
    });

    function refreshUI(){ try{ limparSkeletons(); inicializar(); renderMaisRecentes(); renderPopulares(); }catch(erro){ console.error('Erro ao atualizar a interface de mods:', erro); } }
    GuikaModsService.iniciar({
      client: supabase,
      mods: modsSalvos,
      aoAtualizar: refreshUI,
      aoCarregar: () => { LOADED = true; refreshUI(); }
    });
  })();
});
