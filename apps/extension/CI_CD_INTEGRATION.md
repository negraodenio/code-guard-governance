# CodeGuard CI/CD Integration

## GitHub Actions Example

```yaml
# .github/workflows/compliance-check.yml
name: Compliance Check

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  compliance-scan:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run CodeGuard Compliance Scan
      id: codeguard
      run: |
        # Usar API do CodeGuard
        RESPONSE=$(curl -X POST https://code-guard.eu/api/scan \
          -H "x-api-key: ${{ secrets.CODEGUARD_API_KEY }}" \
          -H "Content-Type: application/json" \
          -d '{
            "region": "BR",
            "frameworks": ["gdpr", "lgpd", "ccpa"],
            "webhookUrl": "https://your-webhook.com/webhook/codeguard"
          }')

        # Salvar resposta para próximos steps
        echo "response=$RESPONSE" >> $GITHUB_OUTPUT

        # Verificar se há violações críticas
        VIOLATIONS=$(echo $RESPONSE | jq '.violations | length')
        CRITICAL=$(echo $RESPONSE | jq '[.violations[] | select(.severity == "critical")] | length')

        echo "Total violations: $VIOLATIONS"
        echo "Critical violations: $CRITICAL"

        # Falhar se houver violações críticas
        if [ "$CRITICAL" -gt 0 ]; then
          echo "🚫 Critical compliance violations found! Failing build..."
          exit 1
        fi

    - name: Comment PR with Results
      if: always()
      uses: actions/github-script@v7
      with:
        script: |
          const response = ${{ steps.codeguard.outputs.response }};
          const violations = response.violations || [];

          let comment = '## 🔍 CodeGuard Compliance Scan Results\n\n';

          if (violations.length === 0) {
            comment += '✅ **No compliance violations found!**\n\n';
            comment += 'Your code is compliant with GDPR, LGPD, and CCPA requirements.';
          } else {
            comment += `⚠️ **Found ${violations.length} compliance issues**\n\n`;

            violations.slice(0, 10).forEach((v, i) => {
              comment += `**${i + 1}. ${v.title}** (${v.severity})\n`;
              comment += `${v.description}\n\n`;
            });

            if (violations.length > 10) {
              comment += `*... and ${violations.length - 10} more issues*\n\n`;
            }
          }

          comment += '\n📊 [View full report](https://code-guard.eu/web/api-dashboard.html)';

          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

## Jenkins Pipeline Example

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        CODEGUARD_API_KEY = credentials('codeguard-api-key')
        CODEGUARD_URL = 'https://code-guard.eu'
    }

    stages {
        stage('Compliance Scan') {
            steps {
                script {
                    def response = sh(
                        script: """
                            curl -X POST ${CODEGUARD_URL}/api/scan \
                              -H "x-api-key: ${CODEGUARD_API_KEY}" \
                              -H "Content-Type: application/json" \
                              -d '{
                                "region": "BR",
                                "frameworks": ["gdpr", "lgpd"],
                                "webhookUrl": "${BUILD_URL}webhook"
                              }'
                        """,
                        returnStdout: true
                    ).trim()

                    def jsonResponse = readJSON text: response

                    if (jsonResponse.violations) {
                        def criticalCount = jsonResponse.violations.count { it.severity == 'critical' }

                        if (criticalCount > 0) {
                            error("🚫 ${criticalCount} critical compliance violations found!")
                        }

                        echo "⚠️ Found ${jsonResponse.violations.size()} compliance issues"
                    } else {
                        echo "✅ No compliance violations found"
                    }
                }
            }
        }
    }

    post {
        always {
            // Publicar relatório
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'reports',
                reportFiles: 'compliance-report.html',
                reportName: 'Compliance Report'
            ])
        }
    }
}
```

## GitLab CI Example

