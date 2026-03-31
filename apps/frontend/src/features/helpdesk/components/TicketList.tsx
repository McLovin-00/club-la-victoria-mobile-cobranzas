import React, { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Ticket, TicketFilters, TicketStatus, TicketCategory, TicketPriority } from '../types';
import { STATUS_OPTIONS, CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '../constants';
import TicketCard from './TicketCard';
import { LoadingSpinner } from './ui';

interface TicketListProps {
  tickets: Ticket[];
  isLoading?: boolean;
  onTicketClick?: (ticket: Ticket) => void;
  onFilterChange?: (filters: TicketFilters) => void;
}

// Compact filter pill
const FilterPill: React.FC<{
  id: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
}> = ({ id, value, options, onChange, label }) => {
  const isActive = value !== '';

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-2.5 pr-7 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors
          ${isActive 
            ? 'bg-primary/5 border-primary/30 text-primary hover:bg-primary/10' 
            : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
          }
          focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="h-3 w-3 text-current opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

// Active filter tag for removal
const ActiveFilterTag: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="hover:bg-primary/20 rounded-sm p-0.5 -mr-0.5 transition-colors"
      aria-label={`Quitar filtro: ${label}`}
    >
      <XMarkIcon className="h-3 w-3" />
    </button>
  </span>
);

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  isLoading,
  onTicketClick,
  onFilterChange,
}) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const updateFilters = (
    updates: { status?: string; category?: string; priority?: string; search?: string }
  ) => {
    const newStatus = updates.status ?? statusFilter;
    const newCategory = updates.category ?? categoryFilter;
    const newPriority = updates.priority ?? priorityFilter;
    const newSearch = updates.search ?? searchQuery;

    setStatusFilter(newStatus);
    setCategoryFilter(newCategory);
    setPriorityFilter(newPriority);
    setSearchQuery(newSearch);

    onFilterChange?.({
      status: (newStatus || undefined) as TicketStatus | undefined,
      category: (newCategory || undefined) as TicketCategory | undefined,
      priority: (newPriority || undefined) as TicketPriority | undefined,
      search: newSearch || undefined,
    });
  };

  const clearAllFilters = () => {
    updateFilters({ status: '', category: '', priority: '', search: '' });
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter && ticket.status !== statusFilter) return false;
    if (categoryFilter && ticket.category !== categoryFilter) return false;
    if (priorityFilter && (ticket.confirmedPriority || ticket.priority) !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.subject.toLowerCase().includes(query) ||
        ticket.createdByName.toLowerCase().includes(query) ||
        ticket.empresaNombre?.toLowerCase().includes(query) ||
        ticket.number.toString().includes(query)
      );
    }
    return true;
  });

  const hasActiveFilters = statusFilter || categoryFilter || priorityFilter || searchQuery;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="md" />
        <span className="ml-3 text-muted-foreground">Cargando tickets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters row - compact, inline */}
      <div className="flex flex-col gap-3">
        {/* Search + Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              id="ticket-search"
              type="text"
              placeholder="Buscar por asunto, número o usuario..."
              value={searchQuery}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => updateFilters({ search: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
                aria-label="Limpiar búsqueda"
              >
                <XMarkIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5">
            <FunnelIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <FilterPill
              id="ticket-status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(v) => updateFilters({ status: v })}
              label="Estado"
            />
            <FilterPill
              id="ticket-category"
              value={categoryFilter}
              options={CATEGORY_OPTIONS}
              onChange={(v) => updateFilters({ category: v })}
              label="Categoría"
            />
            <FilterPill
              id="ticket-priority"
              value={priorityFilter}
              options={PRIORITY_OPTIONS}
              onChange={(v) => updateFilters({ priority: v })}
              label="Prioridad"
            />
          </div>
        </div>

        {/* Active filters display */}
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <>
              {statusFilter && (
                <ActiveFilterTag
                  label={STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || statusFilter}
                  onRemove={() => updateFilters({ status: '' })}
                />
              )}
              {categoryFilter && (
                <ActiveFilterTag
                  label={CATEGORY_OPTIONS.find(o => o.value === categoryFilter)?.label || categoryFilter}
                  onRemove={() => updateFilters({ category: '' })}
                />
              )}
              {priorityFilter && (
                <ActiveFilterTag
                  label={PRIORITY_OPTIONS.find(o => o.value === priorityFilter)?.label || priorityFilter}
                  onRemove={() => updateFilters({ priority: '' })}
                />
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Limpiar todo
              </button>
            </>
          )}

          <span className="text-xs text-muted-foreground shrink-0 ml-auto">
            {filteredTickets.length === tickets.length
              ? `${filteredTickets.length} ticket${filteredTickets.length !== 1 ? 's' : ''}`
              : `${filteredTickets.length} de ${tickets.length}`
            }
          </span>
        </div>
      </div>

      {/* Ticket list - no card wrapper, direct items */}
      {filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            {hasActiveFilters ? (
              <FunnelIcon className="w-6 h-6 text-muted-foreground" />
            ) : (
              <span className="text-2xl">📭</span>
            )}
          </div>
          <p className="text-base font-medium text-foreground">
            {hasActiveFilters ? 'Sin resultados' : 'No hay tickets'}
          </p>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
            {hasActiveFilters
              ? 'Probá con otros filtros o limpiá la búsqueda.'
              : 'Los tickets que crees aparecerán acá.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={onTicketClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketList;
