// Utilitários compartilhados pelos testes. Não é um arquivo de teste (não termina em .test.mjs).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

await import('../src/shared/plataformas.js');
await import('../src/shared/lista.js');
await import('../src/shared/permissoes.js');

export const { PLATAFORMAS, extrairPerfil, normalizarHandle, chave, lista, permissoes } = globalThis.Janonismo;

export const RAIZ = join(import.meta.dirname, '..');
export const ler = (...caminho) => readFileSync(join(RAIZ, ...caminho), 'utf8');
export const lerJson = (...caminho) => JSON.parse(ler(...caminho));

/** Todas as contas de uma lista, achatadas: [{ perfil, plataforma, handle }]. */
export function contas({ perfis }) {
  return perfis.flatMap((perfil) =>
    Object.keys(PLATAFORMAS).flatMap((plataforma) =>
      [].concat(perfil[plataforma] ?? []).map((handle) => ({ perfil, plataforma, handle }))
    )
  );
}

/** Chaves que aparecem mais de uma vez: [[chave, itens]]. */
export function repetidos(itens, chaveDe) {
  return [...Map.groupBy(itens, chaveDe)].filter(([, grupo]) => grupo.length > 1);
}

/** Corpo de issue no formato que o GitHub gera a partir de um formulário. */
export function corpoIssue(campos) {
  return Object.entries(campos)
    .map(([titulo, valor]) => `### ${titulo}\n\n${valor || '_No response_'}`)
    .join('\n\n');
}

/**
 * Instala um `chrome` e um `fetch` falsos com o que src/ usa.
 * - storage: conteúdo inicial do chrome.storage.local
 * - rede: { url: objeto (vira JSON) | Response }; URL ausente = falha de rede
 * Devolve o storage, que pode ser inspecionado depois. Os ouvintes registrados ficam em
 * chrome.<api>.<evento>.ouvintes, os alarmes criados em chrome.alarms.criados e as mensagens enviadas
 * em chrome.runtime.enviadas.
 * - permissoes: { concedidas: origens que getAll() lista, contem(origens): resposta do contains() }
 */
export function simularExtensao({ storage = {}, rede = {}, permissoes = {} } = {}) {
  const { concedidas = [], contem = () => false } = permissoes;
  const dados = structuredClone(storage);
  const criados = {};
  const enviadas = [];
  const evento = () => {
    const ouvintes = [];
    return { ouvintes, addListener: (fn) => void ouvintes.push(fn) };
  };
  const onMessage = evento();
  const onChanged = evento();
  const avisarMudancas = (mudancas) => {
    if (Object.keys(mudancas).length) onChanged.ouvintes.forEach((ouvinte) => ouvinte(structuredClone(mudancas), 'local'));
  };
  globalThis.chrome = {
    permissions: {
      getAll: async () => ({ origins: [...concedidas] }),
      contains: async ({ origins }) => contem(origins),
    },
    runtime: {
      getURL: (caminho) => `ext://${caminho}`,
      onInstalled: evento(),
      onStartup: evento(),
      onMessage,
      enviadas,
      // Entrega aos ouvintes de onMessage; resolve com a resposta, ou undefined se ninguém responder.
      sendMessage: (msg) =>
        new Promise((resolve) => {
          enviadas.push(msg);
          if (!onMessage.ouvintes.map((ouvinte) => ouvinte(msg, {}, resolve)).some(Boolean)) resolve(undefined);
        }),
    },
    alarms: {
      criados,
      get: async (nome) => criados[nome],
      create: (nome, info) => void (criados[nome] = { name: nome, ...info }),
      onAlarm: evento(),
    },
    storage: {
      onChanged,
      local: {
        get: async (chaves) =>
          structuredClone(Object.fromEntries([].concat(chaves).filter((k) => k in dados).map((k) => [k, dados[k]]))),
        set: async (obj) => {
          const mudancas = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, { oldValue: dados[k], newValue: v }]));
          Object.assign(dados, structuredClone(obj));
          avisarMudancas(mudancas);
        },
        remove: async (chaves) => {
          const mudancas = Object.fromEntries([].concat(chaves).filter((k) => k in dados).map((k) => [k, { oldValue: dados[k] }]));
          [].concat(chaves).forEach((k) => delete dados[k]);
          avisarMudancas(mudancas);
        },
      },
    },
  };
  globalThis.fetch = async (url) => {
    const resposta = rede[url];
    if (resposta === undefined) throw new TypeError('fetch failed');
    return resposta instanceof Response ? resposta.clone() : new Response(JSON.stringify(resposta));
  };
  return dados;
}

/** Espera `condicao()` ficar verdadeira (para efeitos que o código dispara sem esperar). */
export async function esperar(condicao, ms = 1000) {
  for (const fim = Date.now() + ms; !condicao(); ) {
    if (Date.now() > fim) throw new Error(`tempo esgotado esperando ${condicao}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}
