  // Hambúrguer mobile
  (function() {
    const btn = document.getElementById('hamburger-btn');
    const nav = document.getElementById('nav-contato');
    if (!btn || !nav) return;
    btn.addEventListener('click', function() {
      const open = nav.classList.toggle('open');
      btn.classList.toggle('open', open);
    });
  })();

  const { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_KEY } = window.GuikaConfig;
  const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentUser = null;

  function extrairUsername(user) {
    if (!user) return null;
    let name = user.user_metadata?.username
      || user.user_metadata?.preferred_username
      || user.user_metadata?.full_name
      || user.user_metadata?.name
      || (user.email && !user.email.includes('@guikamods.internal') ? user.email.split('@')[0] : null)
      || user.email?.replace('@guikamods.internal', '')
      || 'Usuário';
    if (name && name.includes(' ')) name = name.split(' ')[0];
    return name;
  }

  async function inicializar() {
    const { data: { session } } = await _supabase.auth.getSession();
    const user = session?.user || null;

    if (user) {
      currentUser = user;
      currentUser.username = extrairUsername(user);

      // Preenche e trava campo nome
      const campoNome = document.getElementById('campo-nome');
      campoNome.value = currentUser.username;
      campoNome.setAttribute('readonly', true);
      document.getElementById('nome-hint').style.display = 'flex';

      document.getElementById('badge-username').textContent = currentUser.username;
      document.getElementById('user-badge-area').style.display = 'block';
      document.getElementById('login-prompt-area').style.display = 'none';
    } else {
      document.getElementById('user-badge-area').style.display = 'none';
      document.getElementById('login-prompt-area').style.display = 'block';
    }
  }

  // Rate limiting: máximo 3 envios por 10 minutos
  function verificarRateLimit() {
    const LIMITE = 3;
    const JANELA_MS = 10 * 60 * 1000; // 10 minutos
    const agora = Date.now();
    let historico = JSON.parse(GuikaStorage.local.getItem('contato_envios') || '[]');
    historico = historico.filter(t => agora - t < JANELA_MS);
    if (historico.length >= LIMITE) {
      const proxTentativa = Math.ceil((historico[0] + JANELA_MS - agora) / 60000);
      return `Muitas mensagens enviadas. Aguarde ${proxTentativa} minuto(s) antes de tentar novamente.`;
    }
    historico.push(agora);
    GuikaStorage.local.setItem('contato_envios', JSON.stringify(historico));
    return null;
  }

  window.enviarContato = async function() {
    const nome     = document.getElementById('campo-nome').value.trim();
    const email    = document.getElementById('campo-email').value.trim();
    const assunto  = document.getElementById('campo-assunto').value.trim();
    const mensagem = document.getElementById('campo-mensagem').value.trim();
    const feedback = document.getElementById('form-feedback');
    const btn      = document.getElementById('btn-enviar');

    feedback.style.display = 'none';
    feedback.className = '';

    if (!nome)     { mostrarErro('Por favor, preencha seu nome.'); return; }
    if (!assunto)  { mostrarErro('Por favor, informe o assunto.'); return; }
    if (!mensagem) { mostrarErro('Por favor, escreva sua mensagem.'); return; }

    // Verificar rate limit antes de enviar
    const rateLimitMsg = verificarRateLimit();
    if (rateLimitMsg) { mostrarErro(rateLimitMsg); return; }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const { error } = await _supabase.from('mensagens_contato').insert([{
        user_id:   currentUser ? currentUser.id : null,
        user_name: nome,
        email:     email || null,
        assunto:   assunto,
        mensagem:  mensagem,
        lida:      false,
        resposta:  null
      }]);

      if (error) throw error;

      feedback.className = 'success';
      feedback.textContent = '✅ Mensagem enviada! Responderemos em breve.';
      feedback.style.display = 'block';

      // Limpa campos livres
      if (!currentUser) document.getElementById('campo-nome').value = '';
      document.getElementById('campo-email').value = '';
      document.getElementById('campo-assunto').value = '';
      document.getElementById('campo-mensagem').value = '';

      btn.textContent = 'Enviado!';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Enviar Mensagem'; }, 4000);

    } catch (err) {
      mostrarErro('Erro ao enviar: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Enviar Mensagem';
    }
  };

  function mostrarErro(msg) {
    const feedback = document.getElementById('form-feedback');
    feedback.className = 'error';
    feedback.textContent = '⚠️ ' + msg;
    feedback.style.display = 'block';
  }

  inicializar();
