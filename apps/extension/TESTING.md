# Guia de Teste e Publicação (MCP Product)

Este guia cobre como testar seu servidor MCP localmente e como publicá-lo para o mundo.

---

## 🧪 1. Como Testar (Claude Desktop)

O jeito mais fácil de testar o "cérebro" do CodeGuard é conectá-lo ao **Claude Desktop App**.

### Passo 1: Configurar
Localize o arquivo de configuração do Claude:
*   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
*   **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Se o arquivo não existir, crie-o. Adicione o seguinte conteúdo:

```json
{
  "mcpServers": {
    "codeguard": {
      "command": "node",
      "args": [
        "YOUR_PROJECT_PATH/dist/mcp-server.js"
      ],
      "env": {
        "SILICONFLOW_API_KEY": "sua-chave-aqui",
        "KIMI_API_KEY": "sua-chave-aqui",
        "OPENAI_API_KEY": "sua-chave-aqui"
      }
    }
  }
}
```
*Substitua `YOUR_PROJECT_PATH` pelo caminho absoluto da pasta do projeto.*

*Nota: Se você já preencheu o `.env` no projeto, o servidor vai ler de lá automaticamente (graças ao `dotenv`), então o bloco `"env"` acima é opcional, mas recomendado.*

### Passo 2: Rodar
1.  Abra o terminal na pasta do projeto.
2.  Compile o código:
    ```bash
    npm run compile
    ```
3.  Reinicie o **Claude Desktop**.
4.  Você verá um ícone de "Tomada" (🔌) indicando que o MCP foi carregado.

### Passo 3: Usar
Fale com o Claude:
> "Por favor, faça um audit de compliance no projeto atual verificando riscos de LGPD."

O Claude vai usar a tool `codeguard_audit` automaticamente e responder com o relatório gerado pelo seu plugin.

---

## 🚀 2. Como Publicar (MCP Stores)

O ecossistema MCP é novo, não existe uma "App Store" única, mas sim diretórios e plataformas.

### Opção A: Smithery (Deployment Automático)
O **Smithery** é a plataforma "Heroku para MCP".
1.  Comite e dê Push do seu código para o GitHub.
2.  Vá em [smithery.ai](https://smithery.ai).
3.  Conecte seu GitHub e selecione o repo `codeguard-ai`.
4.  O Smithery vai detectar o `package.json` e fazer o deploy.
5.  **Vantagem**: Dá um URL público para qualquer um usar.

### Opção B: Glama (Diretório)
O **Glama** é onde as pessoas descobrem servidores.
1.  Vá em [glama.ai/mcp/servers](https://glama.ai/mcp/servers).
2.  Clique em "Submit Server".
3.  Cole o link do seu repositório GitHub.
4.  **Requisito**: Ter um `README.md` bom (nós já temos!).

### Opção C: NPM (Para Desenvolvedores)
Para que devs instalem via `npx`, publique no NPM.
1.  Login: `npm login`
2.  Publicar: `npm publish --access public`
3.  Usuários poderão rodar:
    ```bash
    npx -y @codeguard/mcp-server
    ```

---

## 🌐 3. API Universal (Vercel)

Para testar a API HTTP que criamos (`api/v1/scan`), use o Vercel CLI:

1.  Instale: `npm i -g vercel`
2.  Rode local: `vercel dev`
3.  Teste:
    ```bash
    curl -X POST http://localhost:3000/api/v1/scan \
      -H "Content-Type: application/json" \
      -d '{"code": "const pass = 123;", "region": "BR"}'
    ```

---

## 📝 Checklist de Lançamento Final

1.  [ ] **Preencher `.env`**: Coloque suas chaves reais.
2.  [ ] **Compilar**: `npm run compile`.
3.  [ ] **Commit**: `git add .` / `git commit -m "Release v1.0"` / `git push`.
4.  [ ] **Publicar**: Smithery ou Glama.
