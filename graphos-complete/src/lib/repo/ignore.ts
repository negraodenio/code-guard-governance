export function shouldIgnorePath(path: string) {
    const p = path.toLowerCase();

    const ignoredDirs = [
        'node_modules/', '.git/', '.next/', 'dist/', 'build/', '.vercel/',
        '.turbo/', '.cache/', 'coverage/', '.idea/', '.vscode/'
    ];
    if (ignoredDirs.some(d => p.includes(d))) return true;

    const ignoredExt = [
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf',
        '.zip', '.tar', '.gz', '.7z',
        '.mp4', '.mov', '.mp3', '.wav',
        '.lock'
    ];
    if (ignoredExt.some(ext => p.endsWith(ext))) return true;

    return false;
}
