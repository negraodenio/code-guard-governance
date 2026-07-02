export function chunkByLines(input: { text: string; filePath: string; maxLines?: number }) {
    const maxLines = input.maxLines ?? 120;
    const lines = input.text.split('\n');

    const out: Array<{ startLine: number; endLine: number; content: string }> = [];
    for (let i = 0; i < lines.length; i += maxLines) {
        const start = i + 1;
        const end = Math.min(i + maxLines, lines.length);
        const content = lines.slice(i, end).join('\n');
        out.push({ startLine: start, endLine: end, content });
    }
    return out;
}
