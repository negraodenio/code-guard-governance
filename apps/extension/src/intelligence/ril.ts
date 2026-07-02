/**
 * Repo Intelligence Layer (RIL) v2.0
 * 
 * Camada de inteligência de repositório que:
 * - Indexa estrutura do projeto
 * - Constrói grafo de dependências
 * - Identifica arquivos sensíveis (secrets, auth, payment)
 * - Analisa fluxos de dados cross-file
 */

import { vscode } from '../utils/vscode-compat';
import type * as vscodeTypes from 'vscode';
import * as path from 'path';
import { CodingMemory } from './memory';
import { getLLMRouter } from '../core/llm-router';

export interface FileNode {
    path: string;
    relativePath: string;
    type: 'file' | 'directory';
    language: string;
    size: number;
    lastModified: Date;
    imports: string[];
    exports: string[];
    dependencies: string[];
    sensitivityScore: number;
    sensitivityReasons: string[];
    children?: FileNode[];
}

export interface DependencyGraph {
    nodes: Map<string, FileNode>;
    edges: Map<string, string[]>; // file -> [dependencies]
    cycles: string[][];
    entryPoints: string[];
    sensitiveFiles: string[];
}

export interface RepoContext {
    rootPath: string;
    files: FileNode[];
    graph: DependencyGraph;
    frameworks: string[];
    totalTokens: number;
    sensitivePatterns: string[];
}

export interface DataFlow {
    source: string;
    sink: string;
    dataType: 'user_input' | 'credentials' | 'pii' | 'payment' | 'unknown';
    path: string[];
    risk: 'critical' | 'high' | 'medium' | 'low';
}

const SENSITIVE_PATTERNS = {
    auth: /auth|login|password|credential|session|token|jwt|oauth/i,
    payment: /payment|stripe|paypal|credit.?card|billing|checkout/i,
    pii: /personal|gdpr|lgpd|user.?data|email|phone|address|cpf|ssn/i,
    secrets: /secret|api.?key|private.?key|env|config|\.env/i,
    security: /crypto|encrypt|decrypt|hash|salt|signature/i,
};

const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.php'];
const IGNORE_DIRS = ['node_modules', '.git', 'out', 'dist', 'build', 'coverage', '__pycache__', '.next'];

export class RepoIntelligence {
    private router = getLLMRouter();
    private memory?: CodingMemory;
    private graph: DependencyGraph;
    private rootPath: string = '';

    constructor(config?: { memory?: CodingMemory }) {
        this.memory = config?.memory;
        this.graph = {
            nodes: new Map(),
            edges: new Map(),
            cycles: [],
            entryPoints: [],
            sensitiveFiles: []
        };
    }

