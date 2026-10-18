  // Hambúrguer mobile
  (function() {
    const btn = document.getElementById('hamburger-btn');
    const menu = document.getElementById('nav-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function() {
      const open = menu.classList.toggle('open');
      btn.classList.toggle('open', open);
    });
  })();

  // --- ADICIONE SEUS VÍDEOS AQUI ---
  const meusVideos = [
    {
      titulo: "Como Instalar Mods no GTA SA",
      id: "M7lc1UVf-VE", 
      descricao: "Aprenda o passo a passo para colocar mods sem erros."
    },
    {
      titulo: "Tutorial ZModeler: Criando Peças",
      id: "dQw4w9WgXcQ", 
      descricao: "Introdução básica à modelagem 3D para iniciantes."
    }
  ];

  const container = document.getElementById('grade-videos');
  
  if(meusVideos.length === 0){
      container.innerHTML = "<p style='text-align:center; color:#666;'>Em breve...</p>";
  }

  meusVideos.forEach(video => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
      <div class="video-wrapper">
        <iframe src="https://www.youtube.com/embed/${video.id}" title="${video.titulo}" allowfullscreen></iframe>
      </div>
      <div class="card-content">
        <h3>${video.titulo}</h3>
        <p>${video.descricao}</p>
      </div>
    `;
    container.appendChild(card);
  });
