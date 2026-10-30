import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lerJson, permissoes, simularExtensao } from './helpers.mjs';

const MANIFEST = {
  content_scripts: [{ matches: ['https://x.com/*', 'https://*.instagram.com/*'] }, { matches: ['https://x.com/*'] }],
  host_permissions: ['https://janonismo.vercel.app/*'],
};
const ORIGENS = ['https://x.com/*', 'https://*.instagram.com/*', 'https://janonismo.vercel.app/*'];

describe('origensNecessarias', () => {
  it('junta os sites dos content scripts e a lista remota, sem repetir', () => {
    assert.deepEqual(permissoes.origensNecessarias(MANIFEST), ORIGENS);
  });

  it('cobre todos os sites do manifest de verdade', () => {
    const manifest = lerJson('src', 'manifest.base.json');
    const origens = permissoes.origensNecessarias(manifest);
    for (const m of manifest.content_scripts.flatMap((cs) => cs.matches)) assert.ok(origens.includes(m), m);
    assert.ok(origens.includes('https://janonismo.vercel.app/*'));
  });
});

describe('faltamPermissoes', () => {
  const CASOS = [
    {
      // O que o Chrome 156 responde de verdade: getAll() lista os sites, mas contains() diz que não.
      caso: 'Chrome: sites liberados aparecem só em getAll()',
      concedidas: ORIGENS,
      contem: () => false,
      faltam: [],
    },
    {
      caso: 'Firefox antes de o usuário liberar: só a lista remota',
      concedidas: ['https://janonismo.vercel.app/*'],
      contem: () => false,
      faltam: ['https://x.com/*', 'https://*.instagram.com/*'],
    },
    {
      caso: 'liberado por um padrão mais amplo (https://*/*)',
      concedidas: ['https://*/*'],
      contem: () => true,
      faltam: [],
    },
    {
      caso: 'falta só um site',
      concedidas: ['https://x.com/*', 'https://janonismo.vercel.app/*'],
      contem: () => false,
      faltam: ['https://*.instagram.com/*'],
    },
  ];
  for (const { caso, concedidas, contem, faltam } of CASOS) {
    it(caso, async () => {
      simularExtensao({ permissoes: { concedidas, contem } });
      assert.deepEqual(await permissoes.faltamPermissoes(ORIGENS), faltam);
    });
  }
});
