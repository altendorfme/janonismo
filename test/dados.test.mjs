// Confere que os arquivos de dados e de configuração continuam coerentes entre si.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { interpretarHandle, serializar } from '../scripts/aplicar-issue.mjs';
import { PLATAFORMAS, RAIZ, chave, contas, ler, lerJson, repetidos } from './helpers.mjs';

const SRC = join(RAIZ, 'src');
const semAcento = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

describe('src/data/lista.json', () => {
  const texto = ler('src', 'data', 'lista.json');
  const lista = JSON.parse(texto);

  it('tem versao, atualizado e perfis', () => {
    assert.ok(Number.isInteger(lista.versao) && lista.versao > 0);
    assert.match(lista.atualizado, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(lista.perfis.length > 0);
  });

  it('está no formato gerado pelo scripts/aplicar-issue.mjs', () => {
    assert.equal(texto, serializar(lista));
  });

  it('cada perfil tem nome, pelo menos uma rede e só plataformas conhecidas', () => {
    const erros = lista.perfis.flatMap(({ nome, ...redes }) => [
      ...(typeof nome === 'string' && nome.trim() && nome.length <= 80 ? [] : [`nome inválido: ${nome}`]),
      ...(Object.keys(redes).length ? [] : [`${nome}: nenhuma rede`]),
      ...Object.entries(redes)
        .filter(([id, handles]) => !PLATAFORMAS[id] || !Array.isArray(handles) || !handles.length)
        .map(([id]) => `${nome}.${id}: plataforma desconhecida ou sem handles`),
    ]);
    assert.deepEqual(erros, []);
  });

  it('todo handle passa na mesma validação das issues', () => {
    const erros = contas(lista).flatMap(({ plataforma, handle }) => {
      if (typeof handle !== 'string' || handle !== handle.trim() || /^(@|https?:)/i.test(handle)) {
        return [`${plataforma}:${handle}: use só o usuário, sem @ nem URL`];
      }
      try {
        interpretarHandle(plataforma, handle);
        return [];
      } catch (e) {
        return [`${plataforma}:${handle}: ${e.message}`];
      }
    });
    assert.deepEqual(erros, []);
  });

  it('nenhuma conta aparece duas vezes', () => {
    const dup = repetidos(contas(lista), ({ plataforma, handle }) => chave(plataforma, handle));
    assert.deepEqual(dup.map(([k, cs]) => `${k}: ${cs.map((c) => c.perfil.nome).join(', ')}`), []);
  });

  it('nenhum nome aparece duas vezes', () => {
    assert.deepEqual(repetidos(lista.perfis, (p) => semAcento(p.nome)).map(([nome]) => nome), []);
  });
});

describe('src/manifest.base.json', () => {
  const manifest = lerJson('src', 'manifest.base.json');
  const hostsDosMatches = manifest.content_scripts
    .flatMap((cs) => cs.matches)
    .map((m) => new URL(m.replace('*.', '')).hostname);
  const hostsDasPlataformas = Object.values(PLATAFORMAS).flatMap((p) => p.hosts);

  it('tem versão no formato aceito pelas lojas', () => {
    assert.match(manifest.version, /^\d+(\.\d+){0,3}$/);
  });

  it('os content scripts rodam em todos os hosts das plataformas, e só neles', () => {
    assert.deepEqual([...new Set(hostsDosMatches)].sort(), [...hostsDasPlataformas].sort());
  });

  it('a lista remota padrão está em host_permissions', () => {
    const [url] = ler('src', 'shared', 'lista.js').match(/https:\/\/[^']+/);
    assert.ok(manifest.host_permissions.includes(`${new URL(url).origin}/*`));
  });

  it('os arquivos referenciados existem', () => {
    const arquivos = [
      ...manifest.content_scripts.flatMap((cs) => cs.js),
      ...Object.values(manifest.icons),
      ...Object.values(manifest.action.default_icon),
      manifest.action.default_popup,
      manifest.options_ui.page,
      ...['background.js', 'shared/plataformas.js', 'shared/lista.js', 'data/lista.json'], // usados pelo build.mjs
    ];
    assert.deepEqual(arquivos.filter((a) => !existsSync(join(SRC, a))), []);
  });
});

describe('código em src/', () => {
  const arquivos = readdirSync(SRC, { recursive: true });

  /** Referências (achadas por `regex`) nos arquivos `ext` de src/ que apontam para arquivos que não existem. */
  const quebradas = (ext, regex, resolver) =>
    arquivos
      .filter((f) => f.endsWith(ext))
      .flatMap((f) => [...ler('src', f).matchAll(regex)].map(([, ref]) => ({ f, ref })))
      .filter(({ f, ref }) => !existsSync(resolver(f, ref)))
      .map(({ f, ref }) => `${f} → ${ref}`);

  it('todo chrome.runtime.getURL aponta para um arquivo que existe', () => {
    assert.deepEqual(quebradas('.js', /getURL\(['"`]([^'"`$]+)['"`]\)/g, (_, ref) => join(SRC, ref)), []);
  });

  it('os HTML só carregam scripts que existem', () => {
    assert.deepEqual(quebradas('.html', /<script[^>]+src="([^"]+)"/g, (f, ref) => join(SRC, f, '..', ref)), []);
  });
});

describe('.github/ISSUE_TEMPLATE/adicionar-perfil.yml', () => {
  const yml = ler('.github', 'ISSUE_TEMPLATE', 'adicionar-perfil.yml');
  // { id: label } de cada campo do formulário
  const campos = Object.fromEntries(
    yml
      .split(/^\s*- type:/m)
      .map((bloco) => [/^\s*id:\s*(\S+)/m.exec(bloco)?.[1], /^\s*label:\s*"?(.+?)"?\s*$/m.exec(bloco)?.[1]])
      .filter(([id]) => id)
  );

  const esperados = { nome: 'Nome', ...Object.fromEntries(Object.entries(PLATAFORMAS).map(([id, p]) => [id, p.nome])) };
  for (const [id, label] of Object.entries(esperados)) {
    it(`o campo "${id}" tem o label "${label}" que o script lê`, () => assert.equal(campos[id], label));
  }

  it('usa o rótulo que o workflow aprovar-perfil.yml espera', () => {
    assert.match(yml, /labels:\s*\["novo-perfil"\]/);
    assert.match(ler('.github', 'workflows', 'aprovar-perfil.yml'), /'novo-perfil'/);
  });
});
