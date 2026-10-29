import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { esperar, lista, simularExtensao } from './helpers.mjs';

const ALARME = 'atualizar-lista-remota';
const REMOTA = lista.CONFIG_PADRAO.urlRemota;

// O background.js registra os ouvintes uma vez só, no import. Por isso a simulação também é uma só, e o
// storage e os alarmes são esvaziados antes de cada teste.
const dados = simularExtensao({
  rede: {
    'ext://data/lista.json': { perfis: [{ nome: 'Embutido', x: ['embutido'] }] },
    [REMOTA]: { perfis: [{ nome: 'Remoto', x: ['remoto'] }] },
  },
});
await import('../src/background.js');
const { runtime, alarms } = globalThis.chrome;

beforeEach(() => {
  for (const objeto of [dados, alarms.criados]) for (const k of Object.keys(objeto)) delete objeto[k];
});

/** Dispara um evento como o navegador e espera os ouvintes (que podem ser async). */
const disparar = (evento, ...args) => Promise.all(evento.ouvintes.map((ouvinte) => ouvinte(...args)));

/** Como chrome.runtime.sendMessage: devolve a resposta, ou undefined se ninguém responder. */
const enviar = (msg) =>
  new Promise((resolve) => {
    const vaiResponder = runtime.onMessage.ouvintes.map((ouvinte) => ouvinte(msg, {}, resolve)).some(Boolean);
    if (!vaiResponder) resolve(undefined);
  });

describe('mensagens', () => {
  it('atualizarRemota responde com o resultado do download', async () => {
    assert.deepEqual(await enviar({ tipo: 'atualizarRemota' }), { ok: true, total: 1 });
    assert.ok(dados.indice['x:remoto']);
  });

  it('contar não perde avisos que chegam ao mesmo tempo', async () => {
    await Promise.all(Array.from({ length: 20 }, () => enviar({ tipo: 'contar' })));
    assert.equal(dados.contador, 20);
  });

  for (const msg of [undefined, {}, { tipo: 'recalcular' }, { tipo: 'outra' }]) {
    it(`ignora ${JSON.stringify(msg)}`, async () => {
      assert.equal(await enviar(msg), undefined);
      assert.deepEqual(dados, {});
    });
  }
});

describe('ciclo de vida', () => {
  it('ao instalar grava a config padrão, cria o alarme e baixa a lista', async () => {
    await disparar(runtime.onInstalled);
    assert.deepEqual(dados.config, lista.CONFIG_PADRAO);
    assert.deepEqual(alarms.criados[ALARME], { name: ALARME, delayInMinutes: 1, periodInMinutes: 360 });
    assert.ok(dados.indice['x:embutido'], 'já tem índice antes do download');
    await esperar(() => dados.listaRemota);
    assert.ok(dados.indice['x:remoto']);
  });

  it('ao iniciar mantém a config do usuário e o alarme que já existe', async () => {
    dados.config = { ativo: false, urlRemota: '' };
    alarms.criados[ALARME] = { name: ALARME, periodInMinutes: 1 };
    await disparar(runtime.onStartup);
    assert.deepEqual(dados.config, { ativo: false, urlRemota: '' });
    assert.deepEqual(alarms.criados[ALARME], { name: ALARME, periodInMinutes: 1 });
  });

  it('o alarme baixa a lista remota; outros alarmes não', async () => {
    await disparar(alarms.onAlarm, { name: 'outro' });
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(dados.listaRemota, undefined);

    await disparar(alarms.onAlarm, { name: ALARME });
    await esperar(() => dados.listaRemota);
  });
});
