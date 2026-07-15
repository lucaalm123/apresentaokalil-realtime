# Publicação sem conectar o repositório no painel da Cloudflare

Este projeto usa **GitHub Actions** para publicar o Worker. Assim, não é necessário usar a tela **Settings → Builds → Connect** da Cloudflare e não é necessário instalar Node.js no computador.

## 1. Envie os arquivos ao GitHub

Na raiz do repositório devem aparecer diretamente:

- `.github/`
- `public/`
- `src/`
- `package.json`
- `package-lock.json`
- `wrangler.jsonc`

## 2. Crie o token na Cloudflare

1. Abra **My Profile → API Tokens**.
2. Clique em **Create Token**.
3. Use a permissão **Edit Cloudflare Workers**.
4. Restrinja o token à conta em que está o Worker `apresentaokalil`.
5. Copie o token. Ele será mostrado apenas uma vez.

## 3. Copie o Account ID

No painel da conta Cloudflare, copie o **Account ID**.

## 4. Cadastre os segredos no GitHub

No repositório:

**Settings → Secrets and variables → Actions → New repository secret**

Crie:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Nunca salve esses valores em arquivos do repositório.

## 5. Publique

Abra:

**Actions → Deploy Cloudflare Worker → Run workflow → Run workflow**

Novos commits enviados à branch `main` também publicarão automaticamente.

## 6. Validação

Abra:

- `https://apresentaokalil.luckphantomhive.workers.dev/api/health`
- `https://apresentaokalil.luckphantomhive.workers.dev/`
- `https://apresentaokalil.luckphantomhive.workers.dev/mobile/`
- `https://apresentaokalil.luckphantomhive.workers.dev/painel/`

A rota `/api/health` deve indicar `durable-object-websocket`.