    /**
     * Index entire repository
     */
    async indexRepository(projectPath: string): Promise<RepoContext> {
        this.rootPath = projectPath;
        console.error(`[RepoIntelligence] Indexando repositório: ${projectPath}`);

        const files: FileNode[] = [];
        let totalTokens = 0;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "CodeGuard: Indexando repositório...",
            cancellable: true
        }, async (progress: any, token: any) => {
            await this.scanDirectory(projectPath, files, progress, token);
        });

        // Calculate total tokens
        for (const file of files) {
            totalTokens += Math.ceil(file.size / 4); // ~4 chars per token
            this.graph.nodes.set(file.path, file);
        }

        console.error(`[RepoIntelligence] ${files.length} arquivos indexados, ~${totalTokens} tokens`);

        return {
            rootPath: projectPath,
            files,
            graph: this.graph,
            frameworks: this.detectFrameworks(files),
            totalTokens,
            sensitivePatterns: Object.keys(SENSITIVE_PATTERNS)
        };
    }

    /**
     * Build dependency graph
     */
    async buildDependencyGraph(context: RepoContext): Promise<DependencyGraph> {
        console.error('[RepoIntelligence] Construindo grafo de dependências...');

        for (const file of context.files) {
            if (file.type !== 'file') continue;

            // Parse imports and build edges
            const deps = this.resolveImports(file.imports, file.path, context.rootPath);
            this.graph.edges.set(file.path, deps);
        }

        // Detect cycles
        this.graph.cycles = this.detectCycles();

        // Find entry points (files with no dependents)
        this.graph.entryPoints = this.findEntryPoints();

        console.error(`[RepoIntelligence] Grafo: ${this.graph.nodes.size} nós, ${this.countEdges()} arestas, ${this.graph.cycles.length} ciclos`);

        return this.graph;
    }

    /**
     * Identify sensitive files
     */
    async identifySensitiveFiles(context: RepoContext): Promise<string[]> {
        const sensitiveFiles: string[] = [];

        for (const file of context.files) {
            if (file.sensitivityScore > 0.5) {
                sensitiveFiles.push(file.path);
                this.graph.sensitiveFiles.push(file.path);
            }
        }

        console.error(`[RepoIntelligence] ${sensitiveFiles.length} arquivos sensíveis identificados`);
        return sensitiveFiles;
    }

    /**
     * Analyze data flows across files
     */
    async analyzeDataFlows(files: string[]): Promise<DataFlow[]> {
        const flows: DataFlow[] = [];

        // Simple heuristic: track variable names containing sensitive patterns
        for (const filePath of files) {
            const node = this.graph.nodes.get(filePath);
            if (!node) continue;

            // Check if file exports sensitive data
            for (const exp of node.exports) {
                if (this.isSensitiveIdentifier(exp)) {
                    // Find all files that import this
                    const importers = this.findImporters(filePath);

                    for (const importer of importers) {
                        flows.push({
                            source: filePath,
                            sink: importer,
                            dataType: this.classifyDataType(exp),
                            path: [filePath, importer],
                            risk: this.calculateFlowRisk(filePath, importer)
                        });
                    }
                }
            }
        }

        return flows;
    }

    /**
     * Get files in a module
     */
    getModuleFiles(modulePath: string): string[] {
        const moduleFiles: string[] = [];
        const moduleDir = path.dirname(modulePath);

        for (const [filePath, _] of this.graph.nodes) {
            if (filePath.startsWith(moduleDir)) {
                moduleFiles.push(filePath);
            }
        }

        return moduleFiles;
    }

    // ============ PRIVATE METHODS ============

    private async scanDirectory(
        dirPath: string,
        files: FileNode[],
        progress: vscodeTypes.Progress<{ message?: string }>,
        token: vscodeTypes.CancellationToken
    ): Promise<void> {
        if (token.isCancellationRequested) return;

        try {
            const uri = vscode.Uri.file(dirPath);
            const entries = await vscode.workspace.fs.readDirectory(uri);

            for (const [name, type] of entries) {
                if (IGNORE_DIRS.includes(name)) continue;
                if (name.startsWith('.')) continue;

                const fullPath = path.join(dirPath, name);

                if (type === vscode.FileType.Directory) {
                    await this.scanDirectory(fullPath, files, progress, token);
                } else if (type === vscode.FileType.File) {
                    const ext = path.extname(name).toLowerCase();
                    if (SUPPORTED_EXTENSIONS.includes(ext)) {
                        progress.report({ message: `Indexando ${name}...` });
                        const fileNode = await this.analyzeFile(fullPath);
                        files.push(fileNode);
                    }
                }
            }
        } catch (error) {
            console.error('[RepoIntelligence] Erro ao escanear diretório:', error);
        }
    }

    private async analyzeFile(filePath: string): Promise<FileNode> {
        try {
            const uri = vscode.Uri.file(filePath);
            const stat = await vscode.workspace.fs.stat(uri);
            const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));

            const imports = this.extractImports(content);
            const exports = this.extractExports(content);
            const { score, reasons } = this.calculateSensitivity(filePath, content);

            const node: FileNode = {
                path: filePath,
                relativePath: path.relative(this.rootPath, filePath),
                type: 'file',
                language: this.detectLanguage(filePath),
                size: stat.size,
                lastModified: new Date(stat.mtime),
                imports,
                exports,
                dependencies: [],
                sensitivityScore: score,
                sensitivityReasons: reasons
            };

            // Index in memory if available
            if (this.memory) {
                await this.memory.indexFile(filePath, content);
            }

            return node;
        } catch (error) {
            console.error('[RepoIntelligence] Erro ao analisar arquivo:', filePath, error);
            return {
                path: filePath,
                relativePath: path.relative(this.rootPath, filePath),
                type: 'file',
                language: 'unknown',
                size: 0,
                lastModified: new Date(),
                imports: [],
                exports: [],
                dependencies: [],
                sensitivityScore: 0,
                sensitivityReasons: []
            };
        }
    }

    private extractImports(content: string): string[] {
        const imports: string[] = [];
        const patterns = [
            /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
            /import\s+['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /from\s+(\S+)\s+import/g,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1] && !imports.includes(match[1])) {
                    imports.push(match[1]);
                }
            }
        }

        return imports;
    }

    private extractExports(content: string): string[] {
        const exports: string[] = [];
        const patterns = [
            /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g,
            /export\s+default\s+(?:function|class)?\s*(\w+)?/g,
            /module\.exports\s*=\s*{([^}]+)}/g,
            /exports\.(\w+)\s*=/g,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1]) {
                    const names = match[1].split(',').map(s => s.trim());
                    exports.push(...names.filter(n => n && !exports.includes(n)));
                }
            }
        }

        return exports;
    }

    private calculateSensitivity(filePath: string, content: string): { score: number; reasons: string[] } {
        let score = 0;
        const reasons: string[] = [];
        const fileName = path.basename(filePath).toLowerCase();
        const combined = fileName + '\n' + content;

        for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
            const matches = combined.match(pattern);
            if (matches) {
                score += 0.2;
                reasons.push(`${type}: ${matches.length} ocorrências`);
            }
        }

        // Boost for specific file patterns
        if (fileName.includes('secret') || fileName.includes('env')) score += 0.3;
        if (fileName.includes('auth') || fileName.includes('login')) score += 0.2;
        if (fileName.includes('payment') || fileName.includes('stripe')) score += 0.2;

        return { score: Math.min(score, 1), reasons };
    }

    private resolveImports(imports: string[], fromFile: string, rootPath: string): string[] {
        const resolved: string[] = [];
        const fileDir = path.dirname(fromFile);

        for (const imp of imports) {
            // Skip external packages
            if (!imp.startsWith('.') && !imp.startsWith('/')) continue;

            let resolvedPath = path.resolve(fileDir, imp);

            // Try adding extensions
            for (const ext of SUPPORTED_EXTENSIONS) {
                const withExt = resolvedPath + ext;
                if (this.graph.nodes.has(withExt)) {
                    resolved.push(withExt);
                    break;
                }
                // Try index file
                const indexPath = path.join(resolvedPath, 'index' + ext);
                if (this.graph.nodes.has(indexPath)) {
                    resolved.push(indexPath);
                    break;
                }
            }
        }

        return resolved;
    }

    private detectCycles(): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const stack = new Set<string>();
        const path: string[] = [];

        const dfs = (node: string) => {
            if (stack.has(node)) {
                // Found cycle
                const cycleStart = path.indexOf(node);
                cycles.push(path.slice(cycleStart));
                return;
            }
            if (visited.has(node)) return;

            visited.add(node);
            stack.add(node);
            path.push(node);

            const deps = this.graph.edges.get(node) || [];
            for (const dep of deps) {
                dfs(dep);
            }

            stack.delete(node);
            path.pop();
        };

        for (const node of this.graph.nodes.keys()) {
            dfs(node);
        }

        return cycles;
    }

    private findEntryPoints(): string[] {
        const hasIncoming = new Set<string>();

        for (const deps of this.graph.edges.values()) {
            for (const dep of deps) {
                hasIncoming.add(dep);
            }
        }

        return Array.from(this.graph.nodes.keys()).filter(n => !hasIncoming.has(n));
    }

    private findImporters(filePath: string): string[] {
        const importers: string[] = [];

        for (const [file, deps] of this.graph.edges) {
            if (deps.includes(filePath)) {
                importers.push(file);
            }
        }

        return importers;
    }

    private countEdges(): number {
        let count = 0;
        for (const deps of this.graph.edges.values()) {
            count += deps.length;
        }
        return count;
    }

    private isSensitiveIdentifier(name: string): boolean {
        const lower = name.toLowerCase();
        return Object.values(SENSITIVE_PATTERNS).some(p => p.test(lower));
    }

    private classifyDataType(name: string): DataFlow['dataType'] {
        const lower = name.toLowerCase();
        if (SENSITIVE_PATTERNS.auth.test(lower)) return 'credentials';
        if (SENSITIVE_PATTERNS.payment.test(lower)) return 'payment';
        if (SENSITIVE_PATTERNS.pii.test(lower)) return 'pii';
        if (lower.includes('input') || lower.includes('form')) return 'user_input';
        return 'unknown';
    }

    private calculateFlowRisk(source: string, sink: string): DataFlow['risk'] {
        const sourceNode = this.graph.nodes.get(source);
        const sinkNode = this.graph.nodes.get(sink);

        if (!sourceNode || !sinkNode) return 'medium';

        const avgSensitivity = (sourceNode.sensitivityScore + sinkNode.sensitivityScore) / 2;

        if (avgSensitivity > 0.7) return 'critical';
        if (avgSensitivity > 0.5) return 'high';
        if (avgSensitivity > 0.3) return 'medium';
        return 'low';
    }

    private detectLanguage(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const map: Record<string, string> = {
            '.ts': 'typescript', '.tsx': 'typescript',
            '.js': 'javascript', '.jsx': 'javascript',
            '.py': 'python', '.java': 'java',
            '.go': 'go', '.rs': 'rust', '.php': 'php'
        };
        return map[ext] || 'unknown';
    }

    private detectFrameworks(files: FileNode[]): string[] {
        const frameworks: string[] = [];
        const fileNames = files.map(f => path.basename(f.path).toLowerCase());
        const imports = files.flatMap(f => f.imports);

        // React/Next.js
        if (imports.some(i => i.includes('react')) || fileNames.includes('next.config.js')) {
            frameworks.push('react');
        }
        // Vue
        if (imports.some(i => i.includes('vue')) || fileNames.some(f => f.endsWith('.vue'))) {
            frameworks.push('vue');
        }
        // Express
        if (imports.some(i => i.includes('express'))) {
            frameworks.push('express');
        }
        // Django/Flask
        if (imports.some(i => i.includes('django') || i.includes('flask'))) {
            frameworks.push('python-web');
        }

        return frameworks;
    }

    // Legacy static methods
    static async indexWorkspace(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const ril = new RepoIntelligence();
        await ril.indexRepository(workspaceFolders[0].uri.fsPath);
    }

    static async mapWorkspace(): Promise<FileNode[]> {
        return [];
    }
}

export default RepoIntelligence;
