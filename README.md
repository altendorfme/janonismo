# Janonismo

## Build

| Comando | O que faz |
|---|---|
| `npm run build` | gera `dist/chrome`, `dist/firefox` e os `.zip` para as lojas |
| `npm run lint` | build + `web-ext lint` do pacote Firefox |
| `npm run firefox` | abre um Firefox temporário com a extensão |

Sem dependências: só precisa de Node 22+. Com a variável `VERSAO` (ex.: `VERSAO=1.2.0 npm run build`)
o build usa essa versão no manifest no lugar da do `src/manifest.base.json`.

## Instalar em modo desenvolvedor

- **Chrome / Edge:** `chrome://extensions` (ou `edge://extensions`) → ativar *Modo do desenvolvedor* →
  *Carregar sem compactação* → escolher `dist/chrome`.
- **Firefox (142+):** `about:debugging#/runtime/this-firefox` → *Carregar extensão temporária* →
  escolher `dist/firefox/manifest.json`. Se o popup mostrar "Permitir", clique para liberar o acesso às redes.

## A lista

Lista efetiva = `src/data/lista.json` (embutida) + lista remota + perfis que o usuário adicionou −
perfis que o usuário desmarcou. Tudo é editável em *Configurações*.

```json
{
  "versao": 1,
  "atualizado": "2026-10-27",
  "perfis": [
    { "nome": "Fulano", "x": ["fulano"], "instagram": ["fulano.oficial"], "tiktok": ["fulano"] }
  ]
}
```

Chaves de plataforma: `x`, `instagram`, `tiktok`, `youtube`, `facebook`, `threads`, `kwai`,
`truthsocial`, `gettr`, `rumble`, `telegram`. O handle vai sem `@` e não diferencia maiúsculas.
No YouTube vale o `@handle` ou o ID do canal (`UC…`); no Facebook, o nome de usuário ou o `id` numérico.

### Lista remota (Vercel)

Este mesmo repositório é publicado na Vercel. O `vercel.json` copia `src/data/lista.json` para
`https://janonismo.vercel.app/lista.json` (com CORS liberado e cache de 5 minutos) e redireciona a raiz
para o GitHub. Não há nada para configurar na Vercel além de importar o repositório: o comando de build
e a pasta de saída já vêm do `vercel.json`. Cada push na `main` gera um deploy novo.

A extensão baixa essa lista a cada 6 horas e, se o download falhar ou o JSON vier quebrado, mantém a
última versão boa. O endereço está em `URL_REMOTA_PADRAO` (`src/shared/lista.js`) e em `host_permissions`
(`src/manifest.base.json`); se mudar, mude nos dois. Cada usuário pode trocar ou apagar a URL em
*Configurações*.

### Sugerir perfis por issue

1. Quem quiser sugerir abre uma issue com o formulário **Adicionar perfil à lista**
   (`.github/ISSUE_TEMPLATE/adicionar-perfil.yml`), que já entra com o rótulo `novo-perfil`.
2. Alguém da equipe avalia e aplica o rótulo `aprovado`.