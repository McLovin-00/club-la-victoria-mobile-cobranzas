/**
 * Constantes centralizadas para tipos de entidad
 * Usadas en toda la plataforma para mantener consistencia
 */

export const ENTITY_TYPES = {
  EMPRESA_TRANSPORTISTA: 'EMPRESA_TRANSPORTISTA',
  CHOFER: 'CHOFER',
  CAMION: 'CAMION',
  ACOPLADO: 'ACOPLADO',
} as const;

export type EntityType = keyof typeof ENTITY_TYPES;

/**
 * Labels para mostrar en la UI - UNIFICADOS EN TODA LA PLATAFORMA
 * Decisión: Usar "Acoplado" como término principal (más técnico y preciso)
 */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  EMPRESA_TRANSPORTISTA: 'Empresa Transportista',
  CHOFER: 'Chofer',
  CAMION: 'Camión',
  ACOPLADO: 'Acoplado',
};

/**
 * Labels con emojis para interfaces más visuales
 */
export const ENTITY_TYPE_LABELS_WITH_ICONS: Record<EntityType, string> = {
  EMPRESA_TRANSPORTISTA: '🏢 Empresa Transportista',
  CHOFER: '👤 Chofer',
  CAMION: '🚛 Camión',
  ACOPLADO: '🚚 Acoplado',
};

/**
 * Opciones para dropdowns/selects
 */
export const ENTITY_TYPE_OPTIONS = Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/**
 * Opciones con iconos para dropdowns más visuales
 */
export const ENTITY_TYPE_OPTIONS_WITH_ICONS = Object.entries(ENTITY_TYPE_LABELS_WITH_ICONS).map(([value, label]) => ({
  value,
  label,
}));

/**
 * Helper para obtener el label de un tipo de entidad
 */
export function getEntityTypeLabel(type: string | null | undefined): string {
  if (!type) return '-';
  return ENTITY_TYPE_LABELS[type as EntityType] || type;
}

/**
 * Valida si un string es un tipo de entidad válido
 */
export function isValidEntityType(type: string): type is EntityType {
  return type in ENTITY_TYPES;
}

