import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { aplicar, extrairPedido, lerCampos, serializar } from '../scripts/aplicar-issue.mjs';

// Monta o corpo da issue do jeito que o GitHub renderiza um formulário.
function corpo(campos) {
  return Object.entries(campos)
    .map(([titulo, valor]) => `### ${titulo}\n\n${valor || '_No response_'}`)
    .join('\n\n');
}

const lista = () => ({
  versao: 3,
  atualizado: '2026-01-01',
  perfis: [{ nome: 'Flávio Bolsonaro', x: ['flaviobolsonaro'] }],
});

describe('lerCampos', () => {
  it('lê títulos e valores, com \\r\\n e _No response_', () => {
    const texto = '### Nome\r\n\r\nFulano\r\n\r\n### Instagram\r\n\r\n_No response_\r\n\r\n### X / Twitter\r\n\r\n@fulano';
    assert.deepEqual(lerCampos(texto), { Nome: 'Fulano', Instagram: '', 'X / Twitter': '@fulano' });
  });
  it('aceita corpo vazio', () => assert.deepEqual(lerCampos(null), {}));
});

describe('extrairPedido', () => {
  it('aceita @handle, URL e vários valores separados por vírgula', () => {
    const pedido = extrairPedido(
      corpo({
        Nome: 'Fulano de Tal',
        'X / Twitter': '@Fulano, https://x.com/fulano2/status/1',
        Instagram: 'https://www.instagram.com/fulano.oficial/',
        YouTube: 'https://www.youtube.com/@FulanoTV',
        Telegram: '_No response_',
      })
    );
    assert.deepEqual(pedido, {
      nome: 'Fulano de Tal',
      handles: { x: ['fulano', 'fulano2'], instagram: ['fulano.oficial'], youtube: ['fulanotv'] },
    });
  });

  it('remove duplicados dentro da mesma issue', () => {
    const pedido = extrairPedido(corpo({ Nome: 'F', 'X / Twitter': '@fulano, fulano\nhttps://x.com/Fulano' }));
    assert.deepEqual(pedido.handles, { x: ['fulano'] });
  });

  it('exige nome', () => {
    assert.throws(() => extrairPedido(corpo({ Nome: '', 'X / Twitter': 'fulano' })), /Nome/);
  });

  it('limita o nome a 80 caracteres', () => {
    assert.throws(() => extrairPedido(corpo({ Nome: 'a'.repeat(81), 'X / Twitter': 'fulano' })), /80/);
  });

  it('exige pelo menos uma rede', () => {
    assert.throws(() => extrairPedido(corpo({ Nome: 'Fulano' })), /nenhuma rede/);
  });

  it('recusa URL de outra rede no campo errado', () => {
    assert.throws(
      () => extrairPedido(corpo({ Nome: 'F', Instagram: 'https://x.com/fulano' })),
      /é do X \/ Twitter, não do Instagram/
    );
  });

  it('recusa URL que não é perfil', () => {
    assert.throws(() => extrairPedido(corpo({ Nome: 'F', 'X / Twitter': 'https://x.com/home' })), /não reconheci/);
  });

  it('recusa handle inválido e página reservada', () => {
    assert.throws(() => extrairPedido(corpo({ Nome: 'F', 'X / Twitter': 'nome com espaço' })), /não é um usuário válido/);
    assert.throws(() => extrairPedido(corpo({ Nome: 'F', 'X / Twitter': 'muito_comprido_para_o_x' })), /não é um usuário válido/);
    assert.throws(() => extrairPedido(corpo({ Nome: 'F', Instagram: 'explore' })), /é uma página do Instagram/);
  });

  it('junta todos os erros numa mensagem só', () => {
    assert.throws(
      () => extrairPedido(corpo({ Nome: 'F', 'X / Twitter': 'a b', Instagram: 'explore' })),
      (e) => e.message.includes('**X / Twitter**') && e.message.includes('**Instagram**')
    );
  });
});

