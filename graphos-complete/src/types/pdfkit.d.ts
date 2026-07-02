declare module 'pdfkit' {
  import { EventEmitter } from 'events';
  interface PDFDocumentOptions {
    margin?: number;
    size?: string | [number, number];
    [key: string]: unknown;
  }
  class PDFDocument extends EventEmitter {
    constructor(options?: PDFDocumentOptions);
    font(src: string, family?: string): this;
    fontSize(size: number): this;
    text(text: string, options?: Record<string, unknown>): this;
  text(text: string, x: number, y: number, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    image(path: string, x?: number, y?: number, options?: Record<string, unknown>): this;
    rect(x: number, y: number, w: number, h: number): this;
    fill(color: string): this;
    fillColor(color: string): this;
    strokeColor(color: string): this;
    lineWidth(w: number): this;
    stroke(): this;
    save(): this;
    restore(): this;
    end(): void;
    pipe(dest: NodeJS.WritableStream): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    page: { width: number; height: number };
  }
  export default PDFDocument;
}
