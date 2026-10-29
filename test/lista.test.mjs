import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { lista, simularExtensao } from './helpers.mjs';

const REMOTA = 'https://exemplo.test/lista.json';
const EMBUTIDA = {
  perfis: [
    { nome: 'Fulano', x: ['Fulano'] },
    { nome: 'Beltrano', youtube: 'beltranotv' }, // string no lugar do array também vale
    { nome: 'Vazio', x: [''] }, // handle vazio é ignorado
  ],
};

/** Extensão com a lista embutida acima e a URL remota configurada; storage e rede podem ser sobrescritos. */
const extensao = ({ storage, rede } = {}) =>
  simularExtensao({
    storage: { config: { ativo: true, urlRemota: REMOTA }, ...storage },
    rede: { 'ext://data/lista.json': EMBUTIDA, ...rede },
  });

/** Índice como { chave: 'Nome (origem)' }, mais fácil de ler nas tabelas. */
const resumir = (indice) =>
  Object.fromEntries(Object.entries(indice).map(([k, { nome, origem }]) => [k, `${nome} (${origem})`]));

const BASE = { 'x:fulano': 'Fulano (embutida)', 'youtube:beltranotv': 'Beltrano (embutida)' };

describe('recalcular', () => {
  const CASOS = [
    { caso: 'só a embutida', indice: BASE },
    {
      caso: 'a remota substitui a embutida, inclusive para tirar perfis',
      storage: { listaRemota: { perfis: [{ nome: 'Remoto', x: ['outro'] }] } },
      indice: { 'x:outro': 'Remoto (remota)' },
    },
    {
      caso: 'extras e removidos do usuário valem também sobre a remota',
      storage: {
        listaRemota: { perfis: [{ nome: 'Remoto', x: ['outro', 'tirado'] }] },
        extras: [{ plataforma: 'tiktok', handle: 'novo', nome: 'Novo' }],
        removidos: ['x:tirado'],
      },
      indice: { 'x:outro': 'Remoto (remota)', 'tiktok:novo': 'Novo (usuario)' },
    },
    {
      caso: 'usa a embutida se a remota salva tiver formato inválido',
      storage: { listaRemota: { perfis: 'quebrado' } },
      indice: BASE,
    },
    {
      caso: 'soma os extras do usuário',
      storage: { extras: [{ plataforma: 'tiktok', handle: '@Novo', nome: 'Novo' }] },
      indice: { ...BASE, 'tiktok:novo': 'Novo (usuario)' },
    },
    {
      caso: 'extra sem nome usa o handle',
      storage: { extras: [{ plataforma: 'tiktok', handle: 'novo' }] },
      indice: { ...BASE, 'tiktok:novo': 'novo (usuario)' },
    },
    {
      caso: 'tira os removidos pelo usuário',
      storage: { removidos: ['x:fulano'] },
      indice: { 'youtube:beltranotv': 'Beltrano (embutida)' },
    },
    {
      caso: 'perfil sem nome usa o handle',
      rede: { 'ext://data/lista.json': { perfis: [{ x: ['semnome'] }] } },
      indice: { 'x:semnome': 'semnome (embutida)' },
    },
  ];

  for (const { caso, storage, rede, indice } of CASOS) {
    it(caso, async () => {
      const dados = extensao({ storage, rede });
      assert.deepEqual(resumir(await lista.recalcular()), indice);
      assert.deepEqual(resumir(dados.indice), indice, 'o índice fica salvo no storage');
    });
  }
});

describe('atualizarRemota', () => {
  it('baixa, salva e recalcula', async () => {
    const dados = extensao({ rede: { [REMOTA]: { perfis: [{ nome: 'Remoto', x: ['remoto'] }] } } });
    assert.deepEqual(await lista.atualizarRemota(), { ok: true, total: 1 });
    assert.equal(dados.remotaErro, null);
    assert.equal(typeof dados.remotaAtualizadaEm, 'number');
    assert.deepEqual(resumir(dados.indice), { 'x:remoto': 'Remoto (remota)' });
  });

  const ANTERIOR = { perfis: [{ nome: 'Antigo', x: ['antigo'] }] };
  const FALHAS = [
    { caso: 'o servidor responde erro', resposta: new Response('falhou', { status: 500 }), erro: /^HTTP 500$/ },
    { caso: 'o JSON não tem "perfis"', resposta: { coisas: [] }, erro: /perfis/ },
    { caso: 'o JSON está quebrado', resposta: new Response('{ quebrado'), erro: /JSON/ },
    { caso: 'a rede falha', resposta: undefined, erro: /^fetch failed$/ },
  ];

  for (const { caso, resposta, erro } of FALHAS) {
    it(`mantém a última lista boa quando ${caso}`, async () => {
      const dados = extensao({ storage: { listaRemota: ANTERIOR }, rede: { [REMOTA]: resposta } });
      const r = await lista.atualizarRemota();
      assert.equal(r.ok, false);
      assert.match(r.erro, erro);
      assert.equal(dados.remotaErro, r.erro);
      assert.deepEqual(dados.listaRemota, ANTERIOR);
    });
  }

  it('não faz nada sem URL remota', async () => {
    extensao({ storage: { config: { ativo: true, urlRemota: '' } } });
    assert.deepEqual(await lista.atualizarRemota(), { ok: false, erro: 'Nenhuma URL remota configurada.' });
  });
});

describe('obterConfig', () => {
  for (const [caso, storage, esperado] of [
    ['sem nada salvo usa o padrão', {}, lista.CONFIG_PADRAO],
    ['completa o que falta com o padrão', { config: { ativo: false } }, { ...lista.CONFIG_PADRAO, ativo: false }],
  ]) {
    it(caso, async () => {
      simularExtensao({ storage });
      assert.deepEqual(await lista.obterConfig(), esperado);
    });
  }
});
