import { Violation } from './gdpr';

export class ShadowAPIScanner {
    /**
     * Detects "Shadow APIs" - endpoints exposed in code but missing documentation (Swagger/OpenAPI/JSDoc)
     */
    static scan(content: string): Violation[] {
        const violations: Violation[] = [];

        // Regex patterns for common API frameworks (Express, Fastify, Spring, Flask-like)
        const routePatterns = [
            // Express/Fastify: app.get('/path', ...), router.post('/path', ...)
            { regex: /\.(get|post|put|delete|patch|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/g, type: 'Express/Node' },
            // Spring Boot/Java: @GetMapping("/path"), @RequestMapping(value="/path")
            { regex: /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*\(\s*(?:value\s*=\s*)?['"`]([^'"`]+)['"`]/g, type: 'Spring/Java' },
            // Python/Flask/FastAPI: @app.route("/path"), @app.get("/path")
            { regex: /@(?:app|router)\.(?:route|get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g, type: 'Python' }
        ];

        // Documentation patterns (Swagger/JSDoc) to look for ABOVE the route
        const docPatterns = [
            /@swagger/i,
            /@openapi/i,
            /@api/i,
            /@operation/i,
            /summary:/i, // YAML comment
            /\/\*\*[\s\S]*?\*\//, // Block comment
            /'''[\s\S]*?'''/ // Python docstring
        ];

        let match;
        // Scan full content
        for (const pattern of routePatterns) {
            while ((match = pattern.regex.exec(content)) !== null) {
                const method = match[1].toUpperCase();
                const route = match[2];
                const matchIndex = match.index;

                // Calculate line number
                const line = content.substring(0, matchIndex).split('\n').length;

                // Check previous N lines for documentation
                const contextStart = Math.max(0, matchIndex - 500); // Check previous ~500 chars (approx 10-20 lines)
                const precedingCode = content.substring(contextStart, matchIndex);

                const hasDocs = docPatterns.some(p => p.test(precedingCode));

                if (!hasDocs) {
                    // Critical if admin/auth route, High otherwise
                    const isCritical = /admin|auth|login|reset|key|secret/i.test(route);

                    violations.push({
                        category: 'SECURITY',
                        rule: 'SHADOW_API_UNDOCUMENTED',
                        severity: isCritical ? 'CRITICAL' : 'HIGH',
                        line: line,
                        match: match[0],
                        message: `Shadow API detected: Undocumented ${method} endpoint '${route}'`,
                        suggestedFix: `/**\n * @openapi\n * ${method} ${route}\n * @description Add functionality description here\n */`,
                        fixDescription: 'Add OpenAPI/Swagger documentation to avoid Shadow IT risks.'
                    });
                }
            }
        }

        return violations;
    }
}
