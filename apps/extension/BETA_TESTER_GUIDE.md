# CodeGuard AI - Guia para Beta Testers 🛡️

**Versão:** 1.2.0 (Beta Rel. Credit System)  
**Data:** 22/01/2026

Bem-vindo ao programa Beta do CodeGuard AI! Este guia vai te ensinar a testar o fluxo completo: **Instalação, Scan, Pagamento e Auditoria.**

---

## 🎯 Seus Objetivos de Teste

1.  **Instalar** a extensão VSIX.
2.  **Configurar** o ambiente (Email e Chave).
3.  **Simular Compra** de créditos (Pagamento Real de Teste).
4.  **Rodar Auditoria** em código vulnerável.
5.  **Testar Auto-Fix** usando os créditos comprados.

---

## 🚀 PASSO 1: Instalação

### 1.1 Download
Baixe o arquivo `codeguard-ai-1.1.2.vsix` que enviamos.

### 1.2 Instalar no VS Code
1.  Abra o VS Code.
2.  Pressione `Ctrl+Shift+X` (Extensions).
3.  Clique nos **três pontinhos (⋯)** no topo da barra lateral.
4.  Escolha **"Install from VSIX..."**.
5.  Selecione o arquivo baixado.

> ⚠️ **IMPORTANTE:** Após instalar, pressione `Ctrl+Shift+P` e digite `Developer: Reload Window` para garantir que tudo carregou.

---

## ⚙️ PASSO 2: Configuração Inicial

Para que o sistema de créditos funcione, você precisa definir seu email nas configurações.

1.  Pressione `Ctrl+,` (Settings).
2.  Busque por: `codeguard`.
3.  **User Email**: Coloque seu email real (o mesmo que usará no Stripe).
    *   *Exemplo:* `seu.email@exemplo.com`
4.  **Region**: Escolha `BR` (para testar LGPD) ou `EU` (para GDPR).

---

## 💰 PASSO 3: Testando o Pagamento (CRÍTICO)

Queremos testar se o sistema entrega os créditos automaticamente após o pagamento.

### 3.1 Comprar Créditos
1.  Pressione `Ctrl+Shift+P`.
2.  Digite: `CodeGuard: Buy AI Credits`.
3.  Um popup aparecerá ofertando "Buy Credit Pack (20 units) for €19.99".
4.  Clique em **Buy Now**.
5.  Você será levado ao **Stripe Checkout**.
6.  **APLICAR CUPOM:** No checkout, procure o campo "Adicionar código promocional" (Add promotion code) e insira o cupom que te enviamos para aplicar o desconto de Beta Tester.
    *   *Nota:* Se estivermos usando chaves de Teste, use o cartão 4242... Se for Produção, será uma compra real com valor reduzido.

### 3.2 Verificar Recebimento
1.  Após pagar, aguarde 1 minuto.
2.  No VS Code, pressione `Ctrl+Shift+P`.
3.  Digite: `CodeGuard: Check My Credits`.
4.  **Sucesso:** Uma mensagem deve aparecer: *"💰 Your balance: 20 credits"*.

> ❌ **Se der erro:** Nos avise imediatamente com seu email.

---

## 🧪 PASSO 4: Testando Compliance (Audit)

Agora vamos gastar esses créditos para analisar código.

### 4.1 Crie um Arquivo "Vulnerável"
Crie um arquivo chamado `teste_gdpr.ts` e cole este código propositalmente perigoso:

```typescript
// ARQUIVO DE TESTE - VIOLAÇÕES DE COMPLIANCE

// 1. GDPR/LGPD: Email Hardcoded (Dados Pessoais)
const userEmail = "cliente.vip@gmail.com";

// 2. Segurança: Chave de API Exposta (CRÍTICO)
const stripeKey = "sk_test_... (CHAVE_REMOVIDA)";

// 3. GDPR: Logando dados sensíveis
function login(password: string) {
    console.log("User password attempt:", password); 
}

// 4. Pattern de CPF (LGPD)
const cpfCliente = "123.456.789-00";
```

### 4.2 Rodar Auditoria IA
**Opção A: Tenho minha própria chave (BYOK)**
Se você tem uma chave do OpenRouter ou OpenAI:
1.  Vá em Settings (`codeguard.userApiKey`) e cole sua chave.
2.  Rode `CodeGuard: Run Deep Compliance Audit`.

**Opção B: Usar Créditos (Pay-Per-Use)**
*Esta funcionalidade consome 1 crédito por uso.*
1.  O sistema detectará que você não tem chave, mas tem créditos.
2.  Confirme o uso do crédito.
3.  O relatório será gerado.

---

## 🛠️ PASSO 5: Testando Auto-Fix

1.  Abra o arquivo `teste_gdpr.ts` novamente.
2.  Rode um scan simples: `CodeGuard: Scan for Compliance Risks`.
3.  No painel que abrir, você verá as violações.
4.  Ao lado da violação de senha ou chave, clique no botão **"Auto-Fix"**.
5.  O sistema consumirá **1 Crédito** e tentará corrigir o código (ex: movendo a chave para `.env`).

---

## ❓ FAQ & Troubleshooting

**Q: O comando `codeguard.buyCredits` não aparece.**
R: Reinicie o VS Code (`Developer: Reload Window`).

**Q: Paguei mas os créditos não chegaram.**
R: Verifique se o email no `Settings > CodeGuard: User Email` é **exatamente igual** ao email que você usou no Stripe.

**Q: Posso usar minha própria chave da OpenAI?**
R: Sim! Basta colar em `codeguard.userApiKey`. O sistema prioriza sua chave e não gasta seus créditos.

---
**Obrigado por nos ajudar a tornar o código mais seguro!** 🛡️
