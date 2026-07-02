# Diagnóstico de Instalação do CodeGuard AI

## Para Beta Testers - Resolução de Problemas

Se você está vendo o erro **"command 'codeguard.scan' not found"**, siga este procedimento completo:

---

## PASSO 1: Desinstalar Completamente

1. Feche TODAS as janelas do VS Code
2. Abra apenas UMA nova janela
3. `Ctrl+Shift+X` → Extensions
4. Busque "CodeGuard" ou "vibecode" ou "vibe"
5. **Desinstale TODAS** as versões encontradas
6. Feche o VS Code novamente

---

## PASSO 2: Limpar Cache (IMPORTANTE)

Abra o PowerShell e execute:

```powershell
# Limpar cache do VS Code
Remove-Item -Recurse -Force "$env:USERPROFILE\.vscode\extensions\codeguard*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.vscode\extensions\vibecode*" -ErrorAction SilentlyContinue
```

---

## PASSO 3: Verificar o Arquivo VSIX

Antes de instalar, confirme que você tem o arquivo correto:
- Nome: `codeguard-ai-1.1.1.vsix`
- Tamanho: aproximadamente 413 KB
- Localização conhecida (ex: `C:\Users\SeuNome\Downloads\`)

---

## PASSO 4: Instalar de Forma Limpa

### Opção A: Via Terminal (RECOMENDADO)

```powershell
# Navegue até a pasta onde está o VSIX
cd "C:\Users\SeuNome\Downloads"

# Instale especificando o caminho completo
code --install-extension .\codeguard-ai-1.1.1.vsix
```

### Opção B: Via Interface

1. Abra o VS Code
2. `Ctrl+Shift+X`
3. Clique nos **⋯** (três pontinhos)
4. **"Install from VSIX..."**
5. Selecione o arquivo

---

## PASSO 5: Verificar Instalação

Após instalar:

1. **Não use o comando ainda!**
2. `Ctrl+Shift+P`
3. Digite: `Developer: Reload Window`
4. Aguarde 5 segundos

---

## PASSO 6: Confirmar Ativação

1. `Ctrl+Shift+X` → busque "CodeGuard"
2. Você deve ver: **"CodeGuard AI v1.1.1"** com o ícone do escudo
3. Clique na extensão
4. Verifique se aparece "Disable" e "Uninstall" (significa que está ativa)

---

## PASSO 7: Testar Comando Simples

1. Abra qualquer arquivo `.js` ou `.ts` (ou crie um vazio)
2. `Ctrl+Shift+P`
3. Digite: `codeguard`
4. Você deve ver 6 comandos:
   - CodeGuard: Scan for Compliance Risks
   - CodeGuard: Run Deep Compliance Audit
   - CodeGuard: Apply Auto-Fix (Pro Only)
   - CodeGuard: Buy AI Credits
   - CodeGuard: Check My Credits
   - CodeGuard: Index Workspace (Intelligence)

---

## PASSO 8: Se Ainda Não Funcionar

Execute este diagnóstico:

```powershell
# Verificar instalação
code --list-extensions | Select-String -Pattern "codeguard"
```

**Resultado esperado:** `codeguard.codeguard-ai` (ou similar)

Se não aparecer nada, a instalação falhou.

---

## ÚLTIMO RECURSO: Instalação Manual

1. Baixe novamente o arquivo `.vsix`
2. Extraia o conteúdo (renomeie para `.zip` e descompacte)
3. Copie a pasta extraída para:
   ```
   C:\Users\SeuNome\.vscode\extensions\codeguard-ai-1.1.1\
   ```
4. Reinicie o VS Code

---

## Debug: Ver Logs de Erros

Se o comando ainda não aparecer:

1. `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`
2. Vá na aba **Console**
3. Procure por erros em vermelho relacionados a "codeguard"
4. **Tire print e envie para mim**

---

## Informações para Reportar

Se nada funcionar, envie:
- Screenshot do erro
- Versão do VS Code: `Help > About`
- Resultado de: `code --list-extensions | Select-String codeguard`
- Print do console de desenvolvedor (se possível)
