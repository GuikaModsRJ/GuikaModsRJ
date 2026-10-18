(function configurarSanitizadores(global) {
  'use strict';

  function escaparHtml(valor) {
    return String(valor ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function urlSegura(valor, fallback = '#') {
    const url = String(valor ?? '').trim();
    if (!url) return fallback;
    if (/^(?:https?:|blob:)/i.test(url)) return url;
    if (/^(?:\.?\.?\/|#)/.test(url)) return url;
    return fallback;
  }

  global.GuikaUtils = Object.freeze({ escaparHtml, urlSegura });
})(window);
