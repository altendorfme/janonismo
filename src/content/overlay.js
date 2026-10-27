(function (root) {
  const ns = (root.Janonismo = root.Janonismo || {});

  const FONTES = [
    { familia: 'Janonismo Condensada', arquivo: 'barlow-condensed-800.woff2', peso: '800' },
    { familia: 'Janonismo Condensada', arquivo: 'barlow-condensed-600.woff2', peso: '600' },
    { familia: 'Janonismo Texto', arquivo: 'barlow-500.woff2', peso: '500' },
  ];

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; }

    .tela {
      --preto: #0b0d12;
      --vermelho: #e0201b;
      --vermelho-escuro: #a3120f;
      --papel: #f4f1ea;
      --amarelo: #ffc629;
      --margem: clamp(16px, 5vw, 72px);
      --faixa: clamp(64px, 13vh, 132px);
      --entra: cubic-bezier(.16, 1, .3, 1);
      --sai: cubic-bezier(.7, 0, .84, 0);

      position: fixed; inset: 0; z-index: 2147483647;
      display: grid; grid-template-rows: auto 1fr auto; padding-bottom: clamp(16px, 4vh, 40px); grid-template-columns: minmax(0, 1fr);
      color: var(--papel);
      background: rgba(8, 9, 12, .9);
      backdrop-filter: grayscale(1) brightness(.55) blur(3px);
      -webkit-backdrop-filter: grayscale(1) brightness(.55) blur(3px);
      font: 500 16px/1.35 "Janonismo Texto", "Barlow", system-ui, sans-serif;
      overflow: hidden;
      animation: escurecer .22s ease-out both;
    }
    ::selection { background: var(--amarelo); color: var(--preto); }

    .topo {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      padding: clamp(14px, 3vh, 32px) var(--margem) 0;
      font: 600 clamp(13px, 1.3vw, 17px)/1 "Janonismo Condensada", "Barlow Condensed", "Arial Narrow", sans-serif;
      letter-spacing: .08em; text-transform: uppercase;
      animation: surgir .5s .55s var(--entra) both;
    }
    .canal { display: flex; align-items: center; gap: 12px; }
    .marca { color: var(--papel); }
    .ao-vivo {
      display: inline-flex; align-items: center; gap: 7px;
      background: var(--vermelho); color: #fff; padding: 6px 10px 5px;
    }
    .ao-vivo i {
      width: 8px; height: 8px; border-radius: 50%; background: #fff;
      animation: piscar 1s steps(1) infinite;
    }
    .relogio {
      font-variant-numeric: tabular-nums; letter-spacing: .04em;
      color: var(--papel); padding: 6px 10px 5px; border: 1px solid rgba(244,241,234,.35);
    }

    .palco { position: relative; min-height: 0; }
    .faixa {
      position: absolute; left: 0; right: 0; bottom: 0; height: var(--faixa);
      background: var(--vermelho);
      display: flex; align-items: center; justify-content: flex-end;
      padding: 0 var(--margem);
      overflow: hidden;
      clip-path: inset(0 100% 0 0);
      animation: abrir-faixa .55s .18s var(--entra) forwards;
    }
    .faixa::before {
      content: ""; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--papel); opacity: .9;
    }
    .plantao {
      font: 800 calc(var(--faixa) * .78)/.8 "Janonismo Condensada", "Barlow Condensed", "Arial Narrow", sans-serif;
      letter-spacing: -.01em; text-transform: uppercase; color: #fff;
      transform: translateY(105%);
      animation: subir .5s .38s var(--entra) forwards;
    }
    .janela {
      position: absolute; left: var(--margem); bottom: 0;
      height: min(calc(100% - 12px), 58vh); aspect-ratio: 1;
      background: #000;
      outline: 1px solid rgba(244,241,234,.6); outline-offset: -1px;
      box-shadow: 0 30px 70px rgba(0,0,0,.55);
      animation: corte .28s .62s steps(1, end) both, assentar .5s .62s var(--entra) both;
    }
    .janela img { display: block; width: 100%; height: 100%; object-fit: cover; }

    .terco {
      --respiro: clamp(16px, 2.4vw, 32px);
      display: grid; grid-template-columns: minmax(0, 1fr) auto;
      margin: 0 var(--margem);
      background: var(--papel); color: var(--preto);
      clip-path: inset(0 100% 0 0);
      animation: abrir-faixa .55s .48s var(--entra) forwards;
    }
    .manchete { padding: clamp(14px, 2.4vh, 26px) var(--respiro) clamp(14px, 2.4vh, 26px); min-width: 0; }
    h1 {
      font: 800 clamp(30px, 5.4vw, 88px)/.9 "Janonismo Condensada", "Barlow Condensed", "Arial Narrow", sans-serif;
      letter-spacing: -.015em; text-transform: uppercase; text-wrap: balance;
    }
    h1 .pare { color: var(--vermelho); }
    .perfil {
      grid-column: 1 / -1;
      padding: 9px var(--respiro) 8px;
      background: #1a1d24; color: rgba(244,241,234,.78);
      font-size: clamp(14px, 1.2vw, 17px);
      overflow-wrap: anywhere;
    }
    .perfil strong { color: var(--papel); font-weight: 500; text-decoration: underline; text-decoration-color: var(--vermelho); text-decoration-thickness: 2px; text-underline-offset: 3px; }

    .voltar {
      all: unset; box-sizing: border-box; cursor: pointer;
      align-self: end; justify-self: end;
      margin: 0 var(--respiro) clamp(14px, 2.4vh, 26px) 0;
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 16px clamp(18px, 1.8vw, 26px) 15px;
      background: var(--preto); color: var(--papel);
      font: 600 clamp(17px, 1.5vw, 22px)/1.05 "Janonismo Condensada", "Barlow Condensed", "Arial Narrow", sans-serif;
      letter-spacing: .03em; text-transform: uppercase; white-space: nowrap;
      transition: background-color .18s ease-out, color .18s ease-out;
    }
    .voltar svg { width: 1.2em; height: 1.2em; flex: none; transition: transform .25s var(--entra); }
    .voltar:hover { background: var(--vermelho); color: #fff; }
    .voltar:hover svg { transform: translateX(-5px); }
    .voltar:focus-visible { outline: 3px solid var(--vermelho); outline-offset: 3px; }
    .voltar:active { background: var(--vermelho-escuro); }

    .tela.saindo { animation: apagar .34s .12s var(--sai) forwards; }
    .saindo .janela, .saindo .topo { animation: sumir .18s var(--sai) forwards; }
    .saindo .faixa, .saindo .terco { animation: fechar-faixa .3s var(--sai) forwards; }

    @keyframes escurecer { from { background-color: rgba(8,9,12,0); backdrop-filter: none; } }
    @keyframes apagar { to { opacity: 0; } }
    @keyframes abrir-faixa { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
    @keyframes fechar-faixa { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 0 0 100%); } }
    @keyframes subir { to { transform: none; } }
    @keyframes surgir { from { opacity: 0; transform: translateY(8px); } }
    @keyframes sumir { to { opacity: 0; } }
    @keyframes corte { from { opacity: 0; } }
    @keyframes assentar { from { transform: scale(1.06); } }
    @keyframes piscar { 50% { opacity: 0; } }

    @media (max-width: 720px), (max-aspect-ratio: 4/5) {
      .tela { --faixa: clamp(56px, 9vh, 88px); }
      .janela {
        left: 50%; translate: -50% 0; bottom: var(--faixa);
        height: min(calc(100% - var(--faixa) - 16px), 78vw);
        box-shadow: none;
      }
      .faixa { justify-content: center; }
      .terco { grid-template-columns: minmax(0, 1fr); }
      .manchete { padding-bottom: 14px; }
      .voltar { justify-self: stretch; margin: 0 var(--respiro) var(--respiro); padding: 17px 20px 16px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 1ms !important; animation-delay: 0ms !important; transition: none !important; }
      .ao-vivo i { animation: none !important; }
    }
  `;

  function seta() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [k, v] of Object.entries({
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2.4', 'stroke-linecap': 'square', 'aria-hidden': 'true',
    })) svg.setAttribute(k, v);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20 12H5M11 5l-7 7 7 7');
    svg.append(path);
    return svg;
  }

  let host = null;
  let tela = null;
  let pausador = null;
  let relogio = null;
  let overflowAnterior = '';
  let fontesCarregadas = null;

  function carregarFontes() {
    fontesCarregadas ??= Promise.all(
      FONTES.map(async ({ familia, arquivo, peso }) => {
        const bytes = await fetch(chrome.runtime.getURL(`assets/fonts/${arquivo}`)).then((r) => r.arrayBuffer());
        const fonte = new FontFace(familia, bytes, { weight: peso });
        await fonte.load();
        document.fonts.add(fonte);
      })
    ).catch(() => {});
    return fontesCarregadas;
  }

  function el(tag, attrs = {}, filhos = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'texto') e.textContent = v;
      else e.setAttribute(k, v);
    }
    for (const f of filhos) e.append(f);
    return e;
  }

  function pausarMidia() {
    for (const m of document.querySelectorAll('video, audio')) {
      if (!m.paused) m.pause();
    }
  }

  function horaAgora() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function mostrar({ nome, handle, plataforma, onVoltar }) {
    esconder();
    carregarFontes();

    const rede = ns.PLATAFORMAS[plataforma].nome;
    host = el('janonismo-alerta');
    const sombra = host.attachShadow({ mode: 'closed' });

    const horario = el('span', { class: 'relogio', texto: horaAgora(), 'aria-hidden': 'true' });
    const topo = el('div', { class: 'topo' }, [
      el('div', { class: 'canal' }, [
        el('span', { class: 'marca', texto: 'Janonismo' }),
        el('span', { class: 'ao-vivo' }, [el('i'), 'Ao vivo']),
      ]),
      horario,
    ]);

    const img = el('img', { src: chrome.runtime.getURL('assets/janones.gif'), alt: 'Janones gritando para você parar' });
    img.addEventListener('error', () => {
      img.src = chrome.runtime.getURL('assets/placeholder.svg');
    }, { once: true });
    const palco = el('div', { class: 'palco' }, [
      el('div', { class: 'faixa' }, [el('span', { class: 'plantao', texto: 'Janonismo', 'aria-hidden': 'true' })]),
      el('div', { class: 'janela' }, [img]),
    ]);

    const voltar = el('button', { class: 'voltar', type: 'button' }, [
      seta(),
      el('span', { texto: 'Voltar à programação normal' }),
    ]);
    const titulo = el('h1', { id: 'janonismo-titulo' }, [
      el('span', { class: 'pare', texto: 'PARE!' }),
      ' Não engaje a extrema direita!',
    ]);
    const perfil = el('p', { class: 'perfil', id: 'janonismo-perfil' }, [
      'Você ia abrir o perfil de ',
      el('strong', { texto: nome }),
      ` · @${handle} no ${rede}`,
    ]);
    const terco = el('div', { class: 'terco' }, [el('div', { class: 'manchete' }, [titulo]), voltar, perfil]);

    tela = el('div', {
      class: 'tela',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'janonismo-titulo',
      'aria-describedby': 'janonismo-perfil',
    }, [topo, palco, terco]);

    let saindo = false;
    const sair = () => {
      if (saindo) return;
      saindo = true;
      const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
      tela.classList.add('saindo');
      setTimeout(onVoltar, reduzido ? 0 : 380);
    };
    voltar.addEventListener('click', sair);
    tela.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') sair();
      if (e.key === 'Tab') {
        e.preventDefault();
        voltar.focus();
      }
    });

    sombra.append(el('style', { texto: CSS }), tela);
    document.documentElement.append(host);

    relogio = setInterval(() => {
      horario.textContent = horaAgora();
    }, 1000);

    overflowAnterior = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    pausarMidia();
    pausador = setInterval(pausarMidia, 300);
    voltar.focus({ preventScroll: true });
  }

  function esconder() {
    if (!host) return;
    clearInterval(pausador);
    clearInterval(relogio);
    host.remove();
    host = null;
    tela = null;
    document.documentElement.style.overflow = overflowAnterior;
  }

  function visivel() {
    return !!host?.isConnected;
  }

  ns.overlay = { mostrar, esconder, visivel };
})(globalThis);