describe('aplicar', () => {
  it('cria perfil novo e sobe a versão', () => {
    const l = lista();
    const r = aplicar(l, { nome: 'Novo', handles: { x: ['novo'], tiktok: ['novo.tt'] } }, '2026-10-29');
    assert.deepEqual(r.adicionados, ['@novo no X / Twitter', '@novo.tt no TikTok']);
    assert.deepEqual(l.perfis.at(-1), { nome: 'Novo', x: ['novo'], tiktok: ['novo.tt'] });
    assert.equal(l.versao, 4);
    assert.equal(l.atualizado, '2026-10-29');
  });

  it('junta no perfil existente ignorando acento e maiúsculas', () => {
    const l = lista();
    const r = aplicar(l, { nome: 'flavio bolsonaro', handles: { instagram: ['flaviobolsonaro'] } }, '2026-10-29');
    assert.equal(r.nomeFinal, 'Flávio Bolsonaro');
    assert.equal(l.perfis.length, 1);
    assert.deepEqual(l.perfis[0].instagram, ['flaviobolsonaro']);
  });

  it('ignora contas que já estão na lista, mesmo em outro perfil', () => {
    const l = lista();
    const r = aplicar(l, { nome: 'Outro', handles: { x: ['FlavioBolsonaro'] } }, '2026-10-29');
    assert.deepEqual(r.adicionados, []);
    assert.equal(r.ignorados.length, 1);
    assert.match(r.ignorados[0], /Flávio Bolsonaro/);
    assert.equal(l.perfis.length, 1, 'não deixa perfil vazio para trás');
    assert.equal(l.versao, 3, 'sem mudança, sem versão nova');
    assert.equal(l.atualizado, '2026-01-01');
  });
});

describe('serializar', () => {
  it('gera um perfil por linha, com as chaves em ordem fixa', () => {
    const texto = serializar({ versao: 1, atualizado: '2026-01-01', perfis: [{ x: ['a'], nome: 'A', extra: 1 }] });
    assert.equal(
      texto,
      '{\n  "versao": 1,\n  "atualizado": "2026-01-01",\n  "perfis": [\n    { "nome": "A", "x": ["a"], "extra": 1 }\n  ]\n}\n'
    );
    assert.deepEqual(JSON.parse(texto).perfis[0], { nome: 'A', x: ['a'], extra: 1 });
  });
});

describe('script (contrato com o workflow aprovar-perfil.yml)', () => {
  const rodar = async (issueBody) => {
    const dir = mkdtempSync(join(tmpdir(), 'janonismo-'));
    const env = {
      ...process.env,
      ISSUE_BODY: issueBody,
      ISSUE_NUMBER: '42',
      RESPOSTA: join(dir, 'resposta.md'),
      GITHUB_OUTPUT: join(dir, 'saida'),
    };
    await promisify(execFile)(process.execPath, ['scripts/aplicar-issue.mjs'], { env }).catch((e) => e);
    return { resposta: readFileSync(env.RESPOSTA, 'utf8'), saida: readFileSync(env.GITHUB_OUTPUT, 'utf8') };
  };

  it('em caso de erro escreve resultado=erro e a mensagem para a issue', async () => {
    const { resposta, saida } = await rodar(corpo({ Nome: 'Fulano' }));
    assert.equal(saida, 'resultado=erro\n');
    assert.match(resposta, /^❌ Não consegui aplicar #42/);
    assert.match(resposta, /nenhuma rede/);
  });

  it('sem nada novo escreve resultado=sem-mudanca e não mexe na lista', async () => {
    const arquivo = new URL('../src/data/lista.json', import.meta.url);
    const antes = readFileSync(arquivo, 'utf8');
    const { perfis } = JSON.parse(antes);
    const [plataforma, [handle]] = Object.entries(perfis[0]).find(([k]) => k !== 'nome');
    const rotulo = { x: 'X / Twitter', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook' }[plataforma];

    const { resposta, saida } = await rodar(corpo({ Nome: perfis[0].nome, [rotulo]: handle }));
    assert.equal(saida, `resultado=sem-mudanca\nnome=${perfis[0].nome}\n`);
    assert.match(resposta, /Nada novo/);
    assert.equal(readFileSync(arquivo, 'utf8'), antes);
  });
});
