# 🚀 CodeGuard AI - Vercel Deployment Guide

## Deploy no Vercel

### 1. Configuração das Variáveis de Ambiente

No painel do Vercel, configure as seguintes variáveis de ambiente:

```bash
# API Keys (separadas por vírgula)
CODEGUARD_API_KEYS=prod-key-1,prod-key-2,prod-key-3

# License Key
CODEGUARD_LICENSE_KEY=your-license-key-here

# LLM APIs (opcional, para funcionalidades avançadas)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SILICONFLOW_API_KEY=...
KIMI_API_KEY=...

# Stripe (para webhooks de pagamento)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Deploy

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login no Vercel
vercel login

# Deploy
vercel --prod
```

### 3. URLs da API

Após o deploy, suas APIs estarão disponíveis em:

```
https://your-app.vercel.app/api/scan
https://your-app.vercel.app/api/graph
https://your-app.vercel.app/api/shadow-apis
https://your-app.vercel.app/api/openapi
https://your-app.vercel.app/api/docs
```

## 📖 Como Consumir as APIs

### Autenticação

Todas as APIs requerem uma chave API no header:

```bash
curl -H "x-api-key: your-api-key" https://your-app.vercel.app/api/scan
```

### Exemplos de Uso

#### 1. Scan de Compliance

```bash
curl -X POST https://your-app.vercel.app/api/scan \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "BR",
    "frameworks": ["gdpr", "lgpd"]
  }'
```

**Resposta:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"summary\": {...}, \"findings\": [...]}"
    }
  ]
}
```

#### 2. Gerar Grafo de Dependências

```bash
curl -X POST https://your-app.vercel.app/api/graph \
  -H "x-api-key: your-api-key"
```

#### 3. Detectar Shadow APIs

```bash
curl -X POST https://your-app.vercel.app/api/shadow-apis \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "app.get(\"/api/users\", (req, res) => { ... })"
  }'
```

### SDK JavaScript/TypeScript

```javascript
import CodeGuardClient from 'codeguard-sdk';

const client = new CodeGuardClient({
    apiKey: 'your-api-key',
    baseUrl: 'https://your-app.vercel.app'
});

// Scan
const result = await client.scan({
    region: 'BR',
    frameworks: ['gdpr']
});

console.log(result);
```

### Python

```python
import requests

API_KEY = 'your-api-key'
BASE_URL = 'https://your-app.vercel.app'

headers = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
}

# Scan
response = requests.post(f'{BASE_URL}/api/scan', json={
    'region': 'BR',
    'frameworks': ['gdpr']
}, headers=headers)

print(response.json())
```

### Rate Limiting

- **Limite**: 100 requisições por 15 minutos por IP
- **Headers de resposta**:
  - `X-RateLimit-Limit`: Limite total
  - `X-RateLimit-Remaining`: Requisições restantes
  - `X-RateLimit-Reset`: Timestamp de reset

### Tratamento de Erros

```javascript
try {
    const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
            'x-api-key': 'your-key',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ region: 'BR' })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Erro:', error.error);
        console.error('Mensagem:', error.message);
    } else {
        const result = await response.json();
        console.log('Sucesso:', result);
    }
} catch (error) {
    console.error('Erro de rede:', error);
}
```

### Códigos de Status

- `200`: Sucesso
- `400`: Dados inválidos
- `401`: API key inválida
- `403`: Licença insuficiente
- `429`: Rate limit excedido
- `500`: Erro interno

## 🔒 Segurança em Produção

### 1. API Keys
- Use chaves diferentes para ambientes diferentes
- Rotacione chaves regularmente
- Monitore uso das chaves

### 2. Rate Limiting
- Implementado automaticamente pelo Vercel Edge Runtime
- Protege contra abuso e ataques DoS

### 3. Logs
- Todos os requests são logados
- Use Vercel Analytics para monitorar uso
- Configure alertas para erros 5xx

### 4. HTTPS
- Vercel fornece HTTPS automaticamente
- Todas as comunicações são criptografadas

## 📊 Monitoramento

### Vercel Analytics
- Acesse no painel do Vercel
- Monitore performance e erros
- Veja padrões de uso

### Logs
```bash
# Ver logs em tempo real
vercel logs

# Ver logs de função específica
vercel logs --function api/scan
```

## 🐛 Troubleshooting

### Erro 401 Unauthorized
- Verifique se a API key está correta
- Confirme se a chave está na lista `CODEGUARD_API_KEYS`

### Erro 403 License Required
- Upgrade para plano PRO
- Verifique `CODEGUARD_LICENSE_KEY`

### Erro 429 Rate Limited
- Aguarde 15 minutos
- Implemente backoff exponencial no cliente

### Timeout
- Requests podem demorar até 30 segundos
- Implemente timeout no cliente
- Considere usar webhooks para operações longas

## 🎯 Próximos Passos

1. **Teste em Staging**: Deploy primeiro em preview deployment
2. **Monitoramento**: Configure alertas no Vercel
3. **Documentação**: Atualize docs com URLs reais
4. **SDK**: Publique o SDK no npm
5. **Webhook Callbacks**: Implemente notificações assíncronas