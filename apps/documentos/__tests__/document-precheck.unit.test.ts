import {
  normalizeIdentificador,
  calcularEstadoDocumento,
  calcularResumen,
  type DocumentoExistente,
} from '../src/services/document-precheck.service';

describe('normalizeIdentificador', () => {
  it('convierte a mayúsculas', () => {
    expect(normalizeIdentificador('abc123')).toBe('ABC123');
    expect(normalizeIdentificador('dni 20123456')).toBe('DNI20123456');
  });

  it('elimina caracteres especiales (puntos, guiones, espacios)', () => {
    expect(normalizeIdentificador('20-12345678-9')).toBe('20123456789');
    expect(normalizeIdentificador('AA 123 BB')).toBe('AA123BB');
    expect(normalizeIdentificador('20.123.456.789')).toBe('20123456789');
  });

  it('acota a 32 caracteres', () => {
    const largo = 'A'.repeat(50);
    expect(normalizeIdentificador(largo)).toHaveLength(32);
    expect(normalizeIdentificador(largo)).toBe('A'.repeat(32));
  });
});

describe('calcularEstadoDocumento', () => {
  it('RECHAZADO retorna estado RECHAZADO y diasParaVencer null', () => {
    const result = calcularEstadoDocumento({
      status: 'RECHAZADO',
      expiresAt: null,
    });
    expect(result).toEqual({ estado: 'RECHAZADO', diasParaVencer: null });
  });

  it('VENCIDO retorna estado VENCIDO y diasParaVencer null', () => {
    const result = calcularEstadoDocumento({
      status: 'VENCIDO',
      expiresAt: null,
    });
    expect(result).toEqual({ estado: 'VENCIDO', diasParaVencer: null });
  });

  it('expiresAt en el pasado retorna VENCIDO', () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const result = calcularEstadoDocumento({
      status: 'APROBADO',
      expiresAt: ayer,
    });
    expect(result).toEqual({ estado: 'VENCIDO', diasParaVencer: null });
  });

  it('PENDIENTE retorna estado PENDIENTE', () => {
    const result = calcularEstadoDocumento({
      status: 'PENDIENTE',
      expiresAt: null,
    });
    expect(result).toEqual({ estado: 'PENDIENTE', diasParaVencer: null });
  });

  it('PENDIENTE_APROBACION retorna estado PENDIENTE', () => {
    const result = calcularEstadoDocumento({
      status: 'PENDIENTE_APROBACION',
      expiresAt: null,
    });
    expect(result).toEqual({ estado: 'PENDIENTE', diasParaVencer: null });
  });

  it('VALIDANDO retorna estado PENDIENTE', () => {
    const result = calcularEstadoDocumento({
      status: 'VALIDANDO',
      expiresAt: null,
    });
    expect(result).toEqual({ estado: 'PENDIENTE', diasParaVencer: null });
  });

  it('CLASIFICANDO retorna estado PENDIENTE', () => {
    const result = calcularEstadoDocumento({
      status: 'CLASIFICANDO',
      expiresAt: null,
    });
    expect(result).toEqual({ estado: 'PENDIENTE', diasParaVencer: null });
  });

  it('APROBADO con expiresAt dentro de 30 días retorna POR_VENCER con diasParaVencer', () => {
    const en15Dias = new Date();
    en15Dias.setDate(en15Dias.getDate() + 15);
    const result = calcularEstadoDocumento({
      status: 'APROBADO',
      expiresAt: en15Dias,
    });
    expect(result.estado).toBe('POR_VENCER');
    expect(result.diasParaVencer).toBeGreaterThanOrEqual(14);
    expect(result.diasParaVencer).toBeLessThanOrEqual(16);
  });

  it('APROBADO con expiresAt en exactamente 30 días retorna POR_VENCER', () => {
    const en30Dias = new Date();
    en30Dias.setDate(en30Dias.getDate() + 30);
    const result = calcularEstadoDocumento({
      status: 'APROBADO',
      expiresAt: en30Dias,
    });
    expect(result.estado).toBe('POR_VENCER');
    expect(result.diasParaVencer).toBeGreaterThanOrEqual(29);
    expect(result.diasParaVencer).toBeLessThanOrEqual(31);
  });

  it('APROBADO con expiresAt mayor a 30 días retorna VIGENTE con diasParaVencer', () => {
    const en60Dias = new Date();
    en60Dias.setDate(en60Dias.getDate() + 60);
    const result = calcularEstadoDocumento({
      status: 'APROBADO',
      expiresAt: en60Dias,
    });
    expect(result.estado).toBe('VIGENTE');
    expect(result.diasParaVencer).toBeGreaterThanOrEqual(59);
    expect(result.diasParaVencer).toBeLessThanOrEqual(61);
  });

  it('APROBADO sin expiresAt retorna VIGENTE y diasParaVencer null', () => {
    const result = calcularEstadoDocumento({
      status: 'APROBADO',
      expiresAt: null,
    });
    expect(result).toEqual({ estado: 'VIGENTE', diasParaVencer: null });
  });

  it('estado desconocido retorna FALTANTE', () => {
    const result = calcularEstadoDocumento({
      status: 'DEPRECADO',
      expiresAt: null,
    });
    expect(result).toEqual({ estado: 'FALTANTE', diasParaVencer: null });
  });
});

