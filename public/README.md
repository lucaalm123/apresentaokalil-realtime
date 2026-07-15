# Questões Práticas do Direito de Contratos — V7

## Rotas

- `/` — telão principal;
- `/mobile/` — conteúdo complementar, enquetes e perguntas;
- `/painel/` — controle, QR Code, enquetes, perguntas e notas privadas.

## Cloudflare Workers Static Assets

O pacote utiliza páginas em diretórios (`mobile/index.html` e
`painel/index.html`) e não utiliza `_redirects`. Isso evita conflito entre
regras personalizadas e a normalização automática de URLs HTML.

O QR Code aponta para:

`https://apresentaokalil.luckphantomhive.workers.dev/mobile/`

## Sincronização atual

A sincronização local utiliza `localStorage` e `BroadcastChannel`. Para testar,
abra o telão, `/mobile/` e `/painel/` em abas do mesmo navegador.

A participação simultânea por celulares diferentes exige a futura camada de
backend descrita em `docs/FUTURE-REALTIME.md`.
