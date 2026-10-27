# Política de privacidade — Janonismo

*Última atualização: 27 de outubro de 2026*

O Janonismo é uma extensão de navegador que mostra um aviso quando você abre o perfil de alguém que está
na lista de perfis da extensão. Esta política explica quais dados a extensão usa e o que acontece com eles.

## Resumo

- A extensão **não coleta, não vende e não compartilha** dados pessoais.
- Não há cadastro, login, cookies próprios, analytics, rastreamento nem anúncios.
- Tudo o que a extensão guarda fica **no seu navegador** (`chrome.storage.local`) e nunca é enviado para nós
  nem para terceiros.

## O que a extensão lê

Nas redes sociais suportadas (X/Twitter, Instagram, TikTok, YouTube, Facebook, Threads, Kwai, Truth Social,
Gettr, Rumble e Telegram), a extensão lê **apenas o endereço (URL) da página aberta** para descobrir de qual
perfil ela é e comparar com a lista. Essa comparação acontece localmente, no seu navegador. A extensão não lê
mensagens, publicações, senhas, formulários nem qualquer outro conteúdo da página, e não registra seu
histórico de navegação.

## O que a extensão guarda no seu navegador

| Dado | Para quê |
|---|---|
| Configurações (extensão ligada/desligada, URL da lista remota) | Manter suas preferências |
| Cópia da lista remota de perfis e a data/erro da última atualização | Funcionar mesmo sem internet |
| Perfis que você adicionou ou desmarcou | Personalizar a lista |
| Um contador de quantas vezes o aviso apareceu | Exibir o número no popup |

Esses dados ficam só no seu dispositivo. O contador é um número total, sem indicar quais perfis ou quando.
Desinstalar a extensão apaga tudo.

## Comunicação com a internet

A única requisição de rede que a extensão faz é baixar a lista pública de perfis, por padrão em
`https://janonismo.vercel.app/lista.json`, ao ser instalada, a cada 6 horas e quando você clica em
"Atualizar". É um download comum de um arquivo JSON: a extensão não envia nenhum dado seu nessa requisição.
Como em qualquer acesso a um site, o servidor de hospedagem (Vercel) pode registrar dados técnicos como
endereço IP e user agent nos logs dele, conforme a
[política de privacidade da Vercel](https://vercel.com/legal/privacy-policy). Nós não usamos esses logs para
identificar ninguém.

Se você trocar a URL da lista em *Configurações*, a extensão pede permissão para acessar aquele endereço e
passa a baixar a lista de lá. Nesse caso, vale a política do site que você escolheu.

## Código remoto

A extensão não baixa nem executa código remoto. A lista é só dados (nomes e nomes de usuário); todo o código
vem dentro do pacote publicado na loja.

## Mudanças nesta política

Se esta política mudar, a nova versão será publicada neste mesmo endereço, com a data de atualização no topo.

## Contato

Dúvidas ou pedidos: abra uma issue em <https://github.com/altendorfme/janonismo/issues>.
