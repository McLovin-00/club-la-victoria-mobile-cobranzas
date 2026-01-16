/**
 * Tests para entityTypes.ts
 * Cobertura de constantes, tipos y funciones helper
 */
import { describe, it, expect } from '@jest/globals';
import {
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_LABELS_WITH_ICONS,
  ENTITY_TYPE_OPTIONS,
  ENTITY_TYPE_OPTIONS_WITH_ICONS,
  getEntityTypeLabel,
  isValidEntityType,
  type EntityType,
} from '../entityTypes';

describe('ENTITY_TYPES', () => {
  it('tiene todas las claves esperadas', () => {
    expect(ENTITY_TYPES.EMPRESA_TRANSPORTISTA).toBe('EMPRESA_TRANSPORTISTA');
    expect(ENTITY_TYPES.CHOFER).toBe('CHOFER');
    expect(ENTITY_TYPES.CAMION).toBe('CAMION');
    expect(ENTITY_TYPES.ACOPLADO).toBe('ACOPLADO');
  });

  it('tiene exactamente 4 tipos de entidad', () => {
    expect(Object.keys(ENTITY_TYPES)).toHaveLength(4);
  });
});

describe('ENTITY_TYPE_LABELS', () => {
  it('tiene labels para todos los tipos', () => {
    expect(ENTITY_TYPE_LABELS.EMPRESA_TRANSPORTISTA).toBe('Empresa Transportista');
    expect(ENTITY_TYPE_LABELS.CHOFER).toBe('Chofer');
    expect(ENTITY_TYPE_LABELS.CAMION).toBe('Camión');
    expect(ENTITY_TYPE_LABELS.ACOPLADO).toBe('Acoplado');
  });

  it('tiene el mismo número de labels que tipos', () => {
    expect(Object.keys(ENTITY_TYPE_LABELS)).toHaveLength(Object.keys(ENTITY_TYPES).length);
  });
});

describe('ENTITY_TYPE_LABELS_WITH_ICONS', () => {
  it('tiene labels con emojis para todos los tipos', () => {
    expect(ENTITY_TYPE_LABELS_WITH_ICONS.EMPRESA_TRANSPORTISTA).toBe('🏢 Empresa Transportista');
    expect(ENTITY_TYPE_LABELS_WITH_ICONS.CHOFER).toBe('👤 Chofer');
    expect(ENTITY_TYPE_LABELS_WITH_ICONS.CAMION).toBe('🚛 Camión');
    expect(ENTITY_TYPE_LABELS_WITH_ICONS.ACOPLADO).toBe('🚚 Acoplado');
  });

  it('todos los labels incluyen emoji', () => {
    Object.values(ENTITY_TYPE_LABELS_WITH_ICONS).forEach(label => {
      expect(label).toMatch(/^[\u{1F300}-\u{1F9FF}]/u);
    });
  });
});

describe('ENTITY_TYPE_OPTIONS', () => {
  it('genera array de opciones para dropdowns', () => {
    expect(Array.isArray(ENTITY_TYPE_OPTIONS)).toBe(true);
    expect(ENTITY_TYPE_OPTIONS).toHaveLength(4);
  });

  it('cada opción tiene value y label', () => {
    ENTITY_TYPE_OPTIONS.forEach(option => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(typeof option.value).toBe('string');
      expect(typeof option.label).toBe('string');
    });
  });

  it('los values corresponden a ENTITY_TYPES', () => {
    const values = ENTITY_TYPE_OPTIONS.map(o => o.value);
    expect(values).toContain('EMPRESA_TRANSPORTISTA');
    expect(values).toContain('CHOFER');
    expect(values).toContain('CAMION');
    expect(values).toContain('ACOPLADO');
  });
});

describe('ENTITY_TYPE_OPTIONS_WITH_ICONS', () => {
  it('genera array de opciones con iconos', () => {
    expect(Array.isArray(ENTITY_TYPE_OPTIONS_WITH_ICONS)).toBe(true);
    expect(ENTITY_TYPE_OPTIONS_WITH_ICONS).toHaveLength(4);
  });

  it('cada opción tiene value y label con emoji', () => {
    ENTITY_TYPE_OPTIONS_WITH_ICONS.forEach(option => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(option.label).toMatch(/^[\u{1F300}-\u{1F9FF}]/u);
    });
  });
});

describe('getEntityTypeLabel', () => {
  it('retorna label correcto para tipo válido', () => {
    expect(getEntityTypeLabel('EMPRESA_TRANSPORTISTA')).toBe('Empresa Transportista');
    expect(getEntityTypeLabel('CHOFER')).toBe('Chofer');
    expect(getEntityTypeLabel('CAMION')).toBe('Camión');
    expect(getEntityTypeLabel('ACOPLADO')).toBe('Acoplado');
  });

  it('retorna "-" para null', () => {
    expect(getEntityTypeLabel(null)).toBe('-');
  });

  it('retorna "-" para undefined', () => {
    expect(getEntityTypeLabel(undefined)).toBe('-');
  });

  it('retorna el string original para tipo desconocido', () => {
    expect(getEntityTypeLabel('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');
  });

  it('retorna "-" para string vacío', () => {
    expect(getEntityTypeLabel('')).toBe('-');
  });
});

describe('isValidEntityType', () => {
  it('retorna true para tipos válidos', () => {
    expect(isValidEntityType('EMPRESA_TRANSPORTISTA')).toBe(true);
    expect(isValidEntityType('CHOFER')).toBe(true);
    expect(isValidEntityType('CAMION')).toBe(true);
    expect(isValidEntityType('ACOPLADO')).toBe(true);
  });

  it('retorna false para tipos inválidos', () => {
    expect(isValidEntityType('INVALID')).toBe(false);
    expect(isValidEntityType('empresa_transportista')).toBe(false); // Case-sensitive
    expect(isValidEntityType('')).toBe(false);
    expect(isValidEntityType('TRUCK')).toBe(false);
  });
});

describe('EntityType (type)', () => {
  it('permite asignar tipos válidos', () => {
    const types: EntityType[] = [
      'EMPRESA_TRANSPORTISTA',
      'CHOFER',
      'CAMION',
      'ACOPLADO',
    ];
    
    expect(types).toHaveLength(4);
    types.forEach(type => {
      expect(isValidEntityType(type)).toBe(true);
    });
  });
});

