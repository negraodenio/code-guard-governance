// Use the standard module-alias registration which reads from package.json
// This is more robust in bundled serverless environments like Vercel
require('module-alias/register');

console.log('[CodeGuard Bootstrap]: VS Code Shim Registered via package.json aliases.');

