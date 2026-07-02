import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface RepoChunk {
    filePath: string;
    content: string;
    startLine?: number;
    endLine?: number;
}

export async function chunkRepoFile(filePath: string, content: string): Promise<RepoChunk[]> {
    console.log(`[Repo Chunker] Chunking file: ${filePath}`);

    // Extension-based chunking configuration
    const ext = filePath.substring(filePath.lastIndexOf('.'));

    // Default fallback chunker
    let splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200,
    });

    // Custom separators based on language to keep functions together
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1500,
            chunkOverlap: 150,
            separators: ["\nfunction ", "\nclass ", "\nconst ", "\nexport ", "\n\n", "\n", " ", ""],
        });
    } else if (['.py'].includes(ext)) {
        splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1500,
            chunkOverlap: 150,
            separators: ["\ndef ", "\nclass ", "\n\n", "\n", " ", ""],
        });
    }

    const docs = await splitter.createDocuments([content]);

    return docs.map(doc => ({
        filePath,
        content: doc.pageContent,
        // We could extract line numbers later using more advanced AST parsers if needed.
    }));
}
