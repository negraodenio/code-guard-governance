export const FAPI_BR_FRAMEWORK = {
    id: 'fapi-br',
    name: 'FAPI 1 Advanced Final - Open Finance Brasil',
    certification: 'Raidiam Assure / OpenID Foundation',
    version: '1.0',

    tests: [
        {
            id: 'FAPI-BR-001',
            severity: 'critical',
            category: 'JWT Security',
            test: 'Algoritmo deve ser PS256',
            validate: (fileContent: string, filePath: string) => {
                if (fileContent.includes('RS256') || fileContent.includes('HS256')) {
                    return {
                        passed: false,
                        message: 'FAPI-BR exige PS256. Algoritmos RS256/HS256 não conformes.',
                        // line: findLineNumber(fileContent, 'RS256'), // Removed utility call for simplicity in this artifact
                        fix: 'Altere para PS256 nas configurações JWT'
                    };
                }
                return { passed: true };
            }
        },

        {
            id: 'FAPI-BR-TOKEN-LIFETIME',
            severity: 'high',
            category: 'Token Management',
            test: 'Access token lifetime 300-900 segundos',
            validate: (config: string) => {
                const lifetimeMatch = config.match(/accessTokenLifetime[":\s]*(\d+)/);
                if (lifetimeMatch) {
                    const lifetime = parseInt(lifetimeMatch[1]);
                    if (lifetime < 300 || lifetime > 900) {
                        return {
                            passed: false,
                            message: `Token lifetime ${lifetime}s viola FAPI-BR (deve ser 300-900s)`,
                            fix: 'Configure accessTokenLifetime para valor entre 300 e 900'
                        };
                    }
                }
                return { passed: true };
            }
        },

        {
            id: 'FAPI-BR-CONSENT-STRUCT',
            severity: 'critical',
            category: 'Consent Management',
            test: 'Consentimento usa estrutura BR (consentId + loggedUser)',
            validate: (code: string) => {
                const hasConsentId = code.includes('consentId') || code.includes('consent_id');
                const hasLoggedUser = code.includes('loggedUser') || code.includes('logged_user');

                if (!hasConsentId || !hasLoggedUser) {
                    return {
                        passed: false,
                        message: 'Consentimento não segue padrão Open Finance BR (falta consentId ou loggedUser)',
                        fix: 'Adicione consentId e loggedUser na estrutura de consentimento conforme especificação OFB'
                    };
                }
                return { passed: true };
            }
        },

        {
            id: 'FAPI-BR-PAR',
            severity: 'medium',
            category: 'Pushed Authorization Requests',
            test: 'Suporte a PAR (Pushed Authorization Requests)',
            validate: (code: string) => {
                if (!code.includes('pushed_authorization') && !code.includes('/par')) {
                    return {
                        passed: false,
                        warning: true,
                        message: 'PAR não detectado. FAPI-BR recomenda PAR (opcional mas fortemente recomendado)',
                        fix: 'Implemente endpoint /par para Pushed Authorization Requests'
                    };
                }
                return { passed: true };
            }
        },

        {
            id: 'PIX-IDEMPOTENCY',
            severity: 'critical',
            category: 'Pix Security',
            test: 'Pix requer header de idempotência',
            validate: (routeDefinitions: any) => {
                // Mock implementation for string content check if routeDefinitions is string
                if (typeof routeDefinitions === 'string') {
                    if (routeDefinitions.includes('/pix') && !routeDefinitions.includes('idempotency')) {
                        return {
                            passed: false,
                            message: `Endpoints Pix sem header de idempotência detectados`,
                            fix: 'Adicione x-idempotency-key em todos os POST /pix'
                        };
                    }
                    return { passed: true };
                }

                // Original logic if routeDefinitions is object (but we primarily deal with strings content here)
                if (Array.isArray(routeDefinitions)) {
                    const pixEndpoints = routeDefinitions.filter((r: any) =>
                        r.path.includes('pix') || r.path.includes('transfers')
                    );

                    const violations = pixEndpoints.filter((endpoint: any) =>
                        !endpoint.headers?.some((h: string) =>
                            h.toLowerCase().includes('idempotency') ||
                            h.toLowerCase().includes('idempotencia')
                        )
                    );

                    if (violations.length > 0) {
                        return {
                            passed: false,
                            message: `Endpoints Pix sem header de idempotência: ${violations.map((v: any) => v.path).join(', ')}`,
                            fix: 'Adicione x-idempotency-key em todos os POST /pix'
                        };
                    }
                }
                return { passed: true };
            }
        }
    ]
};
