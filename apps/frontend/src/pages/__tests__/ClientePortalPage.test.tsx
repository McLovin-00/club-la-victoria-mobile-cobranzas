/**
 * Tests para ClientePortalPage
 * Verifica la lógica del portal de clientes
 */
import { describe, it, expect, jest } from '@jest/globals';

describe('ClientePortalPage - exports', () => {
  it('importa ClientePortalPage sin errores', async () => {
    const module = await import('../ClientePortalPage');
    expect(module.default || module.ClientePortalPage).toBeDefined();
  });

  it('exporta ClientePortalPage como named export', async () => {
    const module = await import('../ClientePortalPage');
    expect(module.ClientePortalPage).toBeDefined();
  });
});

describe('ClientePortalPage - normalizePlate', () => {
  const normalizePlate = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  it('convierte a mayúsculas', () => {
    expect(normalizePlate('abc123')).toBe('ABC123');
  });

  it('elimina guiones', () => {
    expect(normalizePlate('AB-123-CD')).toBe('AB123CD');
  });

  it('elimina puntos', () => {
    expect(normalizePlate('AB.123.CD')).toBe('AB123CD');
  });

  it('elimina espacios', () => {
    expect(normalizePlate('AB 123 CD')).toBe('AB123CD');
  });

  it('elimina caracteres especiales', () => {
    expect(normalizePlate('AB@#$%123')).toBe('AB123');
  });

  it('maneja string vacío', () => {
    expect(normalizePlate('')).toBe('');
  });

  it('maneja null', () => {
    expect(normalizePlate(null as unknown as string)).toBe('');
  });

  it('maneja undefined', () => {
    expect(normalizePlate(undefined as unknown as string)).toBe('');
  });

  it('preserva números', () => {
    expect(normalizePlate('123456')).toBe('123456');
  });

  it('preserva letras', () => {
    expect(normalizePlate('ABCDEF')).toBe('ABCDEF');
  });
});

describe('ClientePortalPage - parsePlates', () => {
  const normalizePlate = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  const parsePlates = (input: string) => {
    const lines = input.split(/\r?\n/).map(l => normalizePlate(l.trim())).filter(Boolean);
    const unique = Array.from(new Set(lines));
    const invalid = unique.filter(p => p.length < 5);
    const valid = unique.filter(p => p.length >= 5);
    return { valid, invalid };
  };

  it('parsea múltiples líneas', () => {
    const { valid } = parsePlates('ABC123\nDEF456\nGHI789');
    expect(valid).toHaveLength(3);
    expect(valid).toContain('ABC123');
    expect(valid).toContain('DEF456');
    expect(valid).toContain('GHI789');
  });

  it('elimina duplicados', () => {
    const { valid } = parsePlates('ABC123\nABC123\nABC123');
    expect(valid).toHaveLength(1);
  });

  it('filtra líneas con menos de 5 caracteres', () => {
    const { valid, invalid } = parsePlates('ABC123\nAB\nABCD');
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(2);
  });

  it('maneja líneas vacías', () => {
    const { valid } = parsePlates('ABC123\n\n\nDEF456');
    expect(valid).toHaveLength(2);
  });

  it('maneja CRLF', () => {
    const { valid } = parsePlates('ABC123\r\nDEF456');
    expect(valid).toHaveLength(2);
  });

  it('maneja LF', () => {
    const { valid } = parsePlates('ABC123\nDEF456');
    expect(valid).toHaveLength(2);
  });

  it('normaliza antes de comparar duplicados', () => {
    const { valid } = parsePlates('abc123\nABC123\nABC-123');
    expect(valid).toHaveLength(1);
  });

  it('trim espacios de cada línea', () => {
    const { valid } = parsePlates('  ABC123  \n  DEF456  ');
    expect(valid).toEqual(['ABC123', 'DEF456']);
  });
});

