(function () {
  const { extrairPerfil, chave, overlay, PLATAFORMAS } = globalThis.Janonismo;

  let indice = {};
  let config = { ativo: true };
  let ultimaUrl = null;
  let alertaAtual = null;

  function avaliar() {
    const perfil = extrairPerfil(location.href);
    const k = perfil && chave(perfil.plataforma, perfil.handle);
    const bloquear = config.ativo && k && indice[k];

    if (!bloquear) {
      alertaAtual = null;
      overlay.esconder();
      return;
    }
    if (alertaAtual === k && overlay.visivel()) return;

    alertaAtual = k;
    overlay.mostrar({
      nome: indice[k].nome,
      handle: perfil.handle,
      plataforma: perfil.plataforma,
      onVoltar: () => voltar(perfil.plataforma),
    });
    chrome.runtime.sendMessage({ tipo: 'contar' }).catch(() => {});
  }

  function voltar(plataforma) {
    const urlAntes = location.href;
    if (history.length > 1) history.back();
    setTimeout(() => {
      if (location.href === urlAntes) location.href = PLATAFORMAS[plataforma].home;
    }, 400);
  }

  function verificarUrl() {
    if (location.href === ultimaUrl) return;
    ultimaUrl = location.href;
    avaliar();
  }

  chrome.storage.local.get(['indice', 'config']).then((dados) => {
    indice = dados.indice || {};
    config = { ...config, ...dados.config };
    verificarUrl();
    setInterval(verificarUrl, 500);
    addEventListener('popstate', verificarUrl);
  });

  chrome.storage.onChanged.addListener((mudancas, area) => {
    if (area !== 'local') return;
    if (mudancas.indice) indice = mudancas.indice.newValue || {};
    if (mudancas.config) config = { ...config, ...mudancas.config.newValue };
    if (mudancas.indice || mudancas.config) avaliar();
  });
})();
