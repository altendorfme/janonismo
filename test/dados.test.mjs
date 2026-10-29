// Confere que os arquivos de dados e de configuração continuam coerentes entre si.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { serializar } from '../scripts/aplicar-issue.mjs';

await import('../src/shared/plataformas.js');
const { PLATAFORMAS, normalizarHandle, chave } = globalThis.Janonismo;

const RAIZ = join(import.meta.dirname, '..');
const SRC = join(RAIZ, 'src');
const ler = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');

describe('src/data/lista.json', () => {
  const texto = ler('src', 'data', 'lista.json');
  const lista = JSON.parse(texto);

  it('tem versao, atualizado e perfis', () => {
    assert.ok(Number.isInteger(lista.versao) && lista.versao > 0);
    assert.match(lista.atualizado, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(lista.perfis) && lista.perfis.length > 0);
  });

  it('está no formato gerado pelo scripts/aplicar-issue.mjs', () => {
    assert.equal(texto, serializar(lista), 'rode serializar() na lista para corrigir a formatação');
  });

  it('cada perfil tem nome, pelo menos uma rede e só chaves conhecidas', () => {
    for (const perfil of lista.perfis) {
      assert.equal(typeof perfil.nome, 'string');
      assert.ok(perfil.nome.trim() && perfil.nome.length <= 80, `nome inválido: ${perfil.nome}`);
      const redes = Object.keys(perfil).filter((k) => k !== 'nome');
      assert.ok(redes.length > 0, `${perfil.nome} não tem nenhuma rede`);
      for (const k of redes) {
        assert.ok(PLATAFORMAS[k], `${perfil.nome}: plataforma desconhecida "${k}"`);
        assert.ok(Array.isArray(perfil[k]) && perfil[k].length > 0, `${perfil.nome}.${k} deve ser um array não vazio`);
      }
    }
  });

  it('todo handle é válido para a plataforma', () => {
    const erros = [];
    for (const perfil of lista.perfis) {
      for (const id of Object.keys(PLATAFORMAS)) {
        const regras = PLATAFORMAS[id];
        for (const h of perfil[id] || []) {
          const n = normalizarHandle(h);
          if (typeof h !== 'string' || !n) erros.push(`${perfil.nome}: handle vazio em ${id}`);
          else if (h !== h.trim() || h.startsWith('@') || /[\s/?#]/.test(h)) erros.push(`${id}:${h} (sem @, espaço ou URL)`);
          else if (regras.valido && !regras.valido.test(n)) erros.push(`${id}:${h} (formato inválido)`);
          else if (regras.reservadas?.includes(n)) erros.push(`${id}:${h} (página reservada)`);
        }
      }
    }
    assert.deepEqual(erros, []);
  });

  it('nenhuma conta aparece duas vezes', () => {
    const vistos = new Map();
    const repetidos = [];
    for (const perfil of lista.perfis) {
      for (const id of Object.keys(PLATAFORMAS)) {
        for (const h of perfil[id] || []) {
          const k = chave(id, h);
          if (vistos.has(k)) repetidos.push(`${k} (${vistos.get(k)} e ${perfil.nome})`);
          vistos.set(k, perfil.nome);
        }
      }
    }
    assert.deepEqual(repetidos, []);
  });

  it('nenhum nome aparece duas vezes', () => {
    const nomes = lista.perfis.map((p) => p.nome);
    const repetidos = nomes.filter((n, i) =>
      nomes.findIndex((m) => m.localeCompare(n, 'pt-BR', { sensitivity: 'base' }) === 0) !== i
    );
    assert.deepEqual(repetidos, []);
  });
});

describe('src/manifest.base.json', () => {
  const manifest = JSON.parse(ler('src', 'manifest.base.json'));
  const matches = manifest.content_scripts.flatMap((cs) => cs.matches);
  const hostsDosMatches = matches.map((m) => new URL(m.replace('*.', '')).hostname);

  it('tem versão no formato aceito pelas lojas', () => {
    assert.match(manifest.version, /^\d+(\.\d+){0,3}$/);
  });

  it('os content scripts rodam em todos os hosts das plataformas', () => {
    for (const [id, p] of Object.entries(PLATAFORMAS)) {
      for (const host of p.hosts) {
        assert.ok(hostsDosMatches.includes(host), `${id}: falta "https://*.${host}/*" ou "https://${host}/*" nos matches`);
      }
    }
  });

  it('todo match pertence a alguma plataforma', () => {
    const hosts = Object.values(PLATAFORMAS).flatMap((p) => p.hosts);
    for (const h of hostsDosMatches) assert.ok(hosts.includes(h), `${h} não está em nenhuma plataforma`);
  });

  it('a lista remota padrão está em host_permissions', () => {
    const { URL_REMOTA } = /'(?<URL_REMOTA>https:[^']+)'/.exec(ler('src', 'shared', 'lista.js')).groups;
    const origem = new URL(URL_REMOTA).origin;
    assert.ok(manifest.host_permissions.includes(`${origem}/*`), `adicione ${origem}/* em host_permissions`);
  });

  it('os arquivos referenciados existem', () => {
    const arquivos = [
      ...manifest.content_scripts.flatMap((cs) => cs.js),
      ...Object.values(manifest.icons),
      ...Object.values(manifest.action.default_icon),
      manifest.action.default_popup,
      manifest.options_ui.page,
      // background do build.mjs
      'background.js',
      'shared/plataformas.js',
      'shared/lista.js',
      'data/lista.json',
    ];
    for (const a of arquivos) assert.ok(existsSync(join(SRC, a)), `não existe: src/${a}`);
  });
});

