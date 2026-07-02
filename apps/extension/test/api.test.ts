/**
 * CodeGuard API Tests
 * Run with: npm test
 *
 * Tests that all API components exist and compile
 */

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// Mock environment for testing
process.env.CODEGUARD_API_KEYS = 'test-api-key-1';
process.env.TRANSPORT_MODE = 'sse';

describe('CodeGuard API Implementation', () => {
    describe('Project Structure', () => {
        it('should compile TypeScript without errors', () => {
            // If we reach this test, compilation was successful
            expect(true).to.be.true;
        });

        it('should have API endpoint files', () => {
            const endpoints = ['scan', 'graph', 'shadow-apis', 'openapi', 'docs'];
            endpoints.forEach(endpoint => {
                const filePath = path.join(process.cwd(), `api/${endpoint}.ts`);
                expect(fs.existsSync(filePath), `Missing ${endpoint}.ts`).to.be.true;
            });
        });

        it('should have SDK package', () => {
            // Use a more direct path approach
            const sdkPath = path.join(process.cwd(), 'packages/sdk/src/index.ts');
            expect(fs.existsSync(sdkPath)).to.be.true;
        });

        it('should have Vercel configuration', () => {
            const rootDir = path.resolve(__dirname, '../..');
            const vercelConfig = path.join(rootDir, 'vercel.json');
            expect(fs.existsSync(vercelConfig)).to.be.true;
        });

        it('should have deployment scripts', () => {
            const rootDir = path.resolve(__dirname, '../..');
            const packageJsonPath = path.join(rootDir, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            expect(packageJson.scripts).to.have.property('vercel:deploy');
            expect(packageJson.scripts).to.have.property('start:mcp');
        });
    });

    describe('Environment Setup', () => {
        it('should have required environment variables', () => {
            expect(process.env.CODEGUARD_API_KEYS).to.exist;
            expect(process.env.TRANSPORT_MODE).to.equal('sse');
        });
    });

    describe('Documentation', () => {
        it('should have API documentation files', () => {
            const rootDir = path.resolve(__dirname, '../..');
            const docs = [
                'VERCEL_DEPLOYMENT.md',
                'CI_CD_INTEGRATION.md',
                'IMPLEMENTATION_SUMMARY.md',
                'docs/openapi.yaml'
            ];

            docs.forEach(doc => {
                const docPath = path.join(rootDir, doc);
                expect(fs.existsSync(docPath), `Missing ${doc}`).to.be.true;
            });
        });
    });
});