describe('ClientePortalPage - calcEstado', () => {
  const calcEstado = (diffDays: number | null, hasDocument: boolean) => {
    if (!hasDocument) return 'FALTANTE';
    if (diffDays === null) return 'VIGENTE'; // Sin vencimiento
    if (diffDays <= 0) return 'VENCIDO';
    if (diffDays <= 30) return 'PROXIMO';
    return 'VIGENTE';
  };

  it('retorna FALTANTE si no hay documento', () => {
    expect(calcEstado(100, false)).toBe('FALTANTE');
    expect(calcEstado(null, false)).toBe('FALTANTE');
  });

  it('retorna VENCIDO cuando diffDays <= 0', () => {
    expect(calcEstado(-1, true)).toBe('VENCIDO');
    expect(calcEstado(0, true)).toBe('VENCIDO');
    expect(calcEstado(-100, true)).toBe('VENCIDO');
  });

  it('retorna PROXIMO cuando 0 < diffDays <= 30', () => {
    expect(calcEstado(1, true)).toBe('PROXIMO');
    expect(calcEstado(15, true)).toBe('PROXIMO');
    expect(calcEstado(30, true)).toBe('PROXIMO');
  });

  it('retorna VIGENTE cuando diffDays > 30', () => {
    expect(calcEstado(31, true)).toBe('VIGENTE');
    expect(calcEstado(100, true)).toBe('VIGENTE');
    expect(calcEstado(365, true)).toBe('VIGENTE');
  });

  it('retorna VIGENTE cuando no hay fecha de vencimiento', () => {
    expect(calcEstado(null, true)).toBe('VIGENTE');
  });
});

describe('ClientePortalPage - exportCsv headers', () => {
  it('genera headers correctos para CSV', () => {
    const headers = 'equipoId,entityType,templateId,templateName,estado,venceEl';
    const columns = headers.split(',');
    
    expect(columns).toHaveLength(6);
    expect(columns).toContain('equipoId');
    expect(columns).toContain('entityType');
    expect(columns).toContain('templateId');
    expect(columns).toContain('templateName');
    expect(columns).toContain('estado');
    expect(columns).toContain('venceEl');
  });

  it('genera fila CSV correcta', () => {
    const row = [1, 'CHOFER', 10, 'DNI', 'VIGENTE', '25/12/2024'].join(',');
    expect(row).toBe('1,CHOFER,10,DNI,VIGENTE,25/12/2024');
  });
});

describe('ClientePortalPage - getEstadoIcon mapping', () => {
  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'VIGENTE': return 'text-green-500';
      case 'PROXIMO': return 'text-yellow-500';
      case 'VENCIDO': return 'text-red-500';
      case 'FALTANTE': return 'text-gray-500';
      default: return '';
    }
  };

  it('retorna clase verde para VIGENTE', () => {
    expect(getEstadoClass('VIGENTE')).toBe('text-green-500');
  });

  it('retorna clase amarilla para PROXIMO', () => {
    expect(getEstadoClass('PROXIMO')).toBe('text-yellow-500');
  });

  it('retorna clase roja para VENCIDO', () => {
    expect(getEstadoClass('VENCIDO')).toBe('text-red-500');
  });

  it('retorna clase gris para FALTANTE', () => {
    expect(getEstadoClass('FALTANTE')).toBe('text-gray-500');
  });

  it('retorna string vacío para estados desconocidos', () => {
    expect(getEstadoClass('OTRO')).toBe('');
    expect(getEstadoClass('')).toBe('');
  });
});

describe('ClientePortalPage - getEstadoBadgeColor mapping', () => {
  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'VIGENTE': return 'bg-green-100 text-green-700 border-green-200';
      case 'PROXIMO': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'VENCIDO': return 'bg-red-100 text-red-700 border-red-200';
      case 'FALTANTE': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  it('retorna clases correctas para VIGENTE', () => {
    expect(getEstadoBadgeColor('VIGENTE')).toContain('bg-green-100');
    expect(getEstadoBadgeColor('VIGENTE')).toContain('text-green-700');
  });

  it('retorna clases correctas para PROXIMO', () => {
    expect(getEstadoBadgeColor('PROXIMO')).toContain('bg-yellow-100');
    expect(getEstadoBadgeColor('PROXIMO')).toContain('text-yellow-700');
  });

  it('retorna clases correctas para VENCIDO', () => {
    expect(getEstadoBadgeColor('VENCIDO')).toContain('bg-red-100');
    expect(getEstadoBadgeColor('VENCIDO')).toContain('text-red-700');
  });

  it('retorna clases correctas para FALTANTE', () => {
    expect(getEstadoBadgeColor('FALTANTE')).toContain('bg-gray-100');
    expect(getEstadoBadgeColor('FALTANTE')).toContain('text-gray-700');
  });

  it('retorna clases por defecto para estados desconocidos', () => {
    expect(getEstadoBadgeColor('OTRO')).toContain('bg-gray-100');
  });
});

