# Janonismo

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/ocoaoegendhaggfciobaddpffdlaanog?label=Chrome%20Web%20Store&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/janonismo-%E2%80%94-n%C3%A3o-engaje-a/ocoaoegendhaggfciobaddpffdlaanog)
[![Usuários](https://img.shields.io/chrome-web-store/users/ocoaoegendhaggfciobaddpffdlaanog?label=usu%C3%A1rios)](https://chromewebstore.google.com/detail/janonismo-%E2%80%94-n%C3%A3o-engaje-a/ocoaoegendhaggfciobaddpffdlaanog)
[![Avaliação](https://img.shields.io/chrome-web-store/rating/ocoaoegendhaggfciobaddpffdlaanog?label=avalia%C3%A7%C3%A3o)](https://chromewebstore.google.com/detail/janonismo-%E2%80%94-n%C3%A3o-engaje-a/ocoaoegendhaggfciobaddpffdlaanog)

**[Instalar no Chrome](https://chromewebstore.google.com/detail/janonismo-%E2%80%94-n%C3%A3o-engaje-a/ocoaoegendhaggfciobaddpffdlaanog)**

## Build

| Comando | O que faz |
|---|---|
| `npm run build` | gera `dist/chrome`, `dist/firefox` e os `.zip` para as lojas |
| `npm test` | roda os testes (`node --test`, sem dependências) |
| `npm run lint` | build + `web-ext lint` do pacote Firefox |
| `npm run firefox` | abre um Firefox temporário com a extensão |

Sem dependências: só precisa de Node 22+. Com a variável `VERSAO` (ex.: `VERSAO=1.2.0 npm run build`)
o build usa essa versão no manifest no lugar da do `src/manifest.base.json`.

### Testes e CI

Os testes ficam em `test/` e usam só o `node:test`:

- `plataformas.test.mjs`: quais URLs viram perfil (e quais não viram) em cada rede.
- `lista.test.mjs`: junção da lista embutida, da remota, dos extras e dos removidos, e como a extensão se
  comporta quando o download da lista remota falha (com um `chrome.storage` simulado).
- `aplicar-issue.test.mjs`: leitura das issues de sugestão e o que o script devolve para o workflow.
- `dados.test.mjs`: `lista.json` válida e sem duplicados, e manifest, plataformas e formulário da issue
  coerentes entre si.
- `helpers.mjs`: o que os testes compartilham (`simularExtensao`, `corpoIssue`, `contas`…).

Os casos ficam em tabelas: para cobrir um caso novo, normalmente basta acrescentar uma linha.

Um teste pode ser marcado com `{ todo: 'motivo' }` para registrar um bug conhecido: ele aparece no relatório,
mas não quebra o CI. Quando o bug for corrigido, tire o `todo`.

O workflow **Pacotes** roda os testes (Node 22 e 24) em todo push e PR, e só depois gera e valida os pacotes.
Em tags `v*` ele também publica a release. O **Aprovar perfil** roda os testes antes de gravar a
`lista.json`, então uma sugestão que deixaria a lista inválida não entra. As actions estão fixadas por SHA,
e o Dependabot abre PRs mensais para atualizá-las.

## Instalar em modo desenvolvedor

- **Chrome / Edge:** `chrome://extensions` (ou `edge://extensions`) → ativar *Modo do desenvolvedor* →
  *Carregar sem compactação* → escolher `dist/chrome`.
- **Firefox (142+):** `about:debugging#/runtime/this-firefox` → *Carregar extensão temporária* →
  escolher `dist/firefox/manifest.json`. Se o popup mostrar "Permitir", clique para liberar o acesso às redes.

## A lista

Lista efetiva = lista remota (ou `src/data/lista.json`, a embutida, enquanto nenhuma lista remota foi baixada)
\+ perfis que o usuário adicionou − perfis que o usuário desmarcou. Tudo é editável em *Configurações*.
Como a lista remota substitui a embutida, tirar um perfil do `lista.json` tira ele de todas as extensões
no próximo download, sem precisar publicar uma versão nova.

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