import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Simula só o pedaço da API de extensão que src/shared/lista.js usa.
let armazenado;
let respostas;

globalThis.chrome = {
  runtime: { getURL: (caminho) => `ext://${caminho}` },
  storage: {
    local: {
      async get(chaves) {
        const lista = [].concat(chaves);
        return structuredClone(Object.fromEntries(lista.filter((k) => k in armazenado).map((k) => [k, armazenado[k]])));
      },
      async set(obj) {
        Object.assign(armazenado, structuredClone(obj));
      },
      async remove(chaves) {
        for (const k of [].concat(chaves)) delete armazenado[k];
      },
    },
  },
};

globalThis.fetch = async (url) => {
  const r = respostas[url];
  if (!r) throw new TypeError('fetch failed');
  return typeof r === 'function' ? r() : new Response(JSON.stringify(r));
};

await import('../src/shared/plataformas.js');
await import('../src/shared/lista.js');
const { lista } = globalThis.Janonismo;

const REMOTA = 'https://exemplo.test/lista.json';

const EMBUTIDA = {
  versao: 1,
  perfis: [
    { nome: 'Fulano', x: ['Fulano'], instagram: ['fulano.oficial'] },
    { nome: 'Beltrano', youtube: 'beltranotv' },
    { nome: 'Vazio', x: [''] },
  ],
};

beforeEach(() => {
  armazenado = { config: { ativo: true, urlRemota: REMOTA } };
  respostas = { 'ext://data/lista.json': EMBUTIDA };
});

describe('recalcular', () => {
  it('indexa a lista embutida com handles normalizados', async () => {
    const indice = await lista.recalcular();
    assert.deepEqual(indice, {
      'x:fulano': { nome: 'Fulano', origem: 'embutida' },
      'instagram:fulano.oficial': { nome: 'Fulano', origem: 'embutida' },
      'youtube:beltranotv': { nome: 'Beltrano', origem: 'embutida' },
    });
    assert.deepEqual(armazenado.indice, indice, 'o índice fica salvo no storage');
  });

  it('soma a remota, e a embutida ganha quando os dois têm a mesma chave', async () => {
    armazenado.listaRemota = { perfis: [{ nome: 'Fulano (remoto)', x: ['fulano', 'outro'] }] };
    const indice = await lista.recalcular();
    assert.deepEqual(indice['x:fulano'], { nome: 'Fulano', origem: 'embutida' });
    assert.deepEqual(indice['x:outro'], { nome: 'Fulano (remoto)', origem: 'remota' });
  });

  it('ignora lista remota salva com formato inválido', async () => {
    armazenado.listaRemota = { perfis: 'quebrado' };
    const indice = await lista.recalcular();
    assert.equal(Object.keys(indice).length, 3);
  });

  it('aplica perfis extras e removidos do usuário', async () => {
    armazenado.extras = [{ plataforma: 'tiktok', handle: '@Novo', nome: 'Novo' }];
    armazenado.removidos = ['x:fulano'];
    const indice = await lista.recalcular();
    assert.deepEqual(indice['tiktok:novo'], { nome: 'Novo', origem: 'usuario' });
    assert.equal(indice['x:fulano'], undefined);
    assert.ok(indice['instagram:fulano.oficial'], 'remover uma conta não remove as outras do mesmo perfil');
  });

  it('usa o handle como nome quando o perfil não tem nome', async () => {
    respostas['ext://data/lista.json'] = { perfis: [{ x: ['semnome'] }] };
    const indice = await lista.recalcular();
    assert.equal(indice['x:semnome'].nome, 'semnome');
  });
});

describe('atualizarRemota', () => {
  it('baixa, salva e recalcula', async () => {
    respostas[REMOTA] = { perfis: [{ nome: 'Remoto', x: ['remoto'] }] };
    const r = await lista.atualizarRemota();
    assert.deepEqual(r, { ok: true, total: 1 });
    assert.equal(armazenado.remotaErro, null);
    assert.equal(typeof armazenado.remotaAtualizadaEm, 'number');
    assert.deepEqual(armazenado.indice['x:remoto'], { nome: 'Remoto', origem: 'remota' });
  });

  it('mantém a última lista boa quando o servidor responde erro', async () => {
    const anterior = { perfis: [{ nome: 'Antigo', x: ['antigo'] }] };
    armazenado.listaRemota = anterior;
    respostas[REMOTA] = () => new Response('falhou', { status: 500 });
    const r = await lista.atualizarRemota();
    assert.deepEqual(r, { ok: false, erro: 'HTTP 500' });
    assert.deepEqual(armazenado.listaRemota, anterior);
    assert.equal(armazenado.remotaErro, 'HTTP 500');
  });

  it('mantém a última lista boa quando o JSON não tem "perfis"', async () => {
    const anterior = { perfis: [] };
    armazenado.listaRemota = anterior;
    respostas[REMOTA] = { coisas: [] };
    const r = await lista.atualizarRemota();
    assert.equal(r.ok, false);
    assert.match(r.erro, /perfis/);
    assert.deepEqual(armazenado.listaRemota, anterior);
  });

  it('mantém a última lista boa quando o JSON está quebrado', async () => {
    respostas[REMOTA] = () => new Response('{ quebrado');
    const r = await lista.atualizarRemota();
    assert.equal(r.ok, false);
    assert.equal(armazenado.listaRemota, undefined);
    assert.ok(armazenado.remotaErro);
  });

  it('trata falha de rede', async () => {
    const r = await lista.atualizarRemota();
    assert.deepEqual(r, { ok: false, erro: 'fetch failed' });
  });

  it('não faz nada sem URL remota', async () => {
    armazenado.config = { ativo: true, urlRemota: '' };
    const r = await lista.atualizarRemota();
    assert.equal(r.ok, false);
  });
});

describe('obterConfig', () => {
  it('completa com os valores padrão', async () => {
    armazenado = {};
    assert.deepEqual(await lista.obterConfig(), lista.CONFIG_PADRAO);
    armazenado.config = { ativo: false };
    assert.deepEqual(await lista.obterConfig(), { ...lista.CONFIG_PADRAO, ativo: false });
  });
});