```yaml
# .gitlab-ci.yml
stages:
  - compliance

compliance_scan:
  stage: compliance
  image: node:18
  before_script:
    - npm ci
  script:
    - |
      echo "🔍 Running CodeGuard compliance scan..."

      # Fazer scan via API
      RESPONSE=$(curl -X POST https://code-guard.eu/api/scan \
        -H "x-api-key: $CODEGUARD_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
          \"region\": \"BR\",
          \"frameworks\": [\"gdpr\", \"lgpd\", \"ccpa\"],
          \"webhookUrl\": \"$CI_PROJECT_URL/-/jobs/$CI_JOB_ID\"
        }")

      # Salvar resposta como artifact
      echo $RESPONSE > compliance-results.json

      # Verificar violações críticas
      CRITICAL=$(echo $RESPONSE | jq '[.violations[] | select(.severity == "critical")] | length')

      if [ "$CRITICAL" -gt 0 ]; then
        echo "🚫 Critical violations found! Failing pipeline..."
        exit 1
      fi

      echo "✅ Compliance check passed!"
  artifacts:
    reports:
      junit: compliance-results.json
    paths:
      - compliance-results.json
  only:
    - merge_requests

# Job para scans noturnos completos
nightly_full_scan:
  stage: compliance
  image: node:18
  script:
    - |
      echo "🌙 Running full nightly compliance scan..."

      # Scan mais profundo para master/develop
      curl -X POST https://code-guard.eu/api/scan \
        -H "x-api-key: $CODEGUARD_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
          \"region\": \"BR\",
          \"frameworks\": [\"gdpr\", \"lgpd\", \"ccpa\", \"hipaa\", \"pci\"],
          \"deepScan\": true,
          \"webhookUrl\": \"https://your-slack-webhook.com\"
        }"
  only:
    schedules:
      - cron: "0 2 * * *"
```

## Azure DevOps Example

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'

- script: npm ci
  displayName: 'Install dependencies'

- script: |
    echo "🔍 Running CodeGuard compliance scan..."

    # Scan via API
    response=$(curl -X POST https://code-guard.eu/api/scan \
      -H "x-api-key: $(CODEGUARD_API_KEY)" \
      -H "Content-Type: application/json" \
      -d '{
        "region": "BR",
        "frameworks": ["gdpr", "lgpd"],
        "webhookUrl": "$(System.TeamFoundationCollectionUri)$(System.TeamProject)/_apis/build/builds/$(Build.BuildId)/timeline"
      }')

    # Salvar como variável para próximos steps
    echo "##vso[task.setvariable variable=scanResponse]$response"

    # Verificar violações
    critical=$(echo $response | jq '[.violations[] | select(.severity == "critical")] | length')

    if [ "$critical" -gt "0" ]; then
      echo "##vso[task.logissue type=error]Critical compliance violations found!"
      exit 1
    fi
  displayName: 'Run Compliance Scan'

- task: PublishBuildArtifacts@1
  condition: always()
  inputs:
    pathToPublish: 'compliance-results.json'
    artifactName: 'ComplianceResults'
  displayName: 'Publish Compliance Results'
```

## Configuração de Secrets

### GitHub
```bash
# Adicionar secret no repositório
gh secret set CODEGUARD_API_KEY --body "your-api-key-here"
```

### GitLab
```yaml
# Settings > CI/CD > Variables
# Adicionar: CODEGUARD_API_KEY = your-api-key-here
```

### Azure DevOps
```
# Pipeline > Library > Variable Groups
# Adicionar variável: CODEGUARD_API_KEY
```

## Webhook Integration

Para receber callbacks assíncronos:

```javascript
// Usar o webhook handler do exemplo
const webhookHandler = require('./examples/webhook-handler');

// Configurar webhook URL no Vercel
// https://code-guard.eu/api/webhook/configure
```

## Estratégias de Blocking

### Soft Blocking (Recomendado)
- Permitir merge com warnings
- Bloquear apenas violações críticas
- Usar status checks

### Hard Blocking
- Falhar pipeline em qualquer violação
- Requer aprovação manual para bypass

### Progressive Enforcement
```yaml
# Começar soft, aumentar rigor gradualmente
- Week 1: Apenas reportar
- Week 2: Warn em PRs
- Week 3: Block critical violations
- Week 4: Block all violations
```