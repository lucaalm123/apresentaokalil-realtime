# Apresentação Kalil — contratos, Visual Law e governança

Aplicação para Cloudflare Workers com:

- apresentação principal em `/`;
- página do público em `/mobile/`;
- painel do apresentador em `/painel/`;
- sincronização em tempo real por WebSocket;
- Durable Object para estado compartilhado;
- enquetes e perguntas do público;
- controle remoto dos slides pelo painel.

## Publicação sem Node.js no computador

A publicação deve ser feita por **GitHub + Cloudflare Workers Builds**.

Leia primeiro: [`GUIA-GITHUB-CLOUDFLARE.md`](./GUIA-GITHUB-CLOUDFLARE.md).

## Configuração esperada no Cloudflare

- Worker: `apresentaokalil`
- Branch de produção: `main`
- Diretório raiz: `/`
- Build command: vazio
- Deploy command: `npx wrangler deploy`

O projeto contém `package.json`, `package-lock.json` e `wrangler.jsonc` na raiz. A Cloudflare instala o Wrangler e executa a publicação em seus próprios servidores.

## Rotas

- `https://apresentaokalil.luckphantomhive.workers.dev/`
- `https://apresentaokalil.luckphantomhive.workers.dev/mobile/`
- `https://apresentaokalil.luckphantomhive.workers.dev/painel/`
- `https://apresentaokalil.luckphantomhive.workers.dev/api/health`

## Deploy V10.8 — sem npm ci

Se o GitHub Actions apresentou `npm error Exit handler never called!`, use o workflow desta versão. Ele não executa `npm ci`; a publicação é feita com `pnpm dlx wrangler@4.111.0 deploy`.
