(function (root) {
  const ns = (root.Janonismo = root.Janonismo || {});

  /** Origens de que a extensão precisa: os sites das redes (content scripts) e a lista remota. */
  function origensNecessarias(manifest = chrome.runtime.getManifest()) {
    return [...new Set([...manifest.content_scripts.flatMap((cs) => cs.matches), ...(manifest.host_permissions ?? [])])];
  }

  // No Chrome, permissions.contains() responde false para os sites dos content scripts mesmo quando a
  // extensão já roda neles: eles só aparecem em permissions.getAll(). No Firefox, getAll() só traz o que o
  // usuário liberou. Por isso a conta é feita sobre o getAll(), e o contains() fica de reserva para quando a
  // permissão foi dada por um padrão mais amplo (ex.: https://*/*).
  async function faltamPermissoes(origens = origensNecessarias()) {
    const { origins = [] } = await chrome.permissions.getAll();
    const faltando = origens.filter((o) => !origins.includes(o));
    if (!faltando.length) return [];
    return (await chrome.permissions.contains({ origins: faltando })) ? [] : faltando;
  }

  ns.permissoes = { origensNecessarias, faltamPermissoes };
})(globalThis);
