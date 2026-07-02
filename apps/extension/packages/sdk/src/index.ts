/**
 * @codeguard/sdk
 * 
 * Universal SDK for CodeGuard AI Compliance API
 * Works with: Vercel, Lovable, Bolt, v0, React, Node.js
 */

// Types
export interface ScanRequest {
    /** Code to scan (for single-file scans) */
    code?: string;
    /** Multiple files to scan */
    files?: Array<{ path: string; content: string }>;
    /** Regulatory region */
    region: 'BR' | 'EU';
    /** Framework IDs to check (optional, checks all if not provided) */
    frameworks?: string[];
}

export interface ScanResult {
    success: boolean;
    result?: {
        files_analyzed: number;
        issues: ComplianceIssue[];
        summary: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
    };
    error?: string;
    usage?: {
        creditsUsed: number;
        tokensUsed: number;
        cost: number;
    };
}

export interface ComplianceIssue {
    id: string;
    file: string;
    line: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    rule_id: string;
    framework: string;
    description: string;
    recommendation: string;
    code_snippet?: string;
    code_fix?: string;
}

export interface PatchRequest {
    filePath: string;
    line: number;
    violation: string;
    code: string;
    ruleId?: string;
}

export interface PatchResult {
    success: boolean;
    patch?: {
        originalCode: string;
        fixedCode: string;
        description: string;
        confidence: number;
    };
    error?: string;
    creditsUsed?: number;
}

export interface CreditsResult {
    balance: number;
    email?: string;
    message?: string;
}

export interface CodeGuardConfig {
    /** API base URL (default: https://api.codeguard.ai) */
    baseUrl?: string;
    /** API Key for authentication */
    apiKey?: string;
    /** User email for credits */
    email?: string;
    /** Request timeout in ms (default: 30000) */
    timeout?: number;
}

// Client
export class CodeGuardClient {
    private config: Required<CodeGuardConfig>;

    constructor(config: CodeGuardConfig = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'https://api.codeguard.ai',
            apiKey: config.apiKey || '',
            email: config.email || '',
            timeout: config.timeout || 30000
        };
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.config.baseUrl}/api/v1${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {})
        };

        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        if (this.config.email) {
            headers['X-User-Email'] = this.config.email;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data as T;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Scan code for compliance issues
     */
    async scan(request: ScanRequest): Promise<ScanResult> {
        return this.request<ScanResult>('/scan', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    /**
     * Generate a patch for a specific violation
     */
    async patch(request: PatchRequest): Promise<PatchResult> {
        return this.request<PatchResult>('/patch', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    /**
     * Get credit balance
     */
    async getCredits(): Promise<CreditsResult> {
        const params = this.config.email ? `?email=${encodeURIComponent(this.config.email)}` : '';
        return this.request<CreditsResult>(`/credits${params}`, {
            method: 'GET'
        });
    }

    /**
     * Check API health
     */
    async health(): Promise<{ status: string; version: string }> {
        return this.request<{ status: string; version: string }>('/health', {
            method: 'GET'
        });
    }
}

// Convenience factory
export function createClient(config?: CodeGuardConfig): CodeGuardClient {
    return new CodeGuardClient(config);
}

// Default export
export default CodeGuardClient;
