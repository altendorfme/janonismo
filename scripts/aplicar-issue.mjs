import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const ARQUIVO_LISTA = join(RAIZ, 'src', 'data', 'lista.json');

await import('../src/shared/plataformas.js');
const { PLATAFORMAS, extrairPerfil, normalizarHandle, chave } = globalThis.Janonismo;

const CAMPO_NOME = 'Nome';

export function lerCampos(corpo) {
  const campos = {};
  const partes = String(corpo || '').replace(/\r\n/g, '\n').split(/^###\s+/m).slice(1);
  for (const parte of partes) {
    const quebra = parte.indexOf('\n');
    const titulo = (quebra === -1 ? parte : parte.slice(0, quebra)).trim();
    const valor = (quebra === -1 ? '' : parte.slice(quebra + 1)).trim();
    campos[titulo] = valor === '_No response_' ? '' : valor;
  }
  return campos;
}

export function interpretarHandle(plataforma, bruto) {
  const texto = bruto.trim();
  if (/^https?:\/\//i.test(texto)) {
    const perfil = extrairPerfil(texto);
    if (!perfil) {
      // Links curtos de compartilhamento (facebook.com/share/…) só viram perfil depois de abertos.
      const dica = /\/share\//i.test(texto) ? ' Parece um link de compartilhamento: abra ele e cole o endereço do perfil.' : '';
      throw new Error(`não reconheci a URL \`${texto}\` como perfil.${dica}`);
    }
    if (perfil.plataforma !== plataforma) {
      throw new Error(`a URL \`${texto}\` é do ${PLATAFORMAS[perfil.plataforma].nome}, não do ${PLATAFORMAS[plataforma].nome}.`);
    }
    return perfil.handle;
  }
  const handle = normalizarHandle(texto);
  const regras = PLATAFORMAS[plataforma];
  if (!handle || /[\s/?#]/.test(handle)) throw new Error(`\`${texto}\` não é um usuário válido no ${regras.nome}.`);
  if (regras.valido && !regras.valido.test(handle)) throw new Error(`\`${texto}\` não é um usuário válido no ${regras.nome}.`);
  if (regras.reservadas?.includes(handle)) throw new Error(`\`${texto}\` é uma página do ${regras.nome}, não um perfil.`);
  return handle;
}

export function extrairPedido(corpo) {
  const campos = lerCampos(corpo);
  const nome = (campos[CAMPO_NOME] || '').split('\n')[0].trim();
  if (!nome) throw new Error('o campo **Nome** está vazio.');
  if (nome.length > 80) throw new Error('o campo **Nome** passou de 80 caracteres.');

  const handles = {};
  const erros = [];
  for (const [id, regras] of Object.entries(PLATAFORMAS)) {
    const valor = campos[regras.nome];
    if (!valor) continue;
    for (const item of valor.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)) {
      try {
        const handle = interpretarHandle(id, item);
        (handles[id] ??= []).includes(handle) || handles[id].push(handle);
      } catch (e) {
        erros.push(`**${regras.nome}**: ${e.message}`);
      }
    }
  }
  if (erros.length) throw new Error(erros.join('\n- '));
  if (!Object.keys(handles).length) throw new Error('nenhuma rede social foi preenchida.');
  return { nome, handles };
}

export function aplicar(lista, { nome, handles }, hoje) {
  const existentes = new Map();
  for (const perfil of lista.perfis) {
    for (const id of Object.keys(PLATAFORMAS)) {
      for (const h of [].concat(perfil[id] || [])) existentes.set(chave(id, h), perfil.nome);
    }
  }

  const alvo =
    lista.perfis.find((p) => p.nome.localeCompare(nome, 'pt-BR', { sensitivity: 'base' }) === 0) ??
    lista.perfis[lista.perfis.push({ nome }) - 1];

  const adicionados = [];
  const ignorados = [];
  for (const [id, itens] of Object.entries(handles)) {
    for (const handle of itens) {
      const k = chave(id, handle);
      if (existentes.has(k)) {
        ignorados.push(`@${handle} no ${PLATAFORMAS[id].nome} (já está na lista como ${existentes.get(k)})`);
        continue;
      }
      (alvo[id] ??= []).push(handle);
      existentes.set(k, alvo.nome);
      adicionados.push(`@${handle} no ${PLATAFORMAS[id].nome}`);
    }
  }

  if (!Object.keys(alvo).some((k) => k !== 'nome')) lista.perfis.splice(lista.perfis.indexOf(alvo), 1);
  if (adicionados.length) {
    lista.versao = (Number(lista.versao) || 0) + 1;
    lista.atualizado = hoje;
  }
  return { nomeFinal: alvo.nome, adicionados, ignorados };
}

export function serializar(lista) {
  const ordem = ['nome', ...Object.keys(PLATAFORMAS)];
  const perfis = lista.perfis.map((p) => {
    const ordenado = {};
    for (const k of ordem) if (p[k] !== undefined) ordenado[k] = p[k];
    for (const k of Object.keys(p)) if (!(k in ordenado)) ordenado[k] = p[k];
    return '    ' + JSON.stringify(ordenado).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{/, '{ ').replace(/\}$/, ' }');
  });
  return [
    '{',
    `  "versao": ${JSON.stringify(lista.versao)},`,
    `  "atualizado": ${JSON.stringify(lista.atualizado)},`,
    '  "perfis": [',
    perfis.join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');
}

function principal() {
  const resposta = process.env.RESPOSTA || join(RAIZ, 'resposta.md');
  const saida = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
  const issue = process.env.ISSUE_NUMBER ? `#${process.env.ISSUE_NUMBER}` : 'a issue';

  try {
    const pedido = extrairPedido(process.env.ISSUE_BODY);
    const lista = JSON.parse(readFileSync(ARQUIVO_LISTA, 'utf8'));
    const hoje = new Date().toISOString().slice(0, 10);
    const { nomeFinal, adicionados, ignorados } = aplicar(lista, pedido, hoje);

    const linhas = [];
    if (adicionados.length) {
      writeFileSync(ARQUIVO_LISTA, serializar(lista));
      linhas.push(`✅ **${nomeFinal}** entrou na lista (versão ${lista.versao}):`, '', ...adicionados.map((a) => `- ${a}`));
      linhas.push('', 'O JSON público em https://janonismo.vercel.app/lista.json é atualizado no próximo deploy da Vercel, e as extensões baixam a lista nova em até 6 horas.');
    } else {
      linhas.push(`ℹ️ Nada novo para adicionar a partir de ${issue}.`);
    }
    if (ignorados.length) linhas.push('', 'Já estavam na lista:', '', ...ignorados.map((i) => `- ${i}`));

    writeFileSync(resposta, linhas.join('\n') + '\n');
    saida('resultado', adicionados.length ? 'ok' : 'sem-mudanca');
    saida('nome', nomeFinal.replace(/[\r\n]/g, ' '));
  } catch (e) {
    writeFileSync(
      resposta,
      [`❌ Não consegui aplicar ${issue}:`, '', `- ${e.message}`, '', 'Corrija a issue e aplique o rótulo `aprovado` de novo.', ''].join('\n')
    );
    saida('resultado', 'erro');
    console.error(e.message);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) principal();
