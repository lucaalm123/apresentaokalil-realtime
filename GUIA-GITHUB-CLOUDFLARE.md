# Guia de publicação pelo navegador — GitHub + Cloudflare

Este método não exige Node.js, terminal ou instalação local.

## Parte 1 — preparar os arquivos

1. Baixe o ZIP entregue pelo ChatGPT.
2. Clique com o botão direito no ZIP e escolha **Extrair tudo**.
3. Abra a pasta extraída.
4. Confirme que estes itens estão diretamente dentro dela:

```text
package.json
package-lock.json
wrangler.jsonc
src/
public/
README.md
```

Não envie o ZIP fechado ao repositório. O GitHub precisa receber os arquivos extraídos.

## Parte 2 — criar o repositório no GitHub

1. Entre em `github.com`.
2. Clique no botão **+** no canto superior direito.
3. Escolha **New repository**.
4. Nome sugerido: `apresentaokalil-realtime`.
5. Marque **Private**.
6. Não marque as opções para criar README, `.gitignore` ou licença.
7. Clique em **Create repository**.

## Parte 3 — enviar os arquivos pelo navegador

1. No repositório vazio, clique em **uploading an existing file**. Se essa opção não aparecer, use **Add file → Upload files**.
2. Abra a pasta extraída no Explorador de Arquivos.
3. Selecione **todos os arquivos e pastas que estão dentro dela**.
4. Arraste a seleção para a página do GitHub.
5. Espere o GitHub terminar de listar os arquivos.
6. Na mensagem do commit, escreva: `Publicação inicial da apresentação`.
7. Selecione **Commit directly to the main branch**.
8. Clique em **Commit changes**.

A raiz do repositório deve mostrar `package.json`, `wrangler.jsonc`, `src` e `public`. Eles não podem ficar escondidos dentro de uma pasta adicional.

## Parte 4 — conectar o repositório ao Worker existente

1. Entre no painel da Cloudflare.
2. Acesse **Workers & Pages**.
3. Abra o Worker **apresentaokalil**.
4. Entre em **Settings → Builds**.
5. Clique em **Connect**.
6. Escolha **GitHub** e autorize a integração.
7. Selecione o repositório `apresentaokalil-realtime`.
8. Use estas configurações:

```text
Production branch: main
Root directory: /
Build command: deixar vazio
Deploy command: npx wrangler deploy
```

9. Para simplificar, habilite builds apenas da branch `main` ou desative deploys de branches de preview.
10. Clique em **Save and Deploy**.

A Cloudflare instalará as dependências e executará o Wrangler nos servidores dela. A migração do Durable Object também será aplicada pelo deploy.

## Parte 5 — validar

Abra primeiro:

```text
https://apresentaokalil.luckphantomhive.workers.dev/api/health
```

A resposta esperada contém:

```json
{
  "ok": true,
  "realtime": "durable-object-websocket"
}
```

Depois teste:

```text
Telão:  https://apresentaokalil.luckphantomhive.workers.dev/
Público: https://apresentaokalil.luckphantomhive.workers.dev/mobile/
Painel:  https://apresentaokalil.luckphantomhive.workers.dev/painel/
```

Abra o telão no computador, o painel em outro celular e a página do público em um terceiro dispositivo. Ao avançar pelo painel, os demais devem acompanhar em tempo real.

## Atualizações futuras

1. Abra o repositório no GitHub.
2. Edite um arquivo pelo ícone de lápis ou use **Add file → Upload files** para substituir arquivos.
3. Confirme o commit na branch `main`.
4. A Cloudflare fará um novo deploy automaticamente.

## Problemas comuns

### A Cloudflare diz que não encontrou `wrangler.jsonc`
Os arquivos foram enviados dentro de uma pasta extra. Mova o conteúdo para a raiz do repositório.

### O build não inicia
Revise se o repositório está conectado em **Settings → Builds** e se a branch de produção é `main`.

### O build falha em `wrangler deploy`
Abra o log completo na aba **Deployments**. Confirme que o Worker conectado se chama `apresentaokalil` e que o repositório possui o `package-lock.json`.

### A rota `/mobile/` redireciona em excesso
Remova regras antigas de Redirect Rules ou Bulk Redirects que apontem `/mobile`, `/mobile/` ou `/mobile.html`. O projeto resolve a rota pela pasta `public/mobile/index.html`.

### A sincronização não funciona
Teste `/api/health`. Se a rota não retornar `durable-object-websocket`, o deploy do Worker não foi concluído e apenas os arquivos estáticos estão ativos.
