/**
 * Centralized constants for the helpdesk feature.
 * Uses design tokens for consistent styling across components.
 */

import type { TicketStatus, TicketPriority, TicketCategory, TicketSubcategory } from './types';

// Status colors using design tokens
export const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: 'bg-success/10 text-success',
  IN_PROGRESS: 'bg-warning/10 text-warning',
  RESOLVED: 'bg-primary/10 text-primary',
  CLOSED: 'bg-muted text-muted-foreground',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Progreso',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

// Priority colors - semantically correct: LOW=green, NORMAL=amber, HIGH=red
export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  HIGH: 'text-red-600',
  NORMAL: 'text-amber-600',
  LOW: 'text-green-600',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  HIGH: 'Alta',
  NORMAL: 'Normal',
  LOW: 'Baja',
};

// Category labels
export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  TECHNICAL: 'Técnica',
  OPERATIONAL: 'Operativa',
};

// Subcategory labels
export const SUBCATEGORY_LABELS: Record<TicketSubcategory, string> = {
  ERROR: 'Error',
  DOUBT: 'Duda',
  SUGGESTION: 'Sugerencia',
  BUSINESS_RULE: 'Regla de negocio',
};

// Filter options
export const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'OPEN', label: 'Abiertos' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'RESOLVED', label: 'Resueltos' },
  { value: 'CLOSED', label: 'Cerrados' },
] as const;

export const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'TECHNICAL', label: 'Técnicos' },
  { value: 'OPERATIONAL', label: 'Operativos' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Baja' },
] as const;

// Stats colors for dashboard cards
export const STATS_COLORS = {
  open: 'text-blue-600',
  inProgress: 'text-amber-600',
  resolved: 'text-emerald-600',
  closed: 'text-slate-600',
  total: 'text-fuchsia-600',
} as const;

// Message bubble styles - enhanced with shadows and polish
export const MESSAGE_BUBBLE_STYLES = {
  USER: 'bg-card border shadow-sm hover:shadow transition-shadow duration-200',
  SYSTEM: 'bg-muted/80 text-muted-foreground italic border border-dashed border-muted-foreground/20',
  RESOLVER: 'bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow duration-200',
} as const;

export const MESSAGE_META_STYLES = {
  USER: {
    name: 'text-muted-foreground',
    time: 'text-muted-foreground/80',
  },
  SYSTEM: {
    name: 'text-muted-foreground',
    time: 'text-muted-foreground/80',
  },
  RESOLVER: {
    name: 'text-primary-foreground/90',
    time: 'text-primary-foreground/70',
  },
} as const;

// Helper functions
export function getStatusColor(status: TicketStatus): string {
  return STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
}

export function getStatusLabel(status: TicketStatus): string {
  return STATUS_LABELS[status] || status;
}

export function getPriorityColor(priority: TicketPriority): string {
  return PRIORITY_COLORS[priority] || 'text-muted-foreground';
}

export function getPriorityLabel(priority: TicketPriority): string {
  return PRIORITY_LABELS[priority] || priority;
}

export function getCategoryLabel(category: TicketCategory): string {
  return CATEGORY_LABELS[category] || category;
}

export function getSubcategoryLabel(subcategory: TicketSubcategory): string {
  return SUBCATEGORY_LABELS[subcategory] || subcategory;
}
