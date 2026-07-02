import type { CodeViolation } from './types';
import { runLegacyScannersOnFileMap } from './legacy-bridge';

function scanPCIViolations(content: string, file: string): CodeViolation[] {
  const violations: CodeViolation[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // PAN (Primary Account Number) — Luhn-like patterns
    const panMatch = line.match(/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/);
    if (panMatch) {
      violations.push({
        rule: 'PCI_PAN_EXPOSED',
        severity: 'critical',
        category: 'pci',
        message: 'Credit card PAN detected. PCI-DSS requires encryption, tokenization, or masking.',
        file, line: i + 1, match: panMatch[0].slice(0, 40),
        recommendation: 'Use tokenization or encryption for card numbers. Never store full PAN.',
      });
    }

    // CVV/CVC
    const cvvMatch = line.match(/\b(cvv|cvc|cvn)\s*[:=]\s*[0-9]{3,4}\b/i);
    if (cvvMatch) {
      violations.push({
        rule: 'PCI_CVV_EXPOSED',
        severity: 'critical',
        category: 'pci',
        message: 'CVV/CVC detected. PCI-DSS prohibits storage of card verification codes.',
        file, line: i + 1, match: cvvMatch[0].slice(0, 40),
        recommendation: 'Never store CVV/CVC. Use payment processor token instead.',
      });
    }

    // Track data (magnetic stripe)
    const trackMatch = line.match(/\btrack2\b|\bmagnetic\s*stripe\b|\bcard\s*track\b/i);
    if (trackMatch) {
      violations.push({
        rule: 'PCI_TRACK_DATA',
        severity: 'critical',
        category: 'pci',
        message: 'Magnetic stripe/track data reference. PCI-DSS prohibits storing track data.',
        file, line: i + 1, match: trackMatch[0].slice(0, 40),
        recommendation: 'Never store magnetic stripe data. Use chip/EMV tokens.',
      });
    }
  }

  return violations;
}

