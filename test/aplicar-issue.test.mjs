import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { aplicar, extrairPedido, lerCampos, serializar } from '../scripts/aplicar-issue.mjs';
import { PLATAFORMAS, RAIZ, corpoIssue, ler, lerJson } from './helpers.mjs';

describe('lerCampos', () => {
  it('lê títulos e valores, com \\r\\n e _No response_', () => {
    const texto = '### Nome\r\n\r\nFulano\r\n\r\n### Instagram\r\n\r\n_No response_\r\n\r\n### X / Twitter\r\n\r\n@fulano';
    assert.deepEqual(lerCampos(texto), { Nome: 'Fulano', Instagram: '', 'X / Twitter': '@fulano' });
  });

  it('aceita corpo vazio', () => assert.deepEqual(lerCampos(null), {}));
});

describe('extrairPedido', () => {
  const VALIDOS = [
    {
      caso: '@handle, URL e vários valores separados por vírgula',
      campos: {
        'X / Twitter': '@Fulano, https://x.com/fulano2/status/1',
        Instagram: 'https://www.instagram.com/fulano.oficial/',
        YouTube: 'https://www.youtube.com/@FulanoTV',
        Telegram: '',
      },
      handles: { x: ['fulano', 'fulano2'], instagram: ['fulano.oficial'], youtube: ['fulanotv'] },
    },
    {
      caso: 'duplicados dentro da mesma issue',
      campos: { 'X / Twitter': '@fulano, fulano\nhttps://x.com/Fulano' },
      handles: { x: ['fulano'] },
    },
  ];
  for (const { caso, campos, handles } of VALIDOS) {
    it(`aceita ${caso}`, () => {
      assert.deepEqual(extrairPedido(corpoIssue({ Nome: 'Fulano de Tal', ...campos })), { nome: 'Fulano de Tal', handles });
    });
  }

  const INVALIDOS = [
    { caso: 'sem nome', campos: { Nome: '', 'X / Twitter': 'fulano' }, erro: /Nome/ },
    { caso: 'nome com mais de 80 caracteres', campos: { Nome: 'a'.repeat(81), 'X / Twitter': 'fulano' }, erro: /80/ },
    { caso: 'nenhuma rede', campos: { Nome: 'F' }, erro: /nenhuma rede/ },
    { caso: 'URL de outra rede', campos: { Nome: 'F', Instagram: 'https://x.com/fulano' }, erro: /é do X \/ Twitter, não do Instagram/ },
    { caso: 'URL que não é perfil', campos: { Nome: 'F', 'X / Twitter': 'https://x.com/home' }, erro: /não reconheci/ },
    { caso: 'handle com espaço', campos: { Nome: 'F', 'X / Twitter': 'nome com espaço' }, erro: /não é um usuário válido/ },
    { caso: 'handle fora do formato', campos: { Nome: 'F', 'X / Twitter': 'muito_comprido_para_o_x' }, erro: /não é um usuário válido/ },
    { caso: 'página reservada', campos: { Nome: 'F', Instagram: 'explore' }, erro: /é uma página do Instagram/ },
    {
      caso: 'vários erros (junta todos)',
      campos: { Nome: 'F', 'X / Twitter': 'a b', Instagram: 'explore' },
      erro: /\*\*X \/ Twitter\*\*[\s\S]*\*\*Instagram\*\*/,
    },
  ];
  for (const { caso, campos, erro } of INVALIDOS) {
    it(`recusa ${caso}`, () => assert.throws(() => extrairPedido(corpoIssue(campos)), erro));
  }
});