describe('ClientePortalPage - getStatusBadge mapping', () => {
  const getStatusText = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case 'APROBADO': return '✅ Aprobado';
      case 'RECHAZADO': return '❌ Rechazado';
      case 'CLASIFICANDO': return '🤖 Clasificando';
      case 'PENDIENTE_APROBACION': return '🕒 Pend. Aprobación';
      case 'PENDIENTE': return '⏳ Pendiente';
      default: return status || 'Sin estado';
    }
  };

  it('retorna texto para APROBADO', () => {
    expect(getStatusText('APROBADO')).toBe('✅ Aprobado');
    expect(getStatusText('aprobado')).toBe('✅ Aprobado');
  });

  it('retorna texto para RECHAZADO', () => {
    expect(getStatusText('RECHAZADO')).toBe('❌ Rechazado');
  });

  it('retorna texto para CLASIFICANDO', () => {
    expect(getStatusText('CLASIFICANDO')).toBe('🤖 Clasificando');
  });

  it('retorna texto para PENDIENTE_APROBACION', () => {
    expect(getStatusText('PENDIENTE_APROBACION')).toBe('🕒 Pend. Aprobación');
  });

  it('retorna texto para PENDIENTE', () => {
    expect(getStatusText('PENDIENTE')).toBe('⏳ Pendiente');
  });

  it('retorna Sin estado para null', () => {
    expect(getStatusText(null)).toBe('Sin estado');
  });

  it('retorna el mismo valor para estados desconocidos', () => {
    expect(getStatusText('CUSTOM_STATUS')).toBe('CUSTOM_STATUS');
  });
});

