const fs = require('fs');
const path = require('path');
const os = require('os');

const hookContent = `#!/bin/sh
# Demo Hook for CodeGuard

# Check if userService.ts is staged
if git diff --cached --name-only | grep -q "userService.ts"; then
    echo "❌ COMMIT BLOQUEADO - CodeGuard Compliance Check Failed"
    echo ""
    echo "Violations found:"
    echo "1. [CRITICAL] PII (CPF) stored without encryption (LGPD Art. 7)"
    echo "   File: userService.ts:6"
    echo "   "
    echo "2. [HIGH] Password detected in console.log (OWASP Top 10)"
    echo "   File: userService.ts:3"
    echo "   "
    echo "3. [MEDIUM] Missing explicit consent validation (GDPR Art. 6)"
    echo ""
    echo "Fix these issues or use --no-verify (not recommended)."
    echo "Suggested fixes available. Run 'codeguard fix' to auto-correct."
    exit 1
fi

exit 0
`;

const gitDir = path.join(process.cwd(), '.git');
const hooksDir = path.join(gitDir, 'hooks');
const preCommitPath = path.join(hooksDir, 'pre-commit');

if (!fs.existsSync(gitDir)) {
    console.error('❌ .git directory not found. Initialize git first.');
    process.exit(1);
}

if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir);
}

fs.writeFileSync(preCommitPath, hookContent, { mode: 0o755 });

console.log('✅ DEMO MODE ACTIVATED');
console.log('---');
console.log('1. Created .git/hooks/pre-commit');
console.log('2. The "git commit" command will now FAIL if you stage userService.ts');
console.log('3. Run "git add userService.ts" and then "git commit -m \'test\'" to see the block.');
