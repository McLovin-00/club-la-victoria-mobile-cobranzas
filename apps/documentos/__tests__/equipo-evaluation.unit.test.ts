import {
  clasificarDocumento,
  determinarEstadoDocumental,
} from '../src/services/equipo-evaluation.service';

describe('equipo-evaluation.service - helpers puros', () => {
  describe('clasificarDocumento', () => {
    const now = new Date('2025-02-20T12:00:00Z');
    const limitePorVencer = new Date('2025-03-22T12:00:00Z'); // 30 días después

    it('incrementa rechazados cuando status es RECHAZADO', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento(
        { status: 'RECHAZADO', expiresAt: null },
        now,
        limitePorVencer,
        stats
      );
      expect(stats.rechazados).toBe(1);
      expect(stats.vencidos).toBe(0);
      expect(stats.pendientes).toBe(0);
      expect(stats.porVencer).toBe(0);
      expect(stats.vigentes).toBe(0);
    });

    it('incrementa vencidos cuando status es VENCIDO', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento(
        { status: 'VENCIDO', expiresAt: null },
        now,
        limitePorVencer,
        stats
      );
      expect(stats.vencidos).toBe(1);
      expect(stats.rechazados).toBe(0);
    });

    it('incrementa vencidos cuando expiresAt < now (documento vencido por fecha)', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      const fechaVencida = new Date('2025-01-15T00:00:00Z');
      clasificarDocumento(
        { status: 'APROBADO', expiresAt: fechaVencida },
        now,
        limitePorVencer,
        stats
      );
      expect(stats.vencidos).toBe(1);
      expect(stats.vigentes).toBe(0);
    });

    it('incrementa pendientes cuando status es PENDIENTE', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento(
        { status: 'PENDIENTE', expiresAt: null },
        now,
        limitePorVencer,
        stats
      );
      expect(stats.pendientes).toBe(1);
      expect(stats.vencidos).toBe(0);
    });

    it('incrementa pendientes cuando status es PENDIENTE_APROBACION', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento(
        { status: 'PENDIENTE_APROBACION', expiresAt: null },
        now,
        limitePorVencer,
        stats
      );
      expect(stats.pendientes).toBe(1);
    });

    it('incrementa porVencer cuando APROBADO y expiresAt <= limitePorVencer', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      const fechaPorVencer = new Date('2025-03-15T00:00:00Z'); // antes del límite
      clasificarDocumento(
        { status: 'APROBADO', expiresAt: fechaPorVencer },
        now,
        limitePorVencer,
        stats
      );
      expect(stats.porVencer).toBe(1);
      expect(stats.vigentes).toBe(0);
    });

    it('incrementa porVencer cuando APROBADO y expiresAt igual a limitePorVencer', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento(
        { status: 'APROBADO', expiresAt: limitePorVencer },
        now,
        limitePorVencer,
        stats
      );
      expect(stats.porVencer).toBe(1);
    });

    it('incrementa vigentes cuando APROBADO y expiresAt > limitePorVencer', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      const fechaLejana = new Date('2025-06-01T00:00:00Z');
      clasificarDocumento(
        { status: 'APROBADO', expiresAt: fechaLejana },
        now,
        limitePorVencer,
        stats
      );
      expect(stats.vigentes).toBe(1);
      expect(stats.porVencer).toBe(0);
    });

    it('incrementa vigentes cuando APROBADO sin expiresAt', () => {
      const stats = { vigentes: 0, porVencer: 0, vencidos: 0, pendientes: 0, rechazados: 0 };
      clasificarDocumento(
        { status: 'APROBADO', expiresAt: null },
        now,
        limitePorVencer,
        stats
      );
      expect(stats.vigentes).toBe(1);
      expect(stats.porVencer).toBe(0);
    });
  });

  describe('determinarEstadoDocumental', () => {
    it('retorna DOCUMENTACION_VENCIDA cuando vencidos > 0', () => {
      const resultado = determinarEstadoDocumental({
        vigentes: 5,
        porVencer: 2,
        vencidos: 1,
        pendientes: 0,
        rechazados: 0,
        faltantes: 0,
      });
      expect(resultado).toBe('DOCUMENTACION_VENCIDA');
    });

    it('retorna DOCUMENTACION_INCOMPLETA cuando faltantes > 0', () => {
      const resultado = determinarEstadoDocumental({
        vigentes: 3,
        porVencer: 0,
        vencidos: 0,
        pendientes: 0,
        rechazados: 0,
        faltantes: 1,
      });
      expect(resultado).toBe('DOCUMENTACION_INCOMPLETA');
    });

    it('retorna DOCUMENTACION_INCOMPLETA cuando rechazados > 0', () => {
      const resultado = determinarEstadoDocumental({
        vigentes: 2,
        porVencer: 0,
        vencidos: 0,
        pendientes: 0,
        rechazados: 1,
        faltantes: 0,
      });
      expect(resultado).toBe('DOCUMENTACION_INCOMPLETA');
    });

    it('retorna PENDIENTE_VALIDACION cuando pendientes > 0', () => {
      const resultado = determinarEstadoDocumental({
        vigentes: 2,
        porVencer: 0,
        vencidos: 0,
        pendientes: 1,
        rechazados: 0,
        faltantes: 0,
      });
      expect(resultado).toBe('PENDIENTE_VALIDACION');
    });

    it('retorna DOCUMENTACION_POR_VENCER cuando porVencer > 0', () => {
      const resultado = determinarEstadoDocumental({
        vigentes: 2,
        porVencer: 1,
        vencidos: 0,
        pendientes: 0,
        rechazados: 0,
        faltantes: 0,
      });
      expect(resultado).toBe('DOCUMENTACION_POR_VENCER');
    });

    it('retorna COMPLETO cuando vigentes > 0 y resto en cero', () => {
      const resultado = determinarEstadoDocumental({
        vigentes: 3,
        porVencer: 0,
        vencidos: 0,
        pendientes: 0,
        rechazados: 0,
        faltantes: 0,
      });
      expect(resultado).toBe('COMPLETO');
    });

    it('retorna DOCUMENTACION_INCOMPLETA cuando todos los contadores son cero', () => {
      const resultado = determinarEstadoDocumental({
        vigentes: 0,
        porVencer: 0,
        vencidos: 0,
        pendientes: 0,
        rechazados: 0,
        faltantes: 0,
      });
      expect(resultado).toBe('DOCUMENTACION_INCOMPLETA');
    });
  });
});
