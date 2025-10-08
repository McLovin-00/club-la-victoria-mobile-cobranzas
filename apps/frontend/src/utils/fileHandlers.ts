import { validateFileSize, validateFileType } from './validators';

export type FilePreview = { url: string; revoke: () => void };

export function generateFilePreview(file: File): FilePreview {
  const url = URL.createObjectURL(file);
  const revoke = () => URL.revokeObjectURL(url);
  return { url, revoke };
}

export async function downloadFile(blob: Blob, filename: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}

export function validateBeforeUpload(file: File, allowedTypes: string[], maxBytes: number) {
  if (!validateFileType(file, allowedTypes)) {
    return `Tipo de archivo no permitido: ${file.type}`;
  }
  if (!validateFileSize(file, maxBytes)) {
    return `El archivo excede el tamaño máximo permitido (${Math.round(maxBytes/1024/1024)}MB)`;
  }
  return null;
}

// Placeholder de compresión de imagen (opcional)
export async function compressImage(file: File, quality = 0.8): Promise<File> {
  // En una siguiente fase se puede integrar compression real (browser-image-compression)
  return file;
}


