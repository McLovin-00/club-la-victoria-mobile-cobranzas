/**
 * Propósito: generar archivos "dummy" para cargas por UI (setInputFiles) sin depender de internet.
 *
 * Nota: usamos PNG mínimo (1x1) como placeholder; muchas pantallas aceptan PDF/imagen.
 * Si alguna pantalla valida tipo/contenido estrictamente, ajustamos acá sin tocar los tests.
 */

import type { FilePayload } from '@playwright/test';

// PNG 1x1 transparente (base64 corto).
const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6Xc0S8AAAAASUVORK5CYII=';

function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Crea un archivo PNG placeholder.
 */
export function createPngPlaceholder(params: { fileName: string }): FilePayload {
  return {
    name: params.fileName,
    mimeType: 'image/png',
    buffer: base64ToBuffer(tinyPngBase64),
  };
}

/**
 * Conveniencia: devuelve un set típico "frente/dorso" para documentos con dos caras.
 */
export function createFrontBackPlaceholders(params: { baseName: string }) {
  return {
    front: createPngPlaceholder({ fileName: `${params.baseName}-frente.png` }),
    back: createPngPlaceholder({ fileName: `${params.baseName}-dorso.png` }),
  };
}


