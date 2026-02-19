/**
 * Utilidades para normalización de fechas de vencimiento.
 *
 * Regla de negocio: un documento que "vence el 15/01/2026" es válido
 * durante el día completo (15 de enero) en horario argentino (UTC-3).
 *
 * Almacenamiento: se guarda como fin de día Argentina en UTC.
 *   "15/01/2026" → 2026-01-15 23:59:59.999 Argentina → 2026-01-16 02:59:59.999 UTC
 *
 * Esto evita que el cron de expiración marque documentos como vencidos
 * 3 horas antes de lo esperado (medianoche UTC = 21:00 Argentina del día anterior).
 */

/** Offset de Argentina respecto a UTC (sin horario de verano desde 2009) */
const ARGENTINA_OFFSET_HOURS = -3;

/**
 * Normaliza una fecha de vencimiento al fin del día en Argentina (UTC-3).
 *
 * Acepta:
 *   - Date object
 *   - ISO string "2026-01-15" o "2026-01-15T00:00:00.000Z"
 *   - DD/MM/YYYY string "15/01/2026"
 *
 * Retorna: Date con hora 02:59:59.999 UTC del día siguiente
 *          (= 23:59:59.999 Argentina del día de vencimiento)
 *
 * Si la fecha ya tiene hora > 12:00 UTC se asume que ya fue normalizada
 * y se retorna sin modificar (idempotencia).
 */
export function normalizeExpirationToEndOfDayAR(date: Date | string | null | undefined): Date | null {
  if (!date) return null;

  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else {
    d = new Date(date.getTime());
  }

  if (isNaN(d.getTime())) return null;

  // Idempotencia: si la hora UTC ya es > 12:00 y los minutos son 59,
  // asumimos que ya fue normalizada (fin de día Argentina)
  if (d.getUTCHours() >= 12 && d.getUTCMinutes() === 59) {
    return d;
  }

  // Extraer año, mes, día en UTC para reconstruir
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  // Fin del día en Argentina: 23:59:59.999 UTC-3 = agregar 3 horas a 23:59:59.999
  // = día siguiente 02:59:59.999 UTC
  const normalized = new Date(Date.UTC(
    year, month, day,
    23 - ARGENTINA_OFFSET_HOURS, // 23 - (-3) = 26 → overflow → día+1, hora 02
    59, 59, 999
  ));

  return normalized;
}

/**
 * Verifica si un documento está vencido considerando fin de día Argentina.
 *
 * Un documento con expiresAt normalizado ya incluye el día completo,
 * por lo que la comparación directa con `now` es correcta.
 */
export function isDocumentExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}
