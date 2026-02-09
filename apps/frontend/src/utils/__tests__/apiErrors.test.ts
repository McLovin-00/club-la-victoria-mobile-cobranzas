/**
 * Tests para utilidades de manejo de errores de API
 */
import { describe, it, expect } from '@jest/globals';
import { getApiErrorMessage } from '../apiErrors';

describe('getApiErrorMessage', () => {
  it('retorna mensaje por defecto cuando error es null', () => {
    expect(getApiErrorMessage(null)).toBe('Ocurrió un error');
  });

  it('retorna mensaje por defecto cuando error es undefined', () => {
    expect(getApiErrorMessage(undefined)).toBe('Ocurrió un error');
  });

  it('extrae message de error.data.message', () => {
    const error = { data: { message: 'Error desde el servidor' } };
    expect(getApiErrorMessage(error)).toBe('Error desde el servidor');
  });

  it('extrae message de error.message cuando no hay data', () => {
    const error = { message: 'Error directo' };
    expect(getApiErrorMessage(error)).toBe('Error directo');
  });

  it('extrae error de error.error cuando no hay message', () => {
    const error = { error: 'Error alternativo' };
    expect(getApiErrorMessage(error)).toBe('Error alternativo');
  });

  it('retorna el string directamente cuando error es string', () => {
    expect(getApiErrorMessage('Error simple')).toBe('Error simple');
  });

  it('retorna mensaje por defecto cuando error es objeto vacío', () => {
    expect(getApiErrorMessage({})).toBe('Ocurrió un error');
  });

  it('prioriza data.message sobre message', () => {
    const error = { 
      data: { message: 'Mensaje prioritario' }, 
      message: 'Mensaje secundario' 
    };
    expect(getApiErrorMessage(error)).toBe('Mensaje prioritario');
  });

  it('convierte a string valores no-string', () => {
    const error = { data: { message: 123 } };
    expect(getApiErrorMessage(error)).toBe('123');
  });
});

