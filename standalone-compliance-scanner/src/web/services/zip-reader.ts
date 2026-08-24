import JSZip from 'jszip';

export async function readZipFile(
  file: File,
  onProgress?: (msg: string, percent: number) => void
): Promise<{ name: string; files: Map<string, string> }> {
  onProgress?.('Descompactando arquivo ZIP no navegador...', 20);
  const zip = new JSZip();
  const zipData = await zip.loadAsync(file);
  const files = new Map<string, string>();

  const entries = Object.keys(zipData.files).filter(path => {
    const isDir = zipData.files[path].dir;
    if (isDir) return false;
    if (path.includes('__MACOSX') || path.includes('.git/') || path.includes('node_modules/')) return false;
    return true;
  });

  let count = 0;
  for (const path of entries) {
    const zipEntry = zipData.files[path];
    if (zipEntry.dir) continue;
    const text = await zipEntry.async('string');
    files.set(path, text);
    count++;
    onProgress?.(`Lendo ${count}/${entries.length}: ${path}`, 20 + Math.round((count / entries.length) * 70));
  }

  onProgress?.('Concluído!', 100);
  return {
    name: file.name.replace(/\.zip$/i, ''),
    files,
  };
}

export async function readFolderFiles(
  fileList: FileList,
  onProgress?: (msg: string, percent: number) => void
): Promise<{ name: string; files: Map<string, string> }> {
  const files = new Map<string, string>();
  let folderName = 'projeto-local';
  const total = fileList.length;

  for (let i = 0; i < total; i++) {
    const file = fileList[i];
    const path = file.webkitRelativePath || file.name;
    if (path.includes('node_modules/') || path.includes('.git/') || path.includes('dist/')) continue;
    
    if (i === 0 && file.webkitRelativePath) {
      folderName = file.webkitRelativePath.split('/')[0] || folderName;
    }

    try {
      const text = await file.text();
      files.set(path, text);
    } catch (e) {
      console.warn('Falha ao ler arquivo local:', path);
    }

    onProgress?.(`Lendo ${i + 1}/${total}: ${path}`, Math.round(((i + 1) / total) * 90));
  }

  return { name: folderName, files };
}