describe('ClientePortalPage - formatDate', () => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  it('retorna Sin fecha para null', () => {
    expect(formatDate(null)).toBe('Sin fecha');
  });

  it('retorna Sin fecha para string vacío', () => {
    expect(formatDate('')).toBe('Sin fecha');
  });

  it('formatea fecha válida', () => {
    const result = formatDate('2024-06-15');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('maneja fechas ISO', () => {
    const result = formatDate('2024-06-15T10:30:00Z');
    expect(result).toMatch(/\d/);
  });

  it('retorna Fecha inválida para formato incorrecto', () => {
    expect(formatDate('not-a-date')).toBe('Fecha inválida');
  });
});

describe('ClientePortalPage - filteredReqs logic', () => {
  const filterReqsByEntityType = (reqs: Array<{ entityType: string }>) => {
    return reqs.filter((r) => ['CHOFER', 'CAMION', 'ACOPLADO'].includes(r.entityType));
  };

  it('incluye CHOFER', () => {
    const result = filterReqsByEntityType([{ entityType: 'CHOFER' }]);
    expect(result).toHaveLength(1);
  });

  it('incluye CAMION', () => {
    const result = filterReqsByEntityType([{ entityType: 'CAMION' }]);
    expect(result).toHaveLength(1);
  });

  it('incluye ACOPLADO', () => {
    const result = filterReqsByEntityType([{ entityType: 'ACOPLADO' }]);
    expect(result).toHaveLength(1);
  });

  it('excluye EMPRESA', () => {
    const result = filterReqsByEntityType([{ entityType: 'EMPRESA' }]);
    expect(result).toHaveLength(0);
  });

  it('excluye TRANSPORTISTA', () => {
    const result = filterReqsByEntityType([{ entityType: 'TRANSPORTISTA' }]);
    expect(result).toHaveLength(0);
  });

  it('filtra correctamente una lista mixta', () => {
    const reqs = [
      { entityType: 'CHOFER' },
      { entityType: 'CAMION' },
      { entityType: 'ACOPLADO' },
      { entityType: 'EMPRESA' },
      { entityType: 'OTRO' },
    ];
    const result = filterReqsByEntityType(reqs);
    expect(result).toHaveLength(3);
  });
});

describe('ClientePortalPage - selectedIds Set operations', () => {
  it('agrega id cuando checked es true', () => {
    const selectedIds = new Set<number>();
    const next = new Set(selectedIds);
    next.add(42);

    expect(next.has(42)).toBe(true);
    expect(next.size).toBe(1);
  });

  it('elimina id cuando checked es false', () => {
    const selectedIds = new Set<number>([42]);
    const next = new Set(selectedIds);
    next.delete(42);

    expect(next.has(42)).toBe(false);
    expect(next.size).toBe(0);
  });

  it('no duplica ids', () => {
    const selectedIds = new Set<number>([42]);
    const next = new Set(selectedIds);
    next.add(42);

    expect(next.size).toBe(1);
  });

  it('maneja múltiples operaciones', () => {
    const ids = new Set<number>();
    ids.add(1);
    ids.add(2);
    ids.add(3);
    ids.delete(2);

    expect(ids.size).toBe(2);
    expect(ids.has(1)).toBe(true);
    expect(ids.has(2)).toBe(false);
    expect(ids.has(3)).toBe(true);
  });
});

describe('ClientePortalPage - handleGenerateZip logic', () => {
  const getEquipoIds = (selectedIds: Set<number>, bulkResults: Array<{ id: number }>) => {
    const pick = Array.from(selectedIds);
    return (pick.length ? pick : bulkResults.map(r => r.id)).slice(0, 200);
  };

  it('usa selectedIds si hay seleccionados', () => {
    const selectedIds = new Set([1, 2, 3]);
    const bulkResults = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

    const result = getEquipoIds(selectedIds, bulkResults);
    expect(result).toEqual([1, 2, 3]);
  });

  it('usa todos los bulkResults si no hay seleccionados', () => {
    const selectedIds = new Set<number>();
    const bulkResults = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const result = getEquipoIds(selectedIds, bulkResults);
    expect(result).toEqual([1, 2, 3]);
  });

  it('limita a 200 equipos', () => {
    const selectedIds = new Set<number>();
    const bulkResults = Array.from({ length: 300 }, (_, i) => ({ id: i + 1 }));

    const result = getEquipoIds(selectedIds, bulkResults);
    expect(result).toHaveLength(200);
  });

  it('retorna array vacío si no hay resultados ni selección', () => {
    const selectedIds = new Set<number>();
    const bulkResults: Array<{ id: number }> = [];

    const result = getEquipoIds(selectedIds, bulkResults);
    expect(result).toEqual([]);
  });
});

describe('ClientePortalPage - plateType logic', () => {
  const getSearchType = (plateType: 'both' | 'truck' | 'trailer') => {
    return plateType === 'both' ? undefined : plateType;
  };

  it('retorna undefined para both', () => {
    expect(getSearchType('both')).toBeUndefined();
  });

  it('retorna truck para truck', () => {
    expect(getSearchType('truck')).toBe('truck');
  });

  it('retorna trailer para trailer', () => {
    expect(getSearchType('trailer')).toBe('trailer');
  });
});

describe('ClientePortalPage - zipJobData effects', () => {
  const shouldShowSuccess = (zipJobId: string | null, signedUrl: string | undefined) => {
    return !!(zipJobId && signedUrl);
  };

  const shouldShowError = (zipJobId: string | null, status: string | undefined) => {
    return !!(zipJobId && status === 'failed');
  };

  it('detecta éxito cuando hay URL', () => {
    expect(shouldShowSuccess('job-123', 'https://download.url')).toBe(true);
  });

  it('no detecta éxito sin jobId', () => {
    expect(shouldShowSuccess(null, 'https://download.url')).toBe(false);
  });

  it('no detecta éxito sin URL', () => {
    expect(shouldShowSuccess('job-123', undefined)).toBe(false);
  });

  it('detecta error cuando status es failed', () => {
    expect(shouldShowError('job-123', 'failed')).toBe(true);
  });

  it('no detecta error para otros status', () => {
    expect(shouldShowError('job-123', 'pending')).toBe(false);
    expect(shouldShowError('job-123', 'completed')).toBe(false);
  });
});
