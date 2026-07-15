# Correção do deploy pelo GitHub Actions

O workflow anterior usava `cloudflare/wrangler-action@v3`, que tentou instalar o Wrangler 3.90.0 e falhou antes do deploy.

A correção usa o Wrangler já definido no próprio projeto (`4.111.0`):

1. `actions/setup-node@v4` com Node.js 22;
2. `npm ci` para instalar exatamente o `package-lock.json`;
3. `npm run check` para validar os arquivos JavaScript;
4. `npx wrangler deploy` autenticado pelos segredos do GitHub.

Os segredos necessários continuam sendo:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Depois de enviar estes arquivos para a branch `main`, abra:

`Actions → Deploy Cloudflare Worker → Run workflow → Run workflow`
