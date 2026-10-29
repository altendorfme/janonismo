(function (root) {
  const ns = (root.Janonismo = root.Janonismo || {});

  const PLATAFORMAS = {
    x: {
      nome: 'X / Twitter',
      hosts: ['x.com', 'twitter.com'],
      home: 'https://x.com/home',
      reservadas: [
        'home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search',
        'compose', 'login', 'logout', 'signup', 'tos', 'privacy', 'jobs', 'premium',
        'hashtag', 'intent', 'share', 'account', 'bookmarks', 'communities', 'download',
        'verified-choose', 'about', 'rules',
      ],
      extrair: (segs) => segs[0],
      valido: /^[a-z0-9_]{1,15}$/,
    },
    instagram: {
      nome: 'Instagram',
      hosts: ['instagram.com'],
      home: 'https://www.instagram.com/',
      reservadas: [
        'p', 'reel', 'reels', 'explore', 'accounts', 'direct', 'stories', 'tv', 'about',
        'legal', 'developer', 'web', 'challenge', 'emails', 'privacy', 'session', 'oauth',
        'api', 'graphql', 'ajax',
      ],
      extrair: (segs) => (segs[0] === 'stories' ? segs[1] : segs[0]),
      valido: /^[a-z0-9._]{1,30}$/,
    },
    tiktok: {
      nome: 'TikTok',
      hosts: ['tiktok.com'],
      home: 'https://www.tiktok.com/',
      extrair: arroba,
    },
    youtube: {
      nome: 'YouTube',
      hosts: ['youtube.com'],
      home: 'https://www.youtube.com/',
      extrair: (segs) => {
        if (segs[0]?.startsWith('@')) return segs[0].slice(1);
        if (['channel', 'c', 'user'].includes(segs[0])) return segs[1];
        return null;
      },
    },
    facebook: {
      nome: 'Facebook',
      hosts: ['facebook.com'],
      home: 'https://www.facebook.com/',
      reservadas: [
        'watch', 'groups', 'events', 'marketplace', 'gaming', 'pages', 'photo', 'photo.php',
        'story.php', 'permalink.php', 'reel', 'reels', 'stories', 'friends', 'messages',
        'notifications', 'settings', 'help', 'login', 'login.php', 'share', 'sharer',
        'sharer.php', 'hashtag', 'search', 'bookmarks', 'saved', 'memories', 'home.php',
        'privacy', 'policies', 'ads', 'business', 'checkpoint', 'recover', 'dialog', 'plugins',
      ],
      extrair: (segs, url) => {
        if (segs[0] === 'profile.php') return url.searchParams.get('id');
        if (segs[0] === 'people') return segs[2];
        return segs[0];
      },
    },
    threads: {
      nome: 'Threads',
      hosts: ['threads.net', 'threads.com'],
      home: 'https://www.threads.com/',
      extrair: arroba,
    },
    kwai: {
      nome: 'Kwai',
      hosts: ['kwai.com'],
      home: 'https://www.kwai.com/',
      extrair: arroba,
    },
    truthsocial: {
      nome: 'Truth Social',
      hosts: ['truthsocial.com'],
      home: 'https://truthsocial.com/',
      extrair: arroba,
    },
    gettr: {
      nome: 'GETTR',
      hosts: ['gettr.com'],
      home: 'https://gettr.com/',
      extrair: (segs) => (segs[0] === 'user' ? segs[1] : null),
    },
    rumble: {
      nome: 'Rumble',
      hosts: ['rumble.com'],
      home: 'https://rumble.com/',
      extrair: (segs) => (['c', 'user'].includes(segs[0]) ? segs[1] : null),
    },
    telegram: {
      nome: 'Telegram',
      hosts: ['t.me', 'telegram.me'],
      home: 'https://t.me/',
      reservadas: ['joinchat', 'addstickers', 'addemoji', 'proxy', 'socks', 'share', 'iv', 'contact'],
      extrair: (segs) => (segs[0] === 's' ? segs[1] : segs[0]),
    },
  };

  function arroba(segs) {
    return segs[0]?.startsWith('@') ? segs[0].slice(1) : null;
  }

  // URL com % malformado (ex.: "%E0%A4%A") faz decodeURIComponent lançar; nesse caso usa o texto cru.
  function decodificar(segmento) {
    try {
      return decodeURIComponent(segmento);
    } catch {
      return segmento;
    }
  }

  function normalizarHandle(handle) {
    return String(handle || '').trim().replace(/^@/, '').toLowerCase();
  }

  function plataformaDoHost(host) {
    host = host.toLowerCase().replace(/^(www|m|mobile|web)\./, '');
    for (const [id, p] of Object.entries(PLATAFORMAS)) {
      if (p.hosts.some((h) => host === h || host.endsWith('.' + h))) return id;
    }
    return null;
  }

  function extrairPerfil(href) {
    let url;
    try {
      url = new URL(href);
    } catch {
      return null;
    }
    const plataforma = plataformaDoHost(url.hostname);
    if (!plataforma) return null;

    const regras = PLATAFORMAS[plataforma];
    const segs = url.pathname.split('/').filter(Boolean).map(decodificar);
    const bruto = regras.extrair(segs, url);
    const handle = normalizarHandle(bruto);
    if (!handle || handle.startsWith('+')) return null;
    if (regras.reservadas?.includes(handle)) return null;
    if (regras.valido && !regras.valido.test(handle)) return null;
    return { plataforma, handle };
  }

  function chave(plataforma, handle) {
    return `${plataforma}:${normalizarHandle(handle)}`;
  }

  ns.PLATAFORMAS = PLATAFORMAS;
  ns.extrairPerfil = extrairPerfil;
  ns.normalizarHandle = normalizarHandle;
  ns.chave = chave;
})(globalThis);
