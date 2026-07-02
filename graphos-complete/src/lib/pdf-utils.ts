// src/lib/pdf-utils.ts
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PDFOptions {
  filename?: string;
  scale?: number;
  backgroundColor?: string;
  onProgress?: (page: number, total: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<PDFOptions, 'onProgress'>> = {
  filename: 'relatorio.pdf',
  scale: 2,
  backgroundColor: '#050810',
};

/**
 * Exporta um elemento HTML para PDF com paginação correta
 * @param elementId - ID do elemento a ser exportado
 * @param options - Opções de configuração
 */
export async function exportToPDF(
  elementId: string, 
  options: PDFOptions = {}
): Promise<void> {
  const { filename, scale, backgroundColor, onProgress } = { 
    ...DEFAULT_OPTIONS, 
    ...options 
  };

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento com ID "${elementId}" não encontrado`);
  }

  // Aplica classe de otimização para impressão temporariamente
  const originalOverflow = element.style.overflow;
  element.style.overflow = 'visible';

  try {
    // 1. Captura o elemento completo com alta resolução
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      backgroundColor: backgroundColor,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      logging: false,
      allowTaint: false,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calcula dimensões mantendo proporção
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // 2. Paginação correta com recorte progressivo
    let currentY = 0; // Posição Y atual na imagem original (em mm)
    let pageCount = 0;
    const totalHeight = imgHeight;
    
    while (currentY < totalHeight) {
      const isFirstPage = pageCount === 0;
      
      if (!isFirstPage) {
        pdf.addPage();
      }
      
      // Calcula quanto espaço resta na página atual
      const remainingOnPage = Math.min(pdfHeight, totalHeight - currentY);
      
      // Calcula a altura da fatia em pixels (para recorte do canvas)
      const sliceHeightPx = (remainingOnPage / imgHeight) * canvas.height;
      const sourceYPx = (currentY / imgHeight) * canvas.height;
      
      // Cria um canvas temporário para a fatia da página
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.ceil(sliceHeightPx);
      
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Não foi possível obter contexto 2D para o canvas');
      }
      
      // Desenha apenas a fatia correspondente à página atual
      ctx.drawImage(
        canvas,
        0, sourceYPx,           // srcX, srcY - ponto de início na imagem original
        canvas.width, sliceHeightPx, // srcWidth, srcHeight - dimensões da fatia
        0, 0,                   // destX, destY - posição no canvas temporário
        sliceCanvas.width, sliceCanvas.height // destWidth, destHeight
      );
      
      const sliceData = sliceCanvas.toDataURL('image/png', 1.0);
      
      // Adiciona a fatia ao PDF
      pdf.addImage(sliceData, 'PNG', 0, 0, imgWidth, remainingOnPage, undefined, 'FAST');
      
      // Atualiza posição para a próxima página
      currentY += remainingOnPage;
      pageCount++;
      
      // Notifica progresso se callback fornecido
      if (onProgress) {
        onProgress(pageCount, Math.ceil(totalHeight / pdfHeight));
      }
    }
    
    // 3. Salva o PDF
    pdf.save(filename);
    
  } finally {
    // Restaura o estilo original
    element.style.overflow = originalOverflow;
  }
}

/**
 * Versão síncrona com Promise simplificada para uso em componentes
 */
export async function exportToPDFAsync(
  elementId: string,
  filename?: string
): Promise<boolean> {
  try {
    await exportToPDF(elementId, { filename });
    return true;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return false;
  }
}

/**
 * Pré-visualização em nova janela (útil para debug)
 */
export async function previewPDF(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 1.5,
    useCORS: true,
    backgroundColor: '#050810',
  });

  const previewWindow = window.open('', '_blank');
  if (!previewWindow) return;

  previewWindow.document.write(`
    <html>
      <head>
        <title>Pré-visualização PDF</title>
        <style>
          body { margin: 0; padding: 20px; background: #1a1a2e; display: flex; justify-content: center; }
          img { max-width: 100%; height: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        </style>
      </head>
      <body>
        <img src="${canvas.toDataURL()}" alt="Pré-visualização" />
      </body>
    </html>
  `);
  previewWindow.document.close();
}
