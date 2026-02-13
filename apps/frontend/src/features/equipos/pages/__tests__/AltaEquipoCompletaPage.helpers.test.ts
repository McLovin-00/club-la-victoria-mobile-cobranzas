/**
 * Tests para funciones helper de AltaEquipoCompletaPage
 * Tests unitarios simples para aumentar cobertura
 */
import { describe, it, expect } from '@jest/globals';
import { getEntityBadgeClass, getSubmitButtonText } from '../AltaEquipoCompletaPage';

describe('AltaEquipoCompletaPage - Helper Functions', () => {
  describe('getEntityBadgeClass', () => {
    it('devuelve clase azul cuando la entidad no existe', () => {
      expect(getEntityBadgeClass(false, false)).toBe('bg-blue-100 text-blue-800');
      expect(getEntityBadgeClass(false, true)).toBe('bg-blue-100 text-blue-800');
    });

    it('devuelve clase verde cuando existe y pertenece al solicitante', () => {
      expect(getEntityBadgeClass(true, true)).toBe('bg-green-100 text-green-800');
    });

    it('devuelve clase amarilla cuando existe pero no pertenece al solicitante', () => {
      expect(getEntityBadgeClass(true, false)).toBe('bg-yellow-100 text-yellow-800');
    });
  });

  describe('getSubmitButtonText', () => {
    it('devuelve texto de "Creando..." cuando está enviando', () => {
      expect(getSubmitButtonText(true, false)).toBe('Creando Equipo y Subiendo Documentos...');
      expect(getSubmitButtonText(true, true)).toBe('Creando Equipo y Subiendo Documentos...');
    });

    it('devuelve texto con checkmark cuando pasó el pre-check', () => {
      expect(getSubmitButtonText(false, true)).toBe('✓ Crear Equipo con Todos los Documentos');
    });

    it('devuelve texto de "Verificar..." por defecto', () => {
      expect(getSubmitButtonText(false, false)).toBe('🔍 Verificar y Crear Equipo');
    });
  });
});
