// Utilitários compartilhados pelos testes. Não é um arquivo de teste (não termina em .test.mjs).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

await import('../src/shared/plataformas.js');
await import('../src/shared/lista.js');

export const { PLATAFORMAS, extrairPerfil, normalizarHandle, chave, lista } = globalThis.Janonismo;

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
 * Instala um `chrome` e um `fetch` falsos com o que src/shared/lista.js usa.
 * - storage: conteúdo inicial do chrome.storage.local
 * - rede: { url: objeto (vira JSON) | Response }; URL ausente = falha de rede
 * Devolve o storage, que pode ser inspecionado depois.
 */
export function simularExtensao({ storage = {}, rede = {} } = {}) {
  const dados = structuredClone(storage);
  globalThis.chrome = {
    runtime: { getURL: (caminho) => `ext://${caminho}` },
    storage: {
      local: {
        get: async (chaves) =>
          structuredClone(Object.fromEntries([].concat(chaves).filter((k) => k in dados).map((k) => [k, dados[k]]))),
        set: async (obj) => void Object.assign(dados, structuredClone(obj)),
        remove: async (chaves) => [].concat(chaves).forEach((k) => delete dados[k]),
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
