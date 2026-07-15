# Correção do erro `Exit handler never called!`

Esta versão não executa `npm ci`, `npm install` nem `npx` no GitHub Actions.

O workflow usa:

1. Node.js 22;
2. `pnpm/action-setup@v4`;
3. validação dos arquivos JavaScript com `node --check`;
4. `pnpm dlx wrangler@4.111.0 deploy` para publicar o Worker.

## Atualização no GitHub

Envie o conteúdo desta pasta para a raiz do repositório, substituindo os arquivos existentes. Confirme especialmente a substituição de:

- `.github/workflows/deploy.yml`
- `package.json`

Exclua do repositório o arquivo antigo `package-lock.json`.

Faça o commit diretamente na branch `main`. Uma nova execução será iniciada automaticamente.

## Etapas esperadas

- Checkout repository
- Install pnpm
- Use Node.js 22
- Validate JavaScript
- Deploy Worker without npm install

O workflow não deve mais mostrar `Run npm ci` ou `Install project dependencies`.
