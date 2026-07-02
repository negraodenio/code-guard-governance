import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class GithubService {
    private git: SimpleGit;
    private tempDir: string;

    constructor() {
        this.git = simpleGit();
        this.tempDir = path.join(os.tmpdir(), 'codeguard-scans');

        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Validates if a string is a git URL
     */
    isValidUrl(url: string): boolean {
        try {
            const trimmed = url.trim();
            // Allow http, https, git, ssh
            return /^(?:http|https|git|ssh)(?::\/\/|@)/.test(trimmed);
        } catch {
            return false;
        }
    }

    /**
     * Clones a repository to a temporary directory
     * @param url Repository URL
     * @param token Optional Git Token (PAT)
     */
    async cloneRepo(url: string, token?: string): Promise<string> {
        let finalUrl = url;

        // Inject token if provided (Basic Auth)
        if (token) {
            // Check if https
            if (url.startsWith('https://')) {
                const urlWithoutProtocol = url.replace('https://', '');
                finalUrl = `https://${token}@${urlWithoutProtocol}`;
            }
        }

        const repoName = this.extractRepoName(url);
        const timestamp = Date.now();
        const destPath = path.join(this.tempDir, `${repoName}_${timestamp}`);

        if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
        }

        fs.mkdirSync(destPath, { recursive: true });

        console.error(`[GithubService] Cloning ${url} to ${destPath}...`);

        try {
            await this.git.clone(finalUrl, destPath);
            return destPath;
        } catch (error) {
            console.error('[GithubService] Clone failed:', error);
            throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extracts repo name from URL
     */
    private extractRepoName(url: string): string {
        const parts = url.split('/');
        let name = parts[parts.length - 1];
        if (name.endsWith('.git')) {
            name = name.replace('.git', '');
        }
        return name;
    }

    /**
     * Clean up a scanned directory
     */
    async cleanup(pathToRemove: string): Promise<void> {
        if (pathToRemove.startsWith(this.tempDir) && fs.existsSync(pathToRemove)) {
            fs.rmSync(pathToRemove, { recursive: true, force: true });
        }
    }
}