function hasUserInput(line: string): boolean {
  return /\$\{|req\.(body|params|query)|request\.(body|params|query)|body\[|params\[|query\[|userInput|user_input|untrusted/i.test(line);
}

function hasAuthNearby(lines: string[], idx: number, window = 5): boolean {
  for (let j = Math.max(0, idx - window); j <= Math.min(lines.length - 1, idx + 2); j++) {
    if (/\b(auth|authenticate|authorize|jwt|verifyToken|checkAuth|requireAuth|protect|@UseGuards|@Secured|isAuthenticated|ensureAuthenticated)\b/i.test(lines[j])) return true;
  }
  return false;
}

function hasOrmReference(line: string): boolean {
  return /\b(prisma|typeorm|sequelize|mongoose|drizzle|knex|queryBuilder|entityManager|repository\.(find|save|update|delete)|session\.exec|Model\.(find|create|update|destroy))\b/i.test(line);
}

function scanOWASPViolations(content: string, file: string): CodeViolation[] {
  const violations: CodeViolation[] = [];
  const lines = content.split('\n');
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
  const isSource = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|svelte|astro)$/i.test(ext);
  const isBackend = /\.(ts|js|mjs|cjs|mts|cts|py|go|rb|php|java|cs|rs)$/i.test(ext);
  const isPython = ext === '.py';
  const isPhp = ext === '.php';
  const isJava = ext === '.java';
  const isGo = ext === '.go';
  const isConfigFile = /\.(json|yaml|yml|toml|xml|env|ini|conf)$/i.test(ext);
  const isTestFile = /test|spec|mock|fixture|__test__|__mocks__|\.test\.|\.spec\./i.test(file);
  const isFrontend = /\.(tsx|jsx|vue|svelte|html|hbs|ejs|pug|handlebars|mustache)$/i.test(ext);
  const fileHasAuth = /\b(passport|jwt|session|auth|authenticate|authorize|middleware|@UseGuards|@Secured|isAuthenticated)\b/i.test(content) && !/example|sample|demo/i.test(file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    const isComment = /^\s*(\/\/|#|--|\/\*|\*|%|<!--|{-)/.test(line);
    if (isComment) continue;

    // ── A01: Broken Access Control ─────────────────────────────────────

    if (isBackend && !isTestFile) {
      const routeHandler = line.match(/\b(router|app|server|route|api)\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]*)['"`]/i);
      if (routeHandler) {
        const routePath = routeHandler[3];
        const isPublic = /(login|register|signup|signin|webhook|health|status|metrics|favicon|__webpack|_next|manifest|assets|static|public|callback|oauth|logout|sse|events)/i.test(routePath);
        const isStatic = /\.(css|js|png|jpg|ico|svg|woff|ttf|pdf)/i.test(routePath);
        if (!isPublic && !isStatic && !fileHasAuth && !hasAuthNearby(lines, i)) {
          violations.push({
            rule: 'OWASP_A01_ROUTE_NO_AUTH',
            severity: 'high', category: 'owasp',
            message: `API route \`${routePath}\` defined without authentication. Potential broken access control (OWASP A01).`,
            file, line: i + 1, match: routePath.slice(0, 60),
            recommendation: 'Apply auth middleware globally or on each protected route. Use JWT/session validation before the handler.',
          });
        }
      }

      const idorRef = line.match(/\b(find(ById|One|First)|get(ById|One)|\.find\s*\(\s*\{\s*(id|_id))\s*[:=]/i);
      if (idorRef && !hasAuthNearby(lines, i, 3)) {
        violations.push({
          rule: 'OWASP_A01_IDOR',
          severity: 'high', category: 'owasp',
          message: 'Direct object reference without ownership verification. Insecure Direct Object Reference (OWASP A01).',
          file, line: i + 1, match: idorRef[0].slice(0, 60),
          recommendation: 'Verify the authenticated user owns the requested resource before returning data.',
        });
      }
    }

    // ── A02: Cryptographic Failures ────────────────────────────────────

    if (isSource && !isTestFile) {
      const weakHash = line.match(/\b(MD5|SHA1?[^2-9]|DES\b|RC4\b|3DES|Blowfish)\s*\(/i);
      if (weakHash && !/test|example|fixture/i.test(file)) {
        violations.push({
          rule: 'OWASP_A02_WEAK_HASH',
          severity: 'high', category: 'owasp',
          message: `Weak cryptographic algorithm: ${weakHash[1]}. Use SHA-256/SHA-512 or bcrypt/argon2 for passwords (OWASP A02).`,
          file, line: i + 1, match: weakHash[0].slice(0, 50),
          recommendation: `Replace ${weakHash[1]} with SHA-256, SHA-384, SHA-512, or bcrypt/argon2 for passwords.`,
        });
      }

      if (/\bAES\.(ECB)\b|aes[-_]?ecb|cipher.*ECB|mode\s*:\s*['"`]ECB['"`]/i.test(line)) {
        violations.push({
          rule: 'OWASP_A02_ECB_MODE',
          severity: 'critical', category: 'owasp',
          message: 'ECB encryption mode detected. ECB is deterministic and reveals plaintext patterns (OWASP A02).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Use GCM or CBC mode with a random IV. Never use ECB for data encryption.',
        });
      }

      if (/\b(jwt[-_]?secret|JWT_SECRET|token[-_]?secret)\s*[:=]\s*['"`][A-Za-z0-9_-]{5,}['"`]/i.test(line) && !/process\.env|env\./i.test(line) && !/example|sample/i.test(line)) {
        violations.push({
          rule: 'OWASP_A02_JWT_SECRET',
          severity: 'critical', category: 'owasp',
          message: 'Hardcoded JWT secret in source. Use environment variable (OWASP A02).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Move JWT_SECRET to environment variable. Rotate the exposed key immediately.',
        });
      }
    }

    if (isBackend && /(password|token|secret|key|salt|crypto|nonce|csrf|session|otp|2fa|mfa)/i.test(line) && /\bMath\.random\s*\(/.test(line) && !isTestFile) {
      violations.push({
        rule: 'OWASP_A02_WEAK_RNG',
        severity: 'high', category: 'owasp',
        message: 'Math.random() used for security-sensitive value. Not cryptographically secure (OWASP A02).',
        file, line: i + 1, match: trimmed.slice(0, 60),
        recommendation: 'Use crypto.randomBytes() or crypto.randomUUID() for all security-sensitive randomness.',
      });
    }

    const httpUrl = line.match(/['"`]http:\/\/([^'"`\/]+)['"`]/i);
    if (httpUrl && !/localhost|127\.0\.0\.1|example\.com|test|mock|stub|schema|xmlns/i.test(httpUrl[1]) && !isConfigFile) {
      violations.push({
        rule: 'OWASP_A02_HTTP_URL',
        severity: 'medium', category: 'owasp',
        message: `HTTP URL (not HTTPS) hardcoded: ${httpUrl[1]}. Potential MITM (OWASP A02).`,
        file, line: i + 1, match: httpUrl[0].slice(0, 60),
        recommendation: 'Use HTTPS URLs to prevent man-in-the-middle attacks.',
      });
    }

    // ── A03: Injection ───────────────────────────────────────────────

    if (isBackend && !isTestFile && !isConfigFile) {
      const sqli = line.match(/(SELECT|INSERT|UPDATE|DELETE|EXEC|EXECUTE)\s+.*?(?:WHERE|VALUES|SET|INTO)\s+.*?(?:\+|\|\||\$\{|f['"`].*\{)/i);
      if (sqli && !hasOrmReference(line)) {
        violations.push({
          rule: 'OWASP_A03_SQLI',
          severity: 'critical', category: 'owasp',
          message: 'Potential SQL injection via string concatenation or interpolation (OWASP A03).',
          file, line: i + 1, match: sqli[0].slice(0, 60),
          recommendation: 'Use parameterized queries or prepared statements. Never concatenate user input into SQL.',
        });
      }

      const cmdOp = line.match(/\b(exec|execSync|spawn|spawnSync|execFile|execFileSync)\s*\(/i);
      if (cmdOp && hasUserInput(trimmed)) {
        violations.push({
          rule: 'OWASP_A03_CMD_INJECTION',
          severity: 'critical', category: 'owasp',
          message: `Potential command injection via ${cmdOp[1]}(). User-controlled input in shell execution (OWASP A03).`,
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Avoid shell execution with user input. Use execFile/spawn with args array; validate input against allowlist.',
        });
      }

      if (/\$(where|regex)\b/.test(line) && /\.(find|findOne|update|delete|aggregate)\s*\(/.test(content)) {
        violations.push({
          rule: 'OWASP_A03_NOSQL_INJECTION',
          severity: 'high', category: 'owasp',
          message: 'Potential NoSQL injection via $where/$regex operator. User input in MongoDB query (OWASP A03).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Use strict type checks and sanitize $regex/$where. Prefer type-safe query builders.',
        });
      }

      if (/\b(eval|Function\s*\()/.test(line) && hasUserInput(trimmed)) {
        violations.push({
          rule: 'OWASP_A03_EVAL_INJECTION',
          severity: 'critical', category: 'owasp',
          message: 'Code injection via eval() or new Function() with user input. Arbitrary code execution risk (OWASP A03).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Avoid eval/new Function entirely. Use JSON.parse for data and proper parsers for expressions.',
        });
      }

      const fileOp = line.match(/\b(readFile|readFileSync|writeFile|writeFileSync|readdir|readdirSync|createReadStream|createWriteStream|fs\.(read|write|open|stat|unlink|rm|mkdir|copy|rename|access|append)|importLocal|requireLocal)\s*\(/i);
      if (fileOp && (hasUserInput(trimmed) || /\.\.\//.test(line))) {
        violations.push({
          rule: 'OWASP_A03_PATH_TRAVERSAL',
          severity: 'high', category: 'owasp',
          message: 'Potential path traversal in file operation. User-controlled input in file path (OWASP A03).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Use path.resolve() with allowlist. Strip ../ and null bytes from user input.',
        });
      }

      const ssti = line.match(/\{\{.*(req\.|res\.|app\.|request\.|input|userInput|body\.|params\.|query\.)/i);
      if (ssti) {
        violations.push({
          rule: 'OWASP_A03_SSTI',
          severity: 'critical', category: 'owasp',
          message: 'Potential SSTI — user input in template expression (OWASP A03).',
          file, line: i + 1, match: ssti[0].slice(0, 60),
          recommendation: 'Escape user input before template rendering. Use auto-escaping template engines.',
        });
      }
    }

    // ── A04: Insecure Design ──────────────────────────────────────────

    if (isBackend && !isTestFile && /\b(req\.body|request\.body|JSON\.parse)/i.test(line) && !isConfigFile) {
      let hasValidation = false;
      for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 3); j++) {
        if (/\b(zod|yup|joi|class.validator|validate|assert|sanitize|isEmail|isUUID|matches|schema|@Valid|checkSchema|express.validator|ajv|superstruct|yup|valibot|arktype)\b/i.test(lines[j])) {
          hasValidation = true; break;
        }
      }
      if (!hasValidation && !/\b(app\.(get|post|put|delete)|router\.(get|post|put|delete))/i.test(line)) {
        violations.push({
          rule: 'OWASP_A04_NO_VALIDATION',
          severity: 'high', category: 'owasp',
          message: 'Request body accessed without input validation library detected nearby. Missing input validation (OWASP A04).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Validate all input with a schema library (zod, yup, joi) before processing.',
        });
      }
    }

    // ── A05: Security Misconfiguration ────────────────────────────────

    if (isBackend && !isTestFile && /Access-Control-Allow-Origin\s*[:=]\s*['"`]\*['"`]/i.test(line)) {
      violations.push({
        rule: 'OWASP_A05_CORS_WILDCARD',
        severity: 'high', category: 'owasp',
        message: 'CORS wildcard origin (*) allows any site cross-origin access. Insecure with credentials (OWASP A05).',
        file, line: i + 1, match: trimmed.slice(0, 60),
        recommendation: 'Restrict CORS to specific origins. Never use * with credentials: include.',
      });
    }

    if (/\b(debug|showErrors|displayErrors|dump|verbose|trace)\s*[:=]\s*(true|1|yes|on)\b/i.test(line) && !isTestFile) {
      violations.push({
        rule: 'OWASP_A05_DEBUG_MODE',
        severity: 'high', category: 'owasp',
        message: `Debug/error display mode enabled (${line.match(/\b(debug|showErrors|displayErrors)\b/i)?.[0] || 'debug_mode'}). Exposes internals (OWASP A05).`,
        file, line: i + 1, match: trimmed.slice(0, 60),
        recommendation: 'Disable debug/error display in production. Use structured error handling.',
      });
    }

    if (/\b(password|senha|passwd)\s*[:=]\s*['"`](password|admin|123456|senha|root|test|default|guest|changeme|qwerty|abc123)['"`]/i.test(line)) {
      violations.push({
        rule: 'OWASP_A05_DEFAULT_CREDENTIALS',
        severity: 'critical', category: 'owasp',
        message: 'Default/weak credentials detected. Extremely common attack vector (OWASP A05).',
        file, line: i + 1, match: trimmed.slice(0, 60),
        recommendation: 'Enforce strong password policy. Never use default credentials in production.',
      });
    }

    // ── A06: Vulnerable Components via package.json ───────────────────

    if (file.endsWith('package.json')) {
      const knownVuln = [
        { pkg: 'lodash', ver: '<4.17.21', reason: 'Prototype pollution (CVE-2020-28502)' },
        { pkg: 'minimist', ver: '<1.2.6', reason: 'Prototype pollution (CVE-2021-44906)' },
        { pkg: 'ansi-regex', ver: '<5.0.1', reason: 'ReDoS (CVE-2021-3807)' },
        { pkg: 'nth-check', ver: '<2.0.1', reason: 'ReDoS (CVE-2021-3803)' },
        { pkg: 'node-forge', ver: '<1.3.1', reason: 'Prototype pollution (CVE-2022-24773)' },
        { pkg: 'underscore', ver: '<1.13.1', reason: 'Arbitrary code injection (CVE-2021-23358)' },
        { pkg: 'shelljs', ver: '<0.8.5', reason: 'Privilege escalation (CVE-2022-0144)' },
        { pkg: 'immer', ver: '<9.0.6', reason: 'Prototype pollution (CVE-2021-23436)' },
        { pkg: 'json5', ver: '<2.2.2', reason: 'Prototype pollution (CVE-2022-46175)' },
        { pkg: 'qs', ver: '<6.7.3', reason: 'Prototype pollution (CVE-2022-24999)' },
        { pkg: 'semver', ver: '<7.5.2', reason: 'ReDoS (CVE-2022-25883)' },
        { pkg: 'follow-redirects', ver: '<1.15.4', reason: 'Credentials leak (CVE-2024-28849)' },
      ];
      for (const vuln of knownVuln) {
        const depMatch = line.match(new RegExp(`"${vuln.pkg}"\\s*:\\s*"(\\^|~|>=?)?(\\d+\\.\\d+\\.\\d+)"`));
        if (depMatch) {
          violations.push({
            rule: 'OWASP_A06_VULN_DEP',
            severity: 'high', category: 'owasp',
            message: `Known vulnerable dependency: ${vuln.pkg}@${depMatch[2]}. ${vuln.reason} (OWASP A06).`,
            file, line: i + 1, match: depMatch[0].slice(0, 60),
            recommendation: `Update ${vuln.pkg} to latest version. Run \`npm audit\` for full assessment.`,
          });
        }
      }
    }

    // ── A07: Authentication Failures ──────────────────────────────────

    if (isBackend && !isTestFile) {
      const tokenInUrl = line.match(/['"`].*\?(.*)(access_token|token|api_key|secret|auth|jwt)=/i);
      if (tokenInUrl && !/example|sample|test/i.test(line)) {
        violations.push({
          rule: 'OWASP_A07_TOKEN_IN_URL',
          severity: 'high', category: 'owasp',
          message: 'Sensitive token in URL query string. Exposed in server logs, referrer headers, browser history (OWASP A07).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Send tokens in Authorization header (Bearer scheme). Never put credentials in URLs.',
        });
      }

      if (/\balgorithm\s*[:=]\s*['"`]none['"`]/i.test(line) || /alg\s*[:=]\s*['"`]none['"`]/i.test(line)) {
        violations.push({
          rule: 'OWASP_A07_WEAK_JWT',
          severity: 'critical', category: 'owasp',
          message: 'JWT "none" algorithm configured. Enables token forgery without a secret (OWASP A07).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Never allow "none" algorithm. Use RS256 or ES256 for JWT signing.',
        });
      }
    }

    // ── A08: Integrity Failures ───────────────────────────────────────

    if (isBackend && !isTestFile) {
      if (/\bpickle\.loads\b|\bunpickle\b/i.test(line)) {
        violations.push({
          rule: 'OWASP_A08_DESERIALIZATION_PICKLE',
          severity: 'critical', category: 'owasp',
          message: 'Python pickle/unpickle detected. Arbitrary code execution during deserialization (OWASP A08).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Use JSON or safer serialization. Never deserialize untrusted data with pickle.',
        });
      }

      if (/\b(Yaml\.load|yaml_load|parse_yaml)\s*\(/i.test(line) && !/safe/i.test(line)) {
        violations.push({
          rule: 'OWASP_A08_YAML_LOAD',
          severity: 'high', category: 'owasp',
          message: 'Unsafe YAML deserialization. Use yaml.safe_load() to prevent code execution (OWASP A08).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Use yaml.safe_load() instead of yaml.load(). Never deserialize untrusted YAML without restrictions.',
        });
      }

      if (/\b(Object\.assign|_.merge|_.mergeWith|_.extend|\$\.extend|mergeDeep|merge)\s*\(/.test(line) && hasUserInput(line)) {
        violations.push({
          rule: 'OWASP_A08_PROTOTYPE_POLLUTION',
          severity: 'high', category: 'owasp',
          message: 'Potential prototype pollution — unsafe object merge with untrusted input (OWASP A08).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Use Object.assign with Object.create(null) or use merge functions that reject __proto__ keys.',
        });
      }

      if (/process\.env\.(NODE_ENV|APP_ENV)\s*(===|==)\s*['"`](development|dev)['"`]/i.test(line)) {
        violations.push({
          rule: 'OWASP_A08_ENV_CHECK',
          severity: 'low', category: 'owasp',
          message: 'Environment check for development mode. Ensure production does not run in dev mode (OWASP A08).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Verify NODE_ENV=production check covers all security-sensitive paths.',
        });
      }
    }

    // ── A09: Security Logging & Monitoring Failures ───────────────────
    // (Runtime checks: observability, incident response — in risk-detector.ts)

    if (isBackend && /console\.(log|debug|info)\s*\(.*\b(req\.body|request\.body|res\.body|response\.body|data|headers)\b/i.test(line)) {
      violations.push({
        rule: 'OWASP_A09_SENSITIVE_LOG',
        severity: 'medium', category: 'owasp',
        message: 'Full request body/data logged. May expose PII, credentials, or tokens (OWASP A09).',
        file, line: i + 1, match: trimmed.slice(0, 60),
        recommendation: 'Log metadata only. Use structured logging with automatic PII redaction.',
      });
    }

    // ── A10: SSRF ─────────────────────────────────────────────────────

    if (isBackend && !isTestFile) {
      const fetcher = line.match(/\b(fetch|axios|got|node-fetch|request|superagent|urllib|httpx\.(get|post)|requests\.(get|post)|net\/http\.Get|httpClient)\s*\(/i);
      if (fetcher && hasUserInput(line)) {
        const isSafe = /localhost|127\.0\.0\.1|example\.com/i.test(line);
        if (!isSafe) {
          violations.push({
            rule: 'OWASP_A10_SSRF',
            severity: 'critical', category: 'owasp',
            message: `Server-side request with user-controlled URL via ${fetcher[1]}(). SSRF vulnerability (OWASP A10).`,
            file, line: i + 1, match: trimmed.slice(0, 60),
            recommendation: 'Validate and allowlist target URLs. Block private IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).',
          });
        }
      }

      if (/\b(followRedirect|follow_redirect|maxRedirects|allowRedirect)\s*[:=]\s*(true|1|yes)\b/i.test(line)) {
        violations.push({
          rule: 'OWASP_A10_REDIRECT_FOLLOW',
          severity: 'medium', category: 'owasp',
          message: 'Redirect following enabled on HTTP client. Can amplify SSRF attacks (OWASP A10).',
          file, line: i + 1, match: trimmed.slice(0, 60),
          recommendation: 'Disable redirects or set maxRedirects=0. Validate target URLs before each request.',
        });
      }
    }
  }

  // ── File-level checks (run once per file) ─────────────────────────

  // A05/XSS: Check for multiple XSS vectors (only once, not per line)
  if (isFrontend && !isTestFile) {
    if (/\.innerHTML\s*=/.test(content)) {
      violations.push({
        rule: 'OWASP_XSS_INNERHTML',
        severity: 'high', category: 'owasp',
        message: 'Unsafe DOM manipulation via innerHTML. Cross-Site Scripting (OWASP A03/XSS).',
        file, line: 0, match: (content.match(/\.innerHTML\s*=/)?.[0] || 'innerHTML=').slice(0, 60),
        recommendation: 'Use textContent or sanitize with DOMPurify before setting innerHTML.',
      });
    }
    if (/dangerouslySetInnerHTML/i.test(content)) {
      violations.push({
        rule: 'OWASP_XSS_DANGEROUSLY_SET',
        severity: 'high', category: 'owasp',
        message: 'React dangerouslySetInnerHTML detected. Renders raw HTML (OWASP A03/XSS).',
        file, line: 0, match: 'dangerouslySetInnerHTML',
        recommendation: 'Avoid dangerouslySetInnerHTML. Use React components or sanitize with DOMPurify.',
      });
    }
    if (/v-html\s*=/.test(content)) {
      violations.push({
        rule: 'OWASP_XSS_V_HTML',
        severity: 'high', category: 'owasp',
        message: 'Vue v-html directive detected. Renders raw HTML (OWASP A03/XSS).',
        file, line: 0, match: 'v-html',
        recommendation: 'Avoid v-html. Use Vue components with scoped slots for dynamic content.',
      });
    }
    if (/document\.write\s*\(/.test(content)) {
      violations.push({
        rule: 'OWASP_XSS_DOC_WRITE',
        severity: 'critical', category: 'owasp',
        message: 'document.write() detected. Can execute arbitrary scripts (OWASP A03/XSS).',
        file, line: 0, match: 'document.write(',
        recommendation: 'Use DOM manipulation methods (createElement, textContent) instead of document.write.',
      });
    }
    if (/eval\s*\(/.test(content)) {
      violations.push({
        rule: 'OWASP_XSS_EVAL',
        severity: 'critical', category: 'owasp',
        message: 'eval() in frontend code. XSS vector if user input reaches eval (OWASP A03).',
        file, line: 0, match: 'eval(',
        recommendation: 'Remove eval() calls. Use JSON.parse or Function constructors only with sandboxed input.',
      });
    }
  }

  // A06: Check for deprecated packages in package.json
  if (file.endsWith('package.json')) {
    const deprecatedPkgs = [
      { pkg: 'request', reason: 'Fully deprecated. No longer maintained.' },
      { pkg: 'gulp', reason: 'Legacy build tool. Consider Vite or esbuild.' },
      { pkg: 'bower', reason: 'Deprecated package manager.' },
      { pkg: 'coffeescript', reason: 'Deprecated language. Use TypeScript.' },
      { pkg: 'moment', reason: 'Legacy date library. Use dayjs or date-fns.' },
      { pkg: 'jade', reason: 'Renamed to pug. Use pug instead.' },
    ];
    for (const dep of deprecatedPkgs) {
      if (new RegExp(`"${dep.pkg}"\\s*:`).test(content)) {
        violations.push({
          rule: 'OWASP_A06_DEPRECATED_DEP',
          severity: 'medium', category: 'owasp',
          message: `Deprecated package: ${dep.pkg}. ${dep.reason} (OWASP A06).`,
          file, line: 0, match: dep.pkg,
          recommendation: `Replace ${dep.pkg} with a maintained alternative.`,
        });
      }
    }
  }

  // A07: Weak password policy
  if (file.endsWith('.env.example') || /password.*policy|password.*rule|auth.*config/i.test(file)) {
    const noMinLength = !/\bmin(?:Length|_length|imumLength)\s*[>:]\s*[89]/i.test(content);
    if (noMinLength && /\b(password|senha)\b/i.test(content)) {
      violations.push({
        rule: 'OWASP_A07_WEAK_POLICY',
        severity: 'medium', category: 'owasp',
        message: 'No minimum password length ≥8 found. Weak password policy (OWASP A07).',
        file, line: 0, match: 'password policy',
        recommendation: 'Enforce minimum password length of 8+ with complexity requirements.',
      });
    }
  }

  return violations;
}

function scanSecretsViolations(content: string, file: string): CodeViolation[] {
  const violations: CodeViolation[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;

    // Live API keys (sk_live_, pk_live_, etc.)
    const liveKeyMatch = line.match(/\b(sk_live_|pk_live_|sk-test-|pk-test-)[A-Za-z0-9]{10,}\b/);
    if (liveKeyMatch) {
      violations.push({
        rule: 'SECRET_LIVE_API_KEY',
        severity: 'critical',
        category: 'gdpr',
        message: 'Live API key exposed in code. Immediate rotation required.',
        file, line: i + 1, match: liveKeyMatch[0].slice(0, 30),
        recommendation: 'Use environment variables or secrets manager. Rotate the exposed key immediately.',
      });
    }

    // Hardcoded credentials (password, senha, api_key, etc.)
    const credMatch = line.match(/\b(password|senha|passwd|api_key|api_secret|access_token|auth_token|secret_key)\s*[:=]\s*["'][^"']{4,}["']/i);
    if (credMatch) {
      violations.push({
        rule: 'SECRET_HARDCODED_CREDENTIAL',
        severity: 'critical',
        category: 'gdpr',
        message: 'Hardcoded credential detected. Credentials must use environment variables.',
        file, line: i + 1, match: credMatch[0].slice(0, 40),
        recommendation: `Replace with process.env.${credMatch[1].toUpperCase()}`,
      });
    }

    // Generic secrets (sk-, AIza, eyJ for JWT)
    const secretMatch = line.match(/\b(sk-[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{10,}|eyJ[A-Za-z0-9_-]{10,})\b/);
    if (secretMatch) {
      violations.push({
        rule: 'SECRET_INLINE_TOKEN',
        severity: 'high',
        category: 'gdpr',
        message: 'Potential API key or JWT token hardcoded in source.',
        file, line: i + 1, match: secretMatch[0].slice(0, 30),
        recommendation: 'Move to environment variables. Never commit tokens to source control.',
      });
    }
  }

  return violations;
}

function scanPIIViolations(content: string, file: string): CodeViolation[] {
  const violations: CodeViolation[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Hardcoded emails
    const emailMatch = line.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch) {
      violations.push({
        rule: 'GDPR_EMAIL_HARDCODED',
        severity: 'medium',
        category: 'gdpr',
        message: 'Hardcoded email address. Potential personal data exposure.',
        file, line: i + 1, match: emailMatch[0].slice(0, 40),
        recommendation: 'Use placeholder ([REDACTED]) or configuration instead of hardcoded email.',
      });
    }

    // Sensitive data in console.log
    const logMatch = line.match(/console\.(log|debug|info|warn|error)\s*\(.*(email|user|password|token|creds|cpf|ssn|secret).*\)/i);
    if (logMatch) {
      violations.push({
        rule: 'GDPR_LOGGING_SENSITIVE',
        severity: 'high',
        category: 'gdpr',
        message: 'Sensitive data may be logged. GDPR prohibits logging personal data without justification.',
        file, line: i + 1, match: logMatch[0].slice(0, 60),
        recommendation: 'Remove sensitive data from logs or use structured logging with redaction.',
      });
    }
  }

  return violations;
}

function scanShadowAPIViolations(content: string, file: string): CodeViolation[] {
  const violations: CodeViolation[] = [];
  const lines = content.split('\n');
  const routePatterns = [
    /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/,
    /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*\(\s*(?:value\s*=\s*)?['"`]([^'"`]+)['"`]/,
    /@(?:app|router)\.(?:route|get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of routePatterns) {
      const match = line.match(pattern);
      if (!match) continue;

      const routePath = match[2] || match[3];
      if (!routePath) continue;

      // Check for documentation in preceding lines
      let hasDoc = false;
      for (let j = Math.max(0, i - 10); j < i; j++) {
        if (/@swagger|@openapi|@api|@operation|summary:|@param|@returns|@description|\/\*\*|"""|''''''/.test(lines[j])) {
          hasDoc = true;
          break;
        }
      }

      if (!hasDoc) {
        const isCritical = /admin|auth|login|reset|key|secret/.test(routePath);
        violations.push({
          rule: isCritical ? 'SHADOW_API_CRITICAL' : 'SHADOW_API',
          severity: isCritical ? 'critical' : 'high',
          category: 'shadow_api',
          message: `Undocumented API endpoint: ${routePath}. Missing OpenAPI/Swagger documentation.`,
          file, line: i + 1, match: routePath.slice(0, 60),
          recommendation: isCritical
            ? 'Add authentication, rate limiting, and OpenAPI documentation.'
            : 'Document with OpenAPI/Swagger annotations.',
        });
      }
    }
  }

  return violations;
}

export function scanCodeViolations(fileContents: Map<string, string>): {
  violations: CodeViolation[];
  summary: string;
} {
  const allViolations: CodeViolation[] = [];

  fileContents.forEach((content, file) => {
    if (content.length > 500000) return;
    allViolations.push(...scanPCIViolations(content, file));
    allViolations.push(...scanOWASPViolations(content, file));
    allViolations.push(...scanSecretsViolations(content, file));
    allViolations.push(...scanPIIViolations(content, file));
    allViolations.push(...scanShadowAPIViolations(content, file));
  });

  // ── Legacy bridge: GDPR, LGPD, CCPA, PCI, HIPAA, OWASP, AI-Act, Shadow-API ──
  const legacyViolations = runLegacyScannersOnFileMap(fileContents);

  // Deduplicate: drop legacy findings that are already covered by new scanner
  // (same rule+file+line combination)
  const existingKeys = new Set(
    allViolations.map(v => `${v.rule}:${v.file}:${v.line}`),
  );
  for (const lv of legacyViolations) {
    const key = `${lv.rule}:${lv.file}:${lv.line}`;
    if (!existingKeys.has(key)) {
      allViolations.push(lv);
      existingKeys.add(key);
    }
  }

  const criticalCount = allViolations.filter(v => v.severity === 'critical').length;
  const highCount = allViolations.filter(v => v.severity === 'high').length;
  const byCategory = new Map<string, number>();
  for (const v of allViolations) {
    byCategory.set(v.category, (byCategory.get(v.category) ?? 0) + 1);
  }

  return {
    violations: allViolations,
    summary: `${allViolations.length} violações: ${criticalCount} críticas, ${highCount} altas. Categorias: ${Array.from(byCategory.entries()).map(([k, c]) => `${k}=${c}`).join(', ')}.`,
  };
}
