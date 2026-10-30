import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { simularExtensao } from './helpers.mjs';

const INDICE = { 'x:fulano': { nome: 'Fulano', origem: 'embutida' } };
let abas = 0;

/**
 * Abre uma "aba" falsa (location, document, history, navigation) com o detector.js rodando e um overlay
 * falso que só registra o que mostrou. Cada aba importa o detector de novo (?aba=N) com timers falsos.
 */
async function abrirAba({ url, navigationApi, storage = {} }) {
  mock.timers.reset(); // desliga os timers de uma aba aberta antes no mesmo teste
  mock.timers.enable({ apis: ['setInterval'] });
  simularExtensao({ storage: { indice: INDICE, config: { ativo: true }, ...storage } });

  const janela = new EventTarget();
  const documento = Object.assign(new EventTarget(), { hidden: false });
  const navegacao = navigationApi ? new EventTarget() : undefined;
  const aba = { mostrados: [], visivel: false };
  Object.assign(globalThis, {
    location: { href: url },
    history: { length: 1, back() {} },
    document: documento,
    navigation: navegacao,
    addEventListener: janela.addEventListener.bind(janela),
  });
  globalThis.Janonismo.overlay = {
    mostrar: ({ plataforma, handle }) => {
      aba.mostrados.push(`${plataforma}:${handle}`);
      aba.visivel = true;
    },
    esconder: () => (aba.visivel = false),
    visivel: () => aba.visivel,
  };

  await import(`../src/content/detector.js?aba=${++abas}`);
  await new Promise(setImmediate); // o detector começa depois de ler o storage

  const irPara = (destino) => (location.href = new URL(destino, location.href).href);
  return Object.assign(aba, {
    /** Navegação da página (pushState): a Navigation API avisa; sem ela, nada avisa. */
    pushState(destino) {
      irPara(destino);
      navegacao?.dispatchEvent(new Event('currententrychange'));
    },
    /** Botão voltar: dispara popstate (e currententrychange, se houver Navigation API). */
    voltar(destino) {
      irPara(destino);
      janela.dispatchEvent(new Event('popstate'));
      navegacao?.dispatchEvent(new Event('currententrychange'));
    },
    esconderAba(escondida) {
      documento.hidden = escondida;
      documento.dispatchEvent(new Event('visibilitychange'));
    },
  });
}

afterEach(() => mock.timers.reset());

// Casos que valem com e sem Navigation API. `esperar` é o quanto o detector pode levar para perceber um
// pushState: nada com a API, até um ciclo do polling sem ela.
for (const { cenario, navigationApi, esperar } of [
  { cenario: 'com Navigation API', navigationApi: true, esperar: 0 },
  { cenario: 'sem Navigation API', navigationApi: false, esperar: 500 },
]) {
  describe(cenario, () => {
    const abrir = (url, storage) => abrirAba({ url, navigationApi, storage });
    const pushState = (aba, destino) => {
      aba.pushState(destino);
      mock.timers.tick(esperar);
    };

    it('mostra o aviso ao abrir um perfil da lista, e conta', async () => {
      const aba = await abrir('https://x.com/Fulano');
      assert.deepEqual(aba.mostrados, ['x:fulano']);
      assert.deepEqual(chrome.runtime.enviadas, [{ tipo: 'contar' }]);
    });

    it('não mostra em perfil fora da lista nem com a extensão desligada', async () => {
      assert.deepEqual((await abrir('https://x.com/outro')).mostrados, []);
      assert.deepEqual((await abrir('https://x.com/fulano', { config: { ativo: false } })).mostrados, []);
    });

    it('percebe o pushState para um perfil da lista, e esconde ao sair dele', async () => {
      const aba = await abrir('https://x.com/home');
      pushState(aba, '/fulano');
      assert.deepEqual(aba.mostrados, ['x:fulano']);
      pushState(aba, '/home');
      assert.equal(aba.visivel, false);
    });

    it('percebe o voltar na hora', async () => {
      const aba = await abrir('https://x.com/home');
      aba.voltar('/fulano');
      assert.deepEqual(aba.mostrados, ['x:fulano']);
    });

    it('reavalia quando a lista muda', async () => {
      const aba = await abrir('https://x.com/novo');
      await chrome.storage.local.set({ indice: { 'x:novo': { nome: 'Novo', origem: 'usuario' } } });
      assert.deepEqual(aba.mostrados, ['x:novo']);
    });
  });
}

describe('com Navigation API', () => {
  it('percebe o pushState na hora e não fica olhando a URL', async () => {
    const aba = await abrirAba({ url: 'https://x.com/home', navigationApi: true });
    aba.pushState('/fulano');
    assert.deepEqual(aba.mostrados, ['x:fulano'], 'sem esperar timer nenhum');

    location.href = 'https://x.com/home'; // mudança sem evento: só um polling perceberia
    mock.timers.tick(60_000);
    assert.equal(aba.visivel, true);
  });
});

describe('sem Navigation API', () => {
  it('olha a URL a cada 500 ms', async () => {
    const aba = await abrirAba({ url: 'https://x.com/home', navigationApi: false });
    location.href = 'https://x.com/fulano';
    mock.timers.tick(499);
    assert.deepEqual(aba.mostrados, []);
    mock.timers.tick(1);
    assert.deepEqual(aba.mostrados, ['x:fulano']);
  });

  it('para de olhar com a aba escondida e confere a URL quando ela volta', async () => {
    const aba = await abrirAba({ url: 'https://x.com/home', navigationApi: false });
    aba.esconderAba(true);
    location.href = 'https://x.com/fulano';
    mock.timers.tick(60_000);
    assert.deepEqual(aba.mostrados, []);
    aba.esconderAba(false);
    assert.deepEqual(aba.mostrados, ['x:fulano']);
  });
});