describe('aplicar', () => {
  const FLAVIO = { nome: 'Flávio Bolsonaro', x: ['flaviobolsonaro'] };
  const CASOS = [
    {
      caso: 'cria perfil novo',
      pedido: { nome: 'Novo', handles: { x: ['novo'], tiktok: ['novo.tt'] } },
      perfis: [FLAVIO, { nome: 'Novo', x: ['novo'], tiktok: ['novo.tt'] }],
      resultado: { nomeFinal: 'Novo', adicionados: ['@novo no X / Twitter', '@novo.tt no TikTok'], ignorados: [] },
    },
    {
      caso: 'junta no perfil existente ignorando acento e maiúsculas',
      pedido: { nome: 'flavio bolsonaro', handles: { instagram: ['flaviobolsonaro'] } },
      perfis: [{ ...FLAVIO, instagram: ['flaviobolsonaro'] }],
      resultado: { nomeFinal: 'Flávio Bolsonaro', adicionados: ['@flaviobolsonaro no Instagram'], ignorados: [] },
    },
    {
      caso: 'ignora conta que já está em outro perfil, sem deixar perfil vazio',
      pedido: { nome: 'Outro', handles: { x: ['flaviobolsonaro'] } },
      perfis: [FLAVIO],
      resultado: {
        nomeFinal: 'Outro',
        adicionados: [],
        ignorados: ['@flaviobolsonaro no X / Twitter (já está na lista como Flávio Bolsonaro)'],
      },
    },
  ];

  for (const { caso, pedido, perfis, resultado } of CASOS) {
    it(caso, () => {
      const lista = { versao: 3, atualizado: '2026-01-01', perfis: [structuredClone(FLAVIO)] };
      assert.deepEqual(aplicar(lista, pedido, '2026-10-29'), resultado);
      const mudou = resultado.adicionados.length > 0;
      assert.deepEqual(lista, {
        versao: mudou ? 4 : 3,
        atualizado: mudou ? '2026-10-29' : '2026-01-01',
        perfis,
      });
    });
  }
});

describe('serializar', () => {
  it('gera um perfil por linha, com as chaves em ordem fixa', () => {
    const texto = serializar({ versao: 1, atualizado: '2026-01-01', perfis: [{ x: ['a'], nome: 'A', extra: 1 }] });
    assert.equal(
      texto,
      '{\n  "versao": 1,\n  "atualizado": "2026-01-01",\n  "perfis": [\n    { "nome": "A", "x": ["a"], "extra": 1 }\n  ]\n}\n'
    );
  });
});

describe('script (contrato com o workflow aprovar-perfil.yml)', () => {
  /** Roda o script como o workflow roda e devolve o que ele escreveu. */
  async function rodar(campos) {
    const dir = mkdtempSync(join(tmpdir(), 'janonismo-'));
    const env = {
      ...process.env,
      ISSUE_BODY: corpoIssue(campos),
      ISSUE_NUMBER: '42',
      RESPOSTA: join(dir, 'resposta.md'),
      GITHUB_OUTPUT: join(dir, 'saida'),
    };
    await promisify(execFile)(process.execPath, ['scripts/aplicar-issue.mjs'], { cwd: RAIZ, env });
    return { resposta: readFileSync(env.RESPOSTA, 'utf8'), saida: readFileSync(env.GITHUB_OUTPUT, 'utf8') };
  }

  // Uma conta que já está na lista, para o caso "nada novo" não precisar gravar o arquivo.
  const [{ nome, ...redes }] = lerJson('src', 'data', 'lista.json').perfis;
  const [plataforma, [handle]] = Object.entries(redes)[0];

  const CASOS = [
    {
      caso: 'erro',
      campos: { Nome: 'Fulano' },
      saida: 'resultado=erro\n',
      resposta: /^❌ Não consegui aplicar #42[\s\S]*nenhuma rede/,
    },
    {
      caso: 'nada novo',
      campos: { Nome: nome, [PLATAFORMAS[plataforma].nome]: handle },
      saida: `resultado=sem-mudanca\nnome=${nome}\n`,
      resposta: /^ℹ️ Nada novo/,
    },
  ];

  for (const { caso, campos, saida, resposta } of CASOS) {
    it(`${caso}: escreve a saída e a resposta sem mexer na lista`, async () => {
      const antes = ler('src', 'data', 'lista.json');
      const r = await rodar(campos);
      assert.equal(r.saida, saida);
      assert.match(r.resposta, resposta);
      assert.equal(ler('src', 'data', 'lista.json'), antes);
    });
  }
});
