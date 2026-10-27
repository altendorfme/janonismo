(function (root) {
  const ns = (root.Janonismo = root.Janonismo || {});

  const URL_REMOTA_PADRAO = 'https://janonismo.vercel.app/lista.json';

  const CONFIG_PADRAO = { ativo: true, urlRemota: URL_REMOTA_PADRAO };

  function listaValida(json) {
    return !!json && Array.isArray(json.perfis);
  }

  function indexar(lista, origem, indice) {
    for (const perfil of lista.perfis) {
      for (const plataforma of Object.keys(ns.PLATAFORMAS)) {
        for (const handle of [].concat(perfil[plataforma] || [])) {
          const k = ns.chave(plataforma, handle);
          if (!k.endsWith(':') && !indice[k]) indice[k] = { nome: perfil.nome || handle, origem };
        }
      }
    }
  }

  async function carregarEmbutida() {
    const resp = await fetch(chrome.runtime.getURL('data/lista.json'));
    return resp.json();
  }

  async function obterConfig() {
    const { config } = await chrome.storage.local.get('config');
    return { ...CONFIG_PADRAO, ...config };
  }

  async function indiceBase() {
    const embutida = await carregarEmbutida();
    const { listaRemota } = await chrome.storage.local.get('listaRemota');
    const indice = {};
    indexar(embutida, 'embutida', indice);
    if (listaValida(listaRemota)) indexar(listaRemota, 'remota', indice);
    return indice;
  }

  async function recalcular() {
    const indice = await indiceBase();
    const { extras = [], removidos = [] } = await chrome.storage.local.get(['extras', 'removidos']);
    for (const e of extras) indice[ns.chave(e.plataforma, e.handle)] = { nome: e.nome || e.handle, origem: 'usuario' };
    for (const k of removidos) delete indice[k];

    await chrome.storage.local.set({ indice });
    return indice;
  }

  async function atualizarRemota() {
    const { urlRemota } = await obterConfig();
    if (!urlRemota) return { ok: false, erro: 'Nenhuma URL remota configurada.' };
    try {
      const resp = await fetch(urlRemota, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!listaValida(json)) throw new Error('Formato inválido: falta o array "perfis".');
      await chrome.storage.local.set({ listaRemota: json, remotaAtualizadaEm: Date.now(), remotaErro: null });
      await recalcular();
      return { ok: true, total: json.perfis.length };
    } catch (e) {
      await chrome.storage.local.set({ remotaErro: e.message });
      return { ok: false, erro: e.message };
    }
  }

  ns.lista = { CONFIG_PADRAO, obterConfig, indiceBase, recalcular, atualizarRemota, listaValida };
})(globalThis);
