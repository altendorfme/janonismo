import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

await import('../src/shared/plataformas.js');
const { extrairPerfil, normalizarHandle, chave, PLATAFORMAS } = globalThis.Janonismo;

// [url, plataforma esperada, handle esperado] — plataforma null = não é perfil.
const CASOS = [
  // X / Twitter
  ['https://x.com/JairBolsonaro', 'x', 'jairbolsonaro'],
  ['https://x.com/jairbolsonaro/status/123', 'x', 'jairbolsonaro'],
  ['https://twitter.com/fulano', 'x', 'fulano'],
  ['https://mobile.twitter.com/fulano', 'x', 'fulano'],
  ['https://x.com/', null],
  ['https://x.com/home', null],
  ['https://x.com/i/flow/login', null],
  ['https://x.com/nome_com_mais_de_quinze', null],
  ['https://x.com/nome-com-hifen', null],

  // Instagram
  ['https://www.instagram.com/fulano.oficial/', 'instagram', 'fulano.oficial'],
  ['https://www.instagram.com/stories/fulano/123/', 'instagram', 'fulano'],
  ['https://www.instagram.com/fulano%2Eoficial/', 'instagram', 'fulano.oficial'],
  ['https://www.instagram.com/p/abc123/', null],
  ['https://www.instagram.com/reel/abc123', null],
  ['https://www.instagram.com/explore/', null],

  // TikTok
  ['https://www.tiktok.com/@fulano', 'tiktok', 'fulano'],
  ['https://www.tiktok.com/@fulano/video/1', 'tiktok', 'fulano'],
  ['https://www.tiktok.com/foryou', null],

  // YouTube
  ['https://www.youtube.com/@Fulano', 'youtube', 'fulano'],
  ['https://m.youtube.com/@fulano/videos', 'youtube', 'fulano'],
  ['https://www.youtube.com/channel/UC8hGUtfEgvvnp6IaHSAg1OQ', 'youtube', 'uc8hgutfegvvnp6iahsag1oq'],
  ['https://www.youtube.com/c/canal', 'youtube', 'canal'],
  ['https://www.youtube.com/user/canal', 'youtube', 'canal'],
  ['https://www.youtube.com/watch?v=abc', null],
  ['https://www.youtube.com/', null],

  // Facebook
  ['https://www.facebook.com/fulano', 'facebook', 'fulano'],
  ['https://m.facebook.com/fulano', 'facebook', 'fulano'],
  ['https://www.facebook.com/profile.php?id=1000123', 'facebook', '1000123'],
  ['https://www.facebook.com/people/Fulano-de-Tal/1000123/', 'facebook', '1000123'],
  ['https://www.facebook.com/watch/?v=1', null],
  ['https://www.facebook.com/groups/algum', null],
  ['https://www.facebook.com/profile.php', null],

  // Threads
  ['https://www.threads.net/@fulano', 'threads', 'fulano'],
  ['https://www.threads.com/@fulano/post/abc', 'threads', 'fulano'],
  ['https://www.threads.com/search', null],

  // Kwai, Truth Social
  ['https://www.kwai.com/@fulano', 'kwai', 'fulano'],
  ['https://truthsocial.com/@realDonaldTrump', 'truthsocial', 'realdonaldtrump'],
  ['https://truthsocial.com/home', null],

  // GETTR
  ['https://gettr.com/user/fulano', 'gettr', 'fulano'],
  ['https://gettr.com/post/abc', null],

  // Rumble
  ['https://rumble.com/c/canal', 'rumble', 'canal'],
  ['https://rumble.com/user/fulano', 'rumble', 'fulano'],
  ['https://rumble.com/v123-video.html', null],

  // Telegram
  ['https://t.me/canal', 'telegram', 'canal'],
  ['https://t.me/s/canal', 'telegram', 'canal'],
  ['https://telegram.me/canal', 'telegram', 'canal'],
  ['https://t.me/joinchat/abc', null],
  ['https://t.me/+abcdef', null],

  // Fora das plataformas
  ['https://example.com/fulano', null],
  ['https://notx.com/fulano', null],
  ['https://x.com.evil.example/fulano', null],
  ['não é url', null],
];

describe('extrairPerfil', () => {
  for (const [url, plataforma, handle] of CASOS) {
    it(`${url} → ${plataforma ? `${plataforma}:${handle}` : 'null'}`, () => {
      assert.deepEqual(extrairPerfil(url), plataforma ? { plataforma, handle } : null);
    });
  }

  it('não lança com % malformado na URL', { todo: 'decodeURIComponent lança URIError' }, () => {
    assert.equal(extrairPerfil('https://x.com/%E0%A4%A'), null);
  });
});

describe('normalizarHandle', () => {
  it('tira @, espaços e maiúsculas', () => assert.equal(normalizarHandle('  @FuLaNo '), 'fulano'));
  it('aceita vazio e nulo', () => {
    assert.equal(normalizarHandle(''), '');
    assert.equal(normalizarHandle(null), '');
    assert.equal(normalizarHandle(undefined), '');
  });
});

describe('chave', () => {
  it('junta plataforma e handle normalizado', () => assert.equal(chave('x', '@Fulano'), 'x:fulano'));
});

describe('PLATAFORMAS', () => {
  for (const [id, p] of Object.entries(PLATAFORMAS)) {
    it(`${id} tem nome, hosts, home e extrair`, () => {
      assert.equal(typeof p.nome, 'string');
      assert.ok(p.hosts.length > 0);
      assert.ok(new URL(p.home).protocol === 'https:');
      assert.equal(typeof p.extrair, 'function');
      assert.equal(extrairPerfil(p.home), null, 'a home não pode ser reconhecida como perfil');
    });
  }
});
