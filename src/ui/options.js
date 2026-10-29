const { lista, PLATAFORMAS, extrairPerfil, normalizarHandle, chave } = globalThis.Janonismo;
const $ = (id) => document.getElementById(id);

async function salvarConfig(parcial) {
  const config = await lista.obterConfig();
  await chrome.storage.local.set({ config: { ...config, ...parcial } });
}

function item(texto, sub, controle, desligado = false) {
  const li = document.createElement('li');
  if (desligado) li.className = 'desligado';
  const info = document.createElement('span');
  info.className = 'info';
  info.append(texto, ' ');
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = sub;
  info.append(tag);
  li.append(controle, info);
  return li;
}

function rotulo(k) {
  const [plataforma, handle] = k.split(':');
  return `@${handle} · ${PLATAFORMAS[plataforma]?.nome ?? plataforma}`;
}

async function renderGeral() {
  const config = await lista.obterConfig();
  $('ativo').checked = config.ativo;
  $('url-remota').value = config.urlRemota;

  const { remotaAtualizadaEm, remotaErro } = await chrome.storage.local.get(['remotaAtualizadaEm', 'remotaErro']);
  const partes = [];
  if (remotaAtualizadaEm) partes.push(`Última atualização: ${new Date(remotaAtualizadaEm).toLocaleString('pt-BR')}.`);
  if (remotaErro) partes.push(`Último erro: ${remotaErro}`);
  $('status-remota').textContent = partes.join(' ');
}

$('ativo').addEventListener('change', (e) => salvarConfig({ ativo: e.target.checked }));

$('salvar-url').addEventListener('click', async () => {
  const url = $('url-remota').value.trim();
  if (url) {
    let origem;
    try {
      origem = new URL(url);
      if (origem.protocol !== 'https:') throw new Error();
    } catch {
      $('status-remota').textContent = 'Use uma URL https válida.';
      return;
    }
    const ok = await chrome.permissions.request({ origins: [`${origem.origin}/*`] });
    if (!ok) {
      $('status-remota').textContent = 'Sem permissão para acessar esse endereço.';
      return;
    }
  }
  await salvarConfig({ urlRemota: url });
  if (!url) {
    await chrome.storage.local.remove(['listaRemota', 'remotaAtualizadaEm', 'remotaErro']);
    await lista.recalcular();
    renderTudo();
    return;
  }
  $('status-remota').textContent = 'Baixando…';
  const r = await chrome.runtime.sendMessage({ tipo: 'atualizarRemota' }).catch((e) => ({ ok: false, erro: e.message }));
  await renderTudo();
  if (r.ok) $('status-remota').textContent = `Lista remota carregada: ${r.total} perfis.`;
});

for (const [id, p] of Object.entries(PLATAFORMAS)) {
  $('nova-plataforma').append(new Option(p.nome, id));
}

$('novo-handle').addEventListener('input', (e) => {
  const perfil = extrairPerfil(e.target.value.trim());
  if (perfil) $('nova-plataforma').value = perfil.plataforma;
});

$('adicionar').addEventListener('click', async () => {
  const entrada = $('novo-handle').value.trim();
  const perfil = extrairPerfil(entrada) || { plataforma: $('nova-plataforma').value, handle: normalizarHandle(entrada) };
  $('erro-adicionar').textContent = '';
  if (!perfil.handle || /[/\s]/.test(perfil.handle)) {
    $('erro-adicionar').textContent = 'Não reconheci esse perfil. Cole a URL do perfil ou só o @usuario.';
    return;
  }
  const nome = $('novo-nome').value.trim() || perfil.handle;
  const k = chave(perfil.plataforma, perfil.handle);
  const { extras = [], removidos = [] } = await chrome.storage.local.get(['extras', 'removidos']);
  if (!extras.some((e) => chave(e.plataforma, e.handle) === k)) extras.push({ ...perfil, nome });
  await chrome.storage.local.set({ extras, removidos: removidos.filter((r) => r !== k) });
  await lista.recalcular();
  $('novo-handle').value = '';
  $('novo-nome').value = '';
  renderTudo();
});

async function renderExtras() {
  const { extras = [] } = await chrome.storage.local.get('extras');
  const ul = $('extras');
  ul.replaceChildren();
  $('extras-vazio').hidden = extras.length > 0;
  for (const e of extras) {
    const k = chave(e.plataforma, e.handle);
    const remover = document.createElement('button');
    remover.className = 'secundario';
    remover.textContent = 'Remover';
    remover.addEventListener('click', async () => {
      const { extras: atuais = [] } = await chrome.storage.local.get('extras');
      await chrome.storage.local.set({ extras: atuais.filter((x) => chave(x.plataforma, x.handle) !== k) });
      await lista.recalcular();
      renderTudo();
    });
    ul.append(item(e.nome, rotulo(k), remover));
  }
}

async function renderBase() {
  const base = await lista.indiceBase();
  const { removidos = [] } = await chrome.storage.local.get('removidos');
  const filtro = $('filtro').value.trim().toLowerCase().replace(/^@/, '');
  const ul = $('base');
  ul.replaceChildren();

  const chaves = Object.keys(base).sort((a, b) => base[a].nome.localeCompare(base[b].nome, 'pt-BR'));
  for (const k of chaves) {
    if (filtro && !`${base[k].nome} ${k}`.toLowerCase().includes(filtro)) continue;
    const desligado = removidos.includes(k);
    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    caixa.checked = !desligado;
    caixa.setAttribute('aria-label', `Alertar sobre ${base[k].nome} (${rotulo(k)})`);
    caixa.addEventListener('change', async () => {
      const { removidos: atuais = [] } = await chrome.storage.local.get('removidos');
      const novos = caixa.checked ? atuais.filter((r) => r !== k) : [...new Set([...atuais, k])];
      await chrome.storage.local.set({ removidos: novos });
      await lista.recalcular();
      caixa.closest('li').classList.toggle('desligado', !caixa.checked);
    });
    const origem = base[k].origem === 'remota' ? ' · remota' : '';
    ul.append(item(base[k].nome, rotulo(k) + origem, caixa, desligado));
  }
}

$('filtro').addEventListener('input', renderBase);

function renderTudo() {
  return Promise.all([renderGeral(), renderExtras(), renderBase()]);
}

renderTudo();
