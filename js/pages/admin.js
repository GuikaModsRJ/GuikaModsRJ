  const { supabaseUrl, supabaseAnonKey: supabaseKey } = window.GuikaConfig;
  const _supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: { storageKey: "guika_admin_session" }
  });

  // Variáveis de Autenticação
  const loginDiv = document.getElementById("login");
  const adminDiv = document.getElementById("admin");
  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");
  const erroMsg = document.getElementById("erro");
  const btnEntrar = document.getElementById("btnEntrar");
  const btnSair = document.getElementById("btnSair");

  // --- SISTEMA DE LOGIN SEGURO ---
  let tentativas = 0;
  let bloqueadoAte = 0;

  btnEntrar.addEventListener("click", async () => {
    const agora = Date.now();
    if (agora < bloqueadoAte) {
      const seg = Math.ceil((bloqueadoAte - agora) / 1000);
      erroMsg.innerText = "Muitas tentativas. Aguarde " + seg + " segundos.";
      erroMsg.style.display = "block";
      return;
    }

    btnEntrar.textContent = "Acessando...";
    btnEntrar.disabled = true;

    const { data, error } = await _supabase.auth.signInWithPassword({
      email: emailInput.value,
      password: senhaInput.value,
    });

    if (error) {
      tentativas++;
      if (tentativas >= 5) {
        bloqueadoAte = Date.now() + 2 * 60 * 1000;
        tentativas = 0;
        erroMsg.innerText = "Muitas tentativas incorretas. Aguarde 2 minutos.";
      } else {
        erroMsg.innerText = "Credenciais inválidas. Tentativa " + tentativas + " de 5.";
      }
      erroMsg.style.display = "block";
      btnEntrar.textContent = "Acessar Painel";
      btnEntrar.disabled = false;
    } else {
      tentativas = 0;
      location.reload();
    }
  });

  // Enter para logar
  senhaInput.addEventListener("keydown", (e) => { if (e.key === "Enter") btnEntrar.click(); });
  emailInput.addEventListener("keydown", (e) => { if (e.key === "Enter") btnEntrar.click(); });

  // Botão de Sair
  btnSair.addEventListener("click", async () => {
      await _supabase.auth.signOut();
      location.reload();
  });

  // Verifica se o usuário já tem uma sessão ativa ao abrir a página
  // Emails hasheados (btoa) para não ficarem expostos em texto puro no código
  const ADMIN_HASHES = [
    btoa('guikamodsrj@gmail.com'),
    btoa('mutanoyt18@gmail.com')
  ];
  function isAdmin(email) {
    return ADMIN_HASHES.includes(btoa(email));
  }

  // Rate limiting no login: máx 5 tentativas em 5 minutos
  function verificarRateLimitLogin() {
    const LIMITE = 5;
    const JANELA_MS = 5 * 60 * 1000;
    const agora = Date.now();
    let historico = JSON.parse(GuikaStorage.session.getItem('admin_login_tentativas') || '[]');
    historico = historico.filter(t => agora - t < JANELA_MS);
    if (historico.length >= LIMITE) {
      const espera = Math.ceil((historico[0] + JANELA_MS - agora) / 60000);
      return `Muitas tentativas. Aguarde ${espera} minuto(s).`;
    }
    historico.push(agora);
    GuikaStorage.session.setItem('admin_login_tentativas', JSON.stringify(historico));
    return null;
  }

  async function checkUser() {
      const { data: { user } } = await _supabase.auth.getUser();
      if (user && isAdmin(user.email)) {
          loginDiv.style.display = "none";
          adminDiv.style.display = "block";
          const label = document.getElementById("adminEmailLabel");
          if(label) label.textContent = "Logado como: " + user.email;
          carregarMods();
          carregarMensagens();
      } else {
          if (user) {
              // Logado mas não é admin — faz logout e mostra erro
              await _supabase.auth.signOut();
              erroMsg.innerText = "Acesso negado. Você não tem permissão de administrador.";
              erroMsg.style.display = "block";
          }
          loginDiv.style.display = "block";
          adminDiv.style.display = "none";
      }
  }

  // --- LÓGICA DO PAINEL ADMIN COMPLETA ---
  const form = document.getElementById("modForm");
  const listaMods = document.getElementById("listaMods");
  const paginacaoControls = document.getElementById("paginacaoControls");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const pageInfo = document.getElementById("pageInfo");
  const searchInput = document.getElementById("searchTable");

  const inputs = {
    titulo: document.getElementById("titulo"), tituloTopo: document.getElementById("tituloTopo"),
    img: document.getElementById("img"), imgUpload: document.getElementById("imgUpload"),
    downloadMediafire: document.getElementById("downloadMediafire"), downloadMega: document.getElementById("downloadMega"),
    downloadDrive: document.getElementById("downloadDrive"), descricao: document.getElementById("descricao"),
    data: document.getElementById("data"), categoria: document.getElementById("categoria"), destaque: document.getElementById("destaque")
  };

  const imgPreview = document.getElementById("imgPreview");
  let allMods = []; let filteredMods = []; let currentPage = 1; const itemsPerPage = 8; let editingId = null;

  const submitBtn = form.querySelector('button[type="submit"]');
  const cancelBtn = document.createElement('button');
  cancelBtn.type = "button"; cancelBtn.textContent = "Cancelar edição"; cancelBtn.className = "btn-cancel"; cancelBtn.style.display = "none"; cancelBtn.style.marginTop = "0.5rem";
  cancelBtn.addEventListener("click", cancelarEdicao);
  form.insertBefore(cancelBtn, submitBtn.nextSibling); 

  function preencherDataHoje() {
    const h = new Date();
    inputs.data.value = h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0')+'-'+String(h.getDate()).padStart(2,'0');
  }
  function cancelarEdicao() {
    editingId = null; form.reset(); imgPreview.innerHTML = ""; inputs.destaque.checked = false; submitBtn.textContent = "Adicionar Mod"; cancelBtn.style.display = "none";
    preencherDataHoje();
  }

  inputs.img.addEventListener("input", () => {
    const url = inputs.img.value.trim(); imgPreview.innerHTML = url ? `<img src="${url}" alt="Preview">` : "";
  });

  inputs.imgUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) { imgPreview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Preview">`; inputs.img.value = ""; }
  });

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    filteredMods = allMods.filter(([id, mod]) => { return (mod.titulo || "").toLowerCase().includes(term) || (mod.categoria || "").toLowerCase().includes(term); });
    currentPage = 1; renderTable();
  });

  async function fazerUploadImagem(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error: uploadError } = await _supabase.storage.from('imagens_mods').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = _supabase.storage.from('imagens_mods').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function carregarMods() {
    const { data, error } = await _supabase.from('mods').select('*').order('data', { ascending: false });
    if (error || !data || data.length === 0) { listaMods.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:2rem; color:var(--muted);'>Nenhum mod encontrado.</td></tr>"; paginacaoControls.style.display = "none"; return; }
    allMods = data.map(mod => [mod.id, mod]); filteredMods = [...allMods]; currentPage = 1; renderTable();
  }

  function renderTable() {
    listaMods.innerHTML = ""; const totalPages = Math.ceil(filteredMods.length / itemsPerPage);
    if (filteredMods.length === 0) { listaMods.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:2rem; color:var(--muted);'>Nenhum mod encontrado.</td></tr>"; paginacaoControls.style.display = "none"; return; }
    const start = (currentPage - 1) * itemsPerPage; const pageItems = filteredMods.slice(start, start + itemsPerPage);
    pageItems.forEach(([id, mod]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong style="color:#fff;">${mod.destaque ? "⭐ " : ""}${mod.titulo || "Sem título"}</strong></td>
          <td><span style="background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px; font-size:0.8rem;">${mod.categoria || "?"}</span></td>
          <td style="color:var(--muted); font-size:0.85rem;">${mod.data || "--"}</td>
          <td style="text-align: center; color: #fff; font-weight: 600;">${mod.views || 0}</td>
          <td style="text-align: center; color: #ef4444; font-weight: 600;">${mod.likes || 0}</td>
          <td style="text-align: right;">
            <button class="btn-edit" onclick="editarMod('${id}')">Editar</button>
            <button class="btn-delete" onclick="excluirMod('${id}')">Excluir</button>
          </td>`;
        listaMods.appendChild(tr);
    });
    if (totalPages > 1) { paginacaoControls.style.display = "flex"; pageInfo.textContent = `Página ${currentPage} de ${totalPages}`; btnPrev.disabled = currentPage === 1; btnNext.disabled = currentPage === totalPages; } else { paginacaoControls.style.display = "none"; }
  }

  btnPrev.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  btnNext.addEventListener("click", () => { const totalPages = Math.ceil(filteredMods.length / itemsPerPage); if (currentPage < totalPages) { currentPage++; renderTable(); } });

  window.excluirMod = async function(id) {
    if(confirm("Tem certeza que deseja excluir este mod?")) {
        const { error } = await _supabase.from('mods').delete().eq('id', id);
        if(!error) carregarMods(); else alert("Erro ao excluir: " + error.message);
    }
  };

  window.editarMod = function(id) {
    const item = allMods.find(m => m[0] === id); if (!item) return; const m = item[1];
    inputs.titulo.value = m.titulo || ""; inputs.tituloTopo.value = m.tituloTopo || ""; inputs.img.value = m.img || ""; inputs.imgUpload.value = ""; 
    imgPreview.innerHTML = m.img ? `<img src="${m.img}" alt="Preview">` : "";
    inputs.downloadMediafire.value = m.downloadMediafire || ""; inputs.downloadMega.value = m.downloadMega || ""; inputs.downloadDrive.value = m.downloadDrive || "";
    inputs.descricao.value = m.descricao || ""; inputs.data.value = m.data || ""; inputs.categoria.value = m.categoria || ""; inputs.destaque.checked = m.destaque === true;
    editingId = id; submitBtn.textContent = "Salvar Alterações"; cancelBtn.style.display = "block"; document.querySelector('.admin-container').scrollIntoView({ behavior: 'smooth' });
  };

  form.addEventListener("submit", async e => {
    e.preventDefault(); submitBtn.textContent = "Salvando...";
    try {
        let finalImageUrl = inputs.img.value; const file = inputs.imgUpload.files[0];
        if (file) finalImageUrl = await fazerUploadImagem(file);
        if (!finalImageUrl) throw new Error("Você deve informar uma URL de imagem ou fazer upload.");

        const dados = { titulo: inputs.titulo.value, tituloTopo: inputs.tituloTopo.value, img: finalImageUrl, descricao: inputs.descricao.value, data: inputs.data.value, categoria: inputs.categoria.value, downloadMediafire: inputs.downloadMediafire.value, downloadMega: inputs.downloadMega.value, downloadDrive: inputs.downloadDrive.value, destaque: inputs.destaque.checked === true };

        if (editingId) {
          const { error } = await _supabase.from('mods').update(dados).eq('id', editingId);
          if (!error) { alert("✅ Mod atualizado!"); cancelarEdicao(); carregarMods(); } else throw error;
        } else {
          dados.id = crypto.randomUUID();
          dados.views = 0;
          dados.likes = 0; 
          const { error } = await _supabase.from('mods').insert([dados]);
          if (!error) { alert("✅ Mod adicionado!"); cancelarEdicao(); carregarMods(); } else throw error;
        }
    } catch (err) { alert("Erro: " + err.message); submitBtn.textContent = editingId ? "Salvar Alterações" : "Adicionar Mod"; }
  });

  // Dispara a verificação ao abrir a página
  preencherDataHoje();
  checkUser();

  // ============================================================
  // SISTEMA DE MENSAGENS DE CONTATO
  // ============================================================
  let todasMensagens = [];
  let filtroAtual = 'todas';

  async function carregarMensagens() {
    const { data, error } = await _supabase
      .from('mensagens_contato')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { console.error('Erro ao carregar mensagens:', error); return; }

    todasMensagens = data || [];
    atualizarBadge();
    renderMensagens();
  }

  function atualizarBadge() {
    const naoLidas = todasMensagens.filter(m => !m.lida).length;
    const badge = document.getElementById('badge-nao-lidas');
    if (naoLidas > 0) {
      badge.textContent = naoLidas > 99 ? '99+' : naoLidas;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  window.filtrarMsgs = function(filtro, btn) {
    filtroAtual = filtro;
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMensagens();
  };

  function renderMensagens() {
    const container = document.getElementById('lista-mensagens');
    const vazio = document.getElementById('msgs-vazio');

    let lista = todasMensagens;
    if (filtroAtual === 'nao_lidas')   lista = lista.filter(m => !m.lida);
    if (filtroAtual === 'aguardando')  lista = lista.filter(m => m.lida && !m.resposta);
    if (filtroAtual === 'respondidas') lista = lista.filter(m => !!m.resposta);

    if (lista.length === 0) {
      container.innerHTML = '';
      vazio.style.display = 'block';
      return;
    }
    vazio.style.display = 'none';

    container.innerHTML = lista.map(msg => {
      const data = new Date(msg.created_at).toLocaleString('pt-BR');
      const tagHtml = msg.resposta
        ? '<span class="tag tag-respondida">✅ Respondida</span>'
        : msg.lida
          ? '<span class="tag tag-lida">👁 Lida</span>'
          : '<span class="tag tag-nova">🔴 Nova</span>';

      const emailHtml = msg.email
        ? `<span class="msg-email">📧 ${msg.email}</span>` : '';

      const respostaHtml = msg.resposta ? `
        <div class="msg-resposta-box">
          <div class="resp-label">👑 Resposta do Admin</div>
          <p>${msg.resposta.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
        </div>` : '';

      return `
      <div class="msg-card ${!msg.lida ? 'nao-lida' : ''} ${msg.resposta ? 'respondida' : ''}" id="msg-${msg.id}">
        <div class="msg-header">
          <div class="msg-meta">
            <span class="msg-autor">👤 ${(msg.user_name||'Visitante').replace(/</g,'&lt;')}</span>
            <span class="msg-assunto">📌 ${(msg.assunto||'Sem assunto').replace(/</g,'&lt;')}</span>
            ${emailHtml}
            <span class="msg-data">${data}</span>
          </div>
          <div class="msg-tags">${tagHtml}</div>
        </div>
        <div class="msg-texto">${(msg.mensagem||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        ${respostaHtml}
        <div class="msg-actions">
          ${!msg.lida ? `<button class="btn-marcar-lida" onclick="marcarLida('${msg.id}')">✔ Marcar como lida</button>` : ''}
          ${!msg.resposta ? `<button class="btn-responder" onclick="abrirResposta('${msg.id}')">💬 Responder</button>` : `<button class="btn-responder" onclick="abrirResposta('${msg.id}')">✏️ Editar resposta</button>`}
          <button class="btn-excluir-msg" onclick="excluirMensagem('${msg.id}')">🗑 Excluir</button>
        </div>
        <div class="reply-area" id="reply-${msg.id}">
          <textarea id="reply-text-${msg.id}" placeholder="Digite sua resposta...">${msg.resposta || ''}</textarea>
          <div class="reply-area-btns">
            <button class="btn-cancelar-reply" onclick="fecharResposta('${msg.id}')">Cancelar</button>
            <button class="btn-enviar-reply" onclick="enviarResposta('${msg.id}')">Enviar Resposta</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  window.abrirResposta = function(id) {
    const area = document.getElementById('reply-' + id);
    if (area) { area.style.display = 'block'; area.querySelector('textarea').focus(); }
  };

  window.fecharResposta = function(id) {
    const area = document.getElementById('reply-' + id);
    if (area) area.style.display = 'none';
  };

  window.marcarLida = async function(id) {
    const { error } = await _supabase
      .from('mensagens_contato').update({ lida: true }).eq('id', id);
    if (!error) carregarMensagens();
    else alert('Erro: ' + error.message);
  };

  window.enviarResposta = async function(id) {
    const texto = document.getElementById('reply-text-' + id)?.value.trim();
    if (!texto) { alert('Escreva uma resposta antes de enviar.'); return; }
    const { error } = await _supabase
      .from('mensagens_contato')
      .update({ resposta: texto, lida: true })
      .eq('id', id);
    if (!error) { carregarMensagens(); }
    else alert('Erro ao salvar resposta: ' + error.message);
  };

  window.excluirMensagem = async function(id) {
    if (!confirm('Tem certeza que quer excluir esta mensagem?')) return;
    const { error } = await _supabase
      .from('mensagens_contato').delete().eq('id', id);
    if (!error) carregarMensagens();
    else alert('Erro ao excluir: ' + error.message);
  };
