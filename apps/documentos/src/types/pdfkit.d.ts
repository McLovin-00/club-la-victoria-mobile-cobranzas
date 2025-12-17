// Declaración de tipos para pdfkit (dynamic import)
// pdfkit debe instalarse como dependencia de runtime si se usa esta funcionalidad
declare module 'pdfkit' {
  interface PDFDocumentOptions {
    autoFirstPage?: boolean;
    size?: [number, number] | string;
    margin?: number;
    margins?: { top?: number; left?: number; bottom?: number; right?: number };
  }

  interface PDFDocument {
    on(event: 'data', callback: (chunk: Buffer) => void): this;
    on(event: 'end', callback: () => void): this;
    addPage(options?: { size?: [number, number] | string; margin?: number }): this;
    image(src: Buffer | string, x: number, y: number, options?: { width?: number; height?: number }): this;
    end(): void;
  }

  interface PDFDocumentConstructor {
    new(options?: PDFDocumentOptions): PDFDocument;
  }

  const PDFDocument: PDFDocumentConstructor;
  export default PDFDocument;
}

