const { lista } = globalThis.Janonismo;
const $ = (id) => document.getElementById(id);

const manifest = chrome.runtime.getManifest();
const origens = [...manifest.content_scripts.flatMap((cs) => cs.matches), ...manifest.host_permissions];

async function render() {
  const config = await lista.obterConfig();
  const { contador = 0, indice = {} } = await chrome.storage.local.get(['contador', 'indice']);
  $('ativo').checked = config.ativo;
  $('contador').textContent = contador.toLocaleString('pt-BR');
  $('total').textContent = `${Object.keys(indice).length} perfis na lista.`;
  $('atualizar').hidden = !config.urlRemota;

  const temPermissao = await chrome.permissions.contains({ origins: origens });
  $('aviso-permissao').style.display = temPermissao ? 'none' : 'flex';
}

$('ativo').addEventListener('change', async (e) => {
  const config = await lista.obterConfig();
  await chrome.storage.local.set({ config: { ...config, ativo: e.target.checked } });
});

$('atualizar').addEventListener('click', async () => {
  $('atualizar').disabled = true;
  $('status').textContent = 'Baixando…';
  const r = await lista.atualizarRemota();
  $('status').textContent = r.ok ? `Lista atualizada (${r.total} perfis remotos).` : `Falhou: ${r.erro}`;
  $('atualizar').disabled = false;
  render();
});

$('opcoes').addEventListener('click', () => chrome.runtime.openOptionsPage());

$('conceder').addEventListener('click', async () => {
  await chrome.permissions.request({ origins: origens });
  render();
});

render();