describe('código em src/', () => {
  const js = readdirSync(SRC, { recursive: true }).filter((f) => f.endsWith('.js'));

  it('todo chrome.runtime.getURL aponta para um arquivo que existe', { todo: 'falta src/assets/placeholder.svg' }, () => {
    const faltando = [];
    for (const f of js) {
      for (const [, caminho] of readFileSync(join(SRC, f), 'utf8').matchAll(/getURL\(['"`]([^'"`$]+)['"`]\)/g)) {
        if (!existsSync(join(SRC, caminho))) faltando.push(`${f} → ${caminho}`);
      }
    }
    assert.deepEqual(faltando, []);
  });

  it('os HTML só carregam scripts que existem', () => {
    for (const f of readdirSync(join(SRC, 'ui')).filter((f) => f.endsWith('.html'))) {
      for (const [, src] of ler('src', 'ui', f).matchAll(/<script[^>]+src="([^"]+)"/g)) {
        assert.ok(existsSync(join(SRC, 'ui', src)), `ui/${f} carrega ${src}, que não existe`);
      }
    }
  });
});

describe('.github/ISSUE_TEMPLATE/adicionar-perfil.yml', () => {
  const yml = ler('.github', 'ISSUE_TEMPLATE', 'adicionar-perfil.yml');
  const campos = Object.fromEntries(
    yml
      .split(/^\s*- type:/m)
      .slice(1)
      .map((bloco) => [/^\s*id:\s*(\S+)/m.exec(bloco)?.[1], /^\s*label:\s*"?(.+?)"?\s*$/m.exec(bloco)?.[1]])
      .filter(([id]) => id)
  );

  it('tem o campo Nome', () => assert.equal(campos.nome, 'Nome'));

  it('tem um campo por plataforma, com o mesmo rótulo que o script lê', () => {
    for (const [id, p] of Object.entries(PLATAFORMAS)) {
      assert.equal(campos[id], p.nome, `o campo "${id}" precisa do label "${p.nome}"`);
    }
  });

  it('usa o rótulo que o workflow aprovar-perfil.yml espera', () => {
    assert.match(yml, /labels:\s*\["novo-perfil"\]/);
    assert.match(ler('.github', 'workflows', 'aprovar-perfil.yml'), /'novo-perfil'/);
  });
});
