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
        'api', 'graphql', 'ajax', 'channel', 'directory', 'qr', 'your_activity',
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
      // Páginas do próprio YouTube, para não confundir com a URL antiga de canal (youtube.com/<nome>).
      reservadas: [
        'watch', 'results', 'feed', 'shorts', 'playlist', 'embed', 'live', 'gaming', 'premium', 'account',
        'signin', 'logout', 'upload', 't', 'about', 'ads', 'creators', 'howyoutubeworks', 'kids', 'trends',
        'hashtag', 'post', 'source', 'attribution_link', 'redirect', 'oembed', 'iframe_api', 's', 'api',
        'youtubei', 'error', 'new', 'supported_browsers', 'verify', 'reporthistory', 'paid_memberships',
        'purchases', 'select_site', 'img', 'tv', 'live_chat', 'clip', 'podcasts', 'courses', 'storefront',
        'movies', 'channels', 'music', 'jobs', 'press', 'copyright', 'yt', 'browse', 'pagead', 'news',
        'sports', 'learning', 'fashion', 'originals', 'playables', 'shopping', 'robots.txt', 'favicon.ico',
      ],
      extrair: (segs) => {
        if (segs[0]?.startsWith('@')) return segs[0].slice(1);
        if (['channel', 'c', 'user'].includes(segs[0])) return segs[1];
        // URL personalizada antiga, que o YouTube ainda serve: youtube.com/<nome> ou youtube.com/<nome>/<aba>.
        // Cai na mesma chave do @handle; colisão entre os dois espaços de nomes é rara e só importa se o
        // nome estiver na lista.
        if (segs.length === 1 || ABAS_YOUTUBE.includes(segs[1])) return segs[0];
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
        if (segs[0] === 'profile.php') return parametro(url, 'id');
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
      // Links de compartilhamento do app (k.kwai.com/u/@fulano/…, kwai-video.com/u/@fulano/…) redirecionam
      // no servidor para kwai.com/@fulano, então o content script não precisa rodar neles. Só são lidos
      // para aceitar esses links colados em sugestões.
      hostsDeLink: ['kwai-video.com'],
      home: 'https://www.kwai.com/',
      extrair: (segs) => arroba(segs[0] === 'u' ? segs.slice(1) : segs),
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

  const ABAS_YOUTUBE = [
    'videos', 'shorts', 'streams', 'featured', 'playlists', 'community', 'about', 'posts', 'live', 'releases',
    'podcasts', 'courses', 'store', 'search', 'channels',
  ];

  function arroba(segs) {
    return segs[0]?.startsWith('@') ? segs[0].slice(1) : null;
  }

  // Parâmetro da query sem diferenciar maiúsculas (URLs copiadas em caixa alta, como as do TSE).
  function parametro(url, nome) {
    return [...url.searchParams].find(([k]) => k.toLowerCase() === nome)?.[1] ?? null;
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
      if ([...p.hosts, ...(p.hostsDeLink ?? [])].some((h) => host === h || host.endsWith('.' + h))) return id;
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
    // Handles não diferenciam maiúsculas; comparar o caminho já em minúsculas faz "/PROFILE.PHP" e "/User/x"
    // funcionarem como "/profile.php" e "/user/x".
    const segs = url.pathname.split('/').filter(Boolean).map(decodificar).map((s) => s.toLowerCase());
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