function crearDoc(templateId: number, estado: DocumentoExistente['estado']): DocumentoExistente {
  return {
    id: templateId,
    templateId,
    templateName: `Doc ${templateId}`,
    estado,
    expiresAt: null,
    diasParaVencer: null,
    uploadedAt: new Date(),
    dadorCargaId: 1,
    reutilizable: false,
    requiereTransferencia: false,
  };
}

describe('calcularResumen', () => {
  it('arrays vacíos retorna todos en cero y completo true', () => {
    const result = calcularResumen([], []);
    expect(result).toEqual({
      total: 0,
      vigentes: 0,
      porVencer: 0,
      vencidos: 0,
      pendientes: 0,
      rechazados: 0,
      faltantes: 0,
      completo: true,
    });
  });

  it('todos vigentes retorna completo true', () => {
    const docs = [
      crearDoc(1, 'VIGENTE'),
      crearDoc(2, 'VIGENTE'),
    ];
    const templates = [
      { templateId: 1, obligatorio: true },
      { templateId: 2, obligatorio: true },
    ];
    const result = calcularResumen(docs, templates);
    expect(result.vigentes).toBe(2);
    expect(result.faltantes).toBe(0);
    expect(result.completo).toBe(true);
  });

  it('algunos faltantes retorna completo false', () => {
    const docs = [crearDoc(1, 'VIGENTE')];
    const templates = [
      { templateId: 1, obligatorio: true },
      { templateId: 2, obligatorio: true },
    ];
    const result = calcularResumen(docs, templates);
    expect(result.vigentes).toBe(1);
    expect(result.faltantes).toBe(1);
    expect(result.completo).toBe(false);
  });

  it('mezcla de estados retorna conteos correctos', () => {
    const docs = [
      crearDoc(1, 'VIGENTE'),
      crearDoc(2, 'POR_VENCER'),
      crearDoc(3, 'VENCIDO'),
      crearDoc(4, 'PENDIENTE'),
      crearDoc(5, 'RECHAZADO'),
    ];
    const templates = [
      { templateId: 1, obligatorio: true },
      { templateId: 2, obligatorio: true },
      { templateId: 3, obligatorio: true },
      { templateId: 4, obligatorio: true },
      { templateId: 5, obligatorio: true },
    ];
    const result = calcularResumen(docs, templates);
    expect(result.total).toBe(5);
    expect(result.vigentes).toBe(1);
    expect(result.porVencer).toBe(1);
    expect(result.vencidos).toBe(1);
    expect(result.pendientes).toBe(1);
    expect(result.rechazados).toBe(1);
    expect(result.faltantes).toBe(0);
    expect(result.completo).toBe(false);
  });

  it('template opcional faltante no incrementa faltantes', () => {
    const docs = [crearDoc(1, 'VIGENTE')];
    const templates = [
      { templateId: 1, obligatorio: true },
      { templateId: 2, obligatorio: false },
    ];
    const result = calcularResumen(docs, templates);
    expect(result.faltantes).toBe(0);
    expect(result.vigentes).toBe(1);
    expect(result.completo).toBe(true);
  });

  it('documento FALTANTE en template obligatorio incrementa faltantes', () => {
    const docs = [crearDoc(1, 'FALTANTE')];
    const templates = [{ templateId: 1, obligatorio: true }];
    const result = calcularResumen(docs, templates);
    expect(result.faltantes).toBe(1);
    expect(result.completo).toBe(false);
  });
});
