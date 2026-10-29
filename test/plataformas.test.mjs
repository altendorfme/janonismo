import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PLATAFORMAS, chave, extrairPerfil, normalizarHandle } from './helpers.mjs';

// Por plataforma: URL → handle esperado (null = a URL não é de um perfil).
const PERFIS = {
  x: {
    'https://x.com/JairBolsonaro': 'jairbolsonaro',
    'https://x.com/jairbolsonaro/status/123': 'jairbolsonaro',
    'https://twitter.com/fulano': 'fulano',
    'https://mobile.twitter.com/fulano': 'fulano',
    'https://x.com/': null,
    'https://x.com/home': null,
    'https://x.com/i/flow/login': null,
    'https://x.com/nome_com_mais_de_quinze': null,
    'https://x.com/nome-com-hifen': null,
    'https://x.com/%E0%A4%A': null,
  },
  instagram: {
    'https://www.instagram.com/fulano.oficial/': 'fulano.oficial',
    'https://www.instagram.com/stories/fulano/123/': 'fulano',
    'https://www.instagram.com/fulano%2Eoficial/': 'fulano.oficial',
    'https://www.instagram.com/p/abc123/': null,
    'https://www.instagram.com/reel/abc123': null,
    'https://www.instagram.com/explore/': null,
  },
  tiktok: {
    'https://www.tiktok.com/@fulano': 'fulano',
    'https://www.tiktok.com/@fulano/video/1': 'fulano',
    'https://www.tiktok.com/foryou': null,
  },
  youtube: {
    'https://www.youtube.com/@Fulano': 'fulano',
    'https://m.youtube.com/@fulano/videos': 'fulano',
    'https://www.youtube.com/channel/UC8hGUtfEgvvnp6IaHSAg1OQ': 'uc8hgutfegvvnp6iahsag1oq',
    'https://www.youtube.com/c/canal': 'canal',
    'https://www.youtube.com/user/canal': 'canal',
    'https://www.youtube.com/watch?v=abc': null,
  },
  facebook: {
    'https://www.facebook.com/fulano': 'fulano',
    'https://m.facebook.com/fulano': 'fulano',
    'https://www.facebook.com/profile.php?id=1000123': '1000123',
    'https://www.facebook.com/people/Fulano-de-Tal/1000123/': '1000123',
    'https://www.facebook.com/profile.php': null,
    'https://www.facebook.com/watch/?v=1': null,
    'https://www.facebook.com/groups/algum': null,
  },
  threads: {
    'https://www.threads.net/@fulano': 'fulano',
    'https://www.threads.com/@fulano/post/abc': 'fulano',
    'https://www.threads.com/search': null,
  },
  kwai: {
    'https://www.kwai.com/@fulano': 'fulano',
  },
  truthsocial: {
    'https://truthsocial.com/@realDonaldTrump': 'realdonaldtrump',
    'https://truthsocial.com/home': null,
  },
  gettr: {
    'https://gettr.com/user/fulano': 'fulano',
    'https://gettr.com/post/abc': null,
  },
  rumble: {
    'https://rumble.com/c/canal': 'canal',
    'https://rumble.com/user/fulano': 'fulano',
    'https://rumble.com/v123-video.html': null,
  },
  telegram: {
    'https://t.me/canal': 'canal',
    'https://t.me/s/canal': 'canal',
    'https://telegram.me/canal': 'canal',
    'https://t.me/joinchat/abc': null,
    'https://t.me/+abcdef': null,
  },
};

const FORA_DAS_PLATAFORMAS = [
  'https://example.com/fulano',
  'https://notx.com/fulano',
  'https://x.com.evil.example/fulano',
  'não é url',
];

describe('extrairPerfil', () => {
  for (const [plataforma, casos] of Object.entries(PERFIS)) {
    describe(plataforma, () => {
      for (const [url, handle] of Object.entries(casos)) {
        it(`${url} → ${handle}`, () => assert.deepEqual(extrairPerfil(url), handle && { plataforma, handle }));
      }
    });
  }

  describe('fora das plataformas', () => {
    for (const url of FORA_DAS_PLATAFORMAS) it(url, () => assert.equal(extrairPerfil(url), null));
  });

  it('toda plataforma tem casos de teste', () => {
    assert.deepEqual(Object.keys(PERFIS).sort(), Object.keys(PLATAFORMAS).sort());
  });

  for (const [id, { home }] of Object.entries(PLATAFORMAS)) {
    it(`a home do ${id} (${home}) não é perfil`, () => assert.equal(extrairPerfil(home), null));
  }
});

describe('normalizarHandle', () => {
  for (const [entrada, saida] of [
    ['  @FuLaNo ', 'fulano'],
    ['fulano.oficial', 'fulano.oficial'],
    ['', ''],
    [null, ''],
    [undefined, ''],
  ]) {
    it(`${JSON.stringify(entrada)} → "${saida}"`, () => assert.equal(normalizarHandle(entrada), saida));
  }
});

describe('chave', () => {
  it('junta plataforma e handle normalizado', () => assert.equal(chave('x', '@Fulano'), 'x:fulano'));
});
