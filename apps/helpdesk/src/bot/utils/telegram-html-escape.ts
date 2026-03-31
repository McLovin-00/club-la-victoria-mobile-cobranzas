/**
 * Utilidades para mensajes con parse_mode HTML en la API de Telegram.
 */

const MAX_TELEGRAM_HTML_TEXT = 5000;

/**
 * Escapa texto para parse_mode HTML de Telegram (evita rotura por <>&).
 */
export function escapeTelegramHtml(text: string): string {
  const bounded = text.slice(0, MAX_TELEGRAM_HTML_TEXT);
  return bounded.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
