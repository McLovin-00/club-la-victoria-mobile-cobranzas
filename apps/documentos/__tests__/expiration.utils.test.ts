import {
  normalizeExpirationToEndOfDayAR,
  isDocumentExpired,
} from '../src/utils/expiration.utils';

describe('normalizeExpirationToEndOfDayAR', () => {
  it('retorna null para null', () => {
    expect(normalizeExpirationToEndOfDayAR(null)).toBeNull();
  });

  it('retorna null para undefined', () => {
    expect(normalizeExpirationToEndOfDayAR(undefined)).toBeNull();
  });

  it('retorna null para string inválida', () => {
    expect(normalizeExpirationToEndOfDayAR('invalid-date')).toBeNull();
    expect(normalizeExpirationToEndOfDayAR('')).toBeNull();
  });

  it('convierte Date a fin de día Argentina (23:59:59.999 UTC-3 = 02:59:59.999 UTC día siguiente)', () => {
    const input = new Date(Date.UTC(2026, 0, 15, 0, 0, 0, 0));
    const result = normalizeExpirationToEndOfDayAR(input);
    expect(result).not.toBeNull();
    expect(result!.getUTCFullYear()).toBe(2026);
    expect(result!.getUTCMonth()).toBe(0);
    expect(result!.getUTCDate()).toBe(16);
    expect(result!.getUTCHours()).toBe(2);
    expect(result!.getUTCMinutes()).toBe(59);
    expect(result!.getUTCSeconds()).toBe(59);
    expect(result!.getUTCMilliseconds()).toBe(999);
  });

  it('convierte string ISO "2026-01-15" a fin de día Argentina', () => {
    const result = normalizeExpirationToEndOfDayAR('2026-01-15');
    expect(result).not.toBeNull();
    expect(result!.getUTCDate()).toBe(16);
    expect(result!.getUTCHours()).toBe(2);
    expect(result!.getUTCMinutes()).toBe(59);
    expect(result!.getUTCSeconds()).toBe(59);
    expect(result!.getUTCMilliseconds()).toBe(999);
  });

  it('convierte string ISO con hora "2026-01-15T00:00:00.000Z" a fin de día Argentina', () => {
    const result = normalizeExpirationToEndOfDayAR('2026-01-15T00:00:00.000Z');
    expect(result).not.toBeNull();
    expect(result!.getUTCDate()).toBe(16);
    expect(result!.getUTCHours()).toBe(2);
    expect(result!.getUTCMinutes()).toBe(59);
    expect(result!.getUTCSeconds()).toBe(59);
    expect(result!.getUTCMilliseconds()).toBe(999);
  });

  it('es idempotente: si hora UTC >= 12 y minutos === 59, retorna sin modificar', () => {
    const yaNormalizada = new Date(Date.UTC(2026, 0, 16, 14, 59, 59, 999));
    const result = normalizeExpirationToEndOfDayAR(yaNormalizada);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(yaNormalizada.getTime());
  });

  it('es idempotente con hora 23:59 UTC', () => {
    const yaNormalizada = new Date(Date.UTC(2026, 0, 15, 23, 59, 59, 999));
    const result = normalizeExpirationToEndOfDayAR(yaNormalizada);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(yaNormalizada.getTime());
  });

  it('no es idempotente cuando minutos !== 59 (convierte a fin de día)', () => {
    const input = new Date(Date.UTC(2026, 0, 15, 14, 30, 0, 0));
    const result = normalizeExpirationToEndOfDayAR(input);
    expect(result).not.toBeNull();
    expect(result!.getUTCHours()).toBe(2);
    expect(result!.getUTCMinutes()).toBe(59);
    expect(result!.getUTCDate()).toBe(16);
  });

  it('no es idempotente cuando hora < 12 (convierte a fin de día)', () => {
    const input = new Date(Date.UTC(2026, 0, 15, 11, 59, 59, 999));
    const result = normalizeExpirationToEndOfDayAR(input);
    expect(result).not.toBeNull();
    expect(result!.getUTCHours()).toBe(2);
    expect(result!.getUTCMinutes()).toBe(59);
    expect(result!.getUTCDate()).toBe(16);
  });
});

describe('isDocumentExpired', () => {
  it('retorna false para expiresAt null', () => {
    expect(isDocumentExpired(null)).toBe(false);
  });

  it('retorna true cuando expiresAt <= now (documento vencido)', () => {
    const ayer = new Date(Date.now() - 86400000);
    const ahora = new Date();
    expect(isDocumentExpired(ayer, ahora)).toBe(true);
  });

  it('retorna false cuando expiresAt > now (documento vigente)', () => {
    const manana = new Date(Date.now() + 86400000);
    const ahora = new Date();
    expect(isDocumentExpired(manana, ahora)).toBe(false);
  });

  it('retorna true cuando expiresAt === now (límite exacto)', () => {
    const ahora = new Date();
    expect(isDocumentExpired(ahora, ahora)).toBe(true);
  });

  it('retorna true cuando expiresAt es un milisegundo antes de now', () => {
    const ahora = new Date();
    const unMsAntes = new Date(ahora.getTime() - 1);
    expect(isDocumentExpired(unMsAntes, ahora)).toBe(true);
  });

  it('retorna false cuando expiresAt es un milisegundo después de now', () => {
    const ahora = new Date();
    const unMsDespues = new Date(ahora.getTime() + 1);
    expect(isDocumentExpired(unMsDespues, ahora)).toBe(false);
  });
});
