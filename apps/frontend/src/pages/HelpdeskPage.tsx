import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useGetTicketsQuery, useGetStatsQuery } from '../features/helpdesk/api/helpdeskApi';
import { TicketList } from '../features/helpdesk/components/TicketList';
import { Button } from '../components/ui/button';
import { useIsHelpdeskStaff, useCanCreateTickets } from '../hooks/useHelpdeskStaff';
import { StatCardSkeleton } from '../features/helpdesk/components/ui';
import type { Ticket, TicketFilters } from '../features/helpdesk/types';

// Stats display component with asymmetric layout
const StatsGrid: React.FC<{ stats: { open: number; inProgress: number; resolved: number; closed: number; total: number } | undefined; isLoading: boolean }> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    { value: stats.open, label: 'Abiertos', tone: 'open' as const },
    { value: stats.inProgress, label: 'En curso', tone: 'progress' as const },
    { value: stats.resolved, label: 'Resueltos', tone: 'resolved' as const },
    { value: stats.closed, label: 'Cerrados', tone: 'closed' as const },
  ];

  return (
    <div className="flex flex-wrap gap-2 md:gap-3">
      {statItems.map((item, idx) => (
        <StatPill key={item.label} value={item.value} label={item.label} tone={item.tone} isPrimary={idx === 0} />
      ))}
      <div className="hidden md:flex items-center ml-auto">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Total <span className="font-mono text-foreground tabular-nums">{stats.total}</span>
        </span>
      </div>
    </div>
  );
};

// Pill-style stat with distinct visual treatment per tone
const StatPill: React.FC<{ value: number; label: string; tone: 'open' | 'progress' | 'resolved' | 'closed'; isPrimary?: boolean }> = ({ value, label, tone, isPrimary }) => {
  const toneStyles = {
    open: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300',
    progress: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    resolved: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    closed: 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
  };

  const indicatorColors = {
    open: 'bg-sky-500',
    progress: 'bg-amber-500',
    resolved: 'bg-emerald-500',
    closed: 'bg-slate-400',
  };

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${toneStyles[tone]} ${isPrimary ? 'ring-2 ring-sky-500/20' : ''}`}>
      <span className={`w-2 h-2 rounded-full ${indicatorColors[tone]} ${tone === 'open' ? 'animate-pulse' : ''}`} />
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-lg font-semibold tabular-nums">{value}</span>
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
    </div>
  );
};

export const HelpdeskPage: React.FC = () => {
  const navigate = useNavigate();
  const isStaff = useIsHelpdeskStaff();
  const canCreateTickets = useCanCreateTickets();
  const [filters, setFilters] = React.useState<TicketFilters>({});

  const { data: ticketsData, isLoading: isLoadingTickets } = useGetTicketsQuery(filters);
  const { data: stats, isLoading: isLoadingStats } = useGetStatsQuery(undefined, {
    skip: !isStaff,
  });

  const handleTicketClick = (ticket: Ticket) => {
    navigate(`/helpdesk/${ticket.id}`);
  };

  const handleFilterChange = (newFilters: TicketFilters) => {
    setFilters(newFilters);
  };

  const tickets = ticketsData?.data ?? [];

  return (
    <div className="min-h-screen">
      {/* Header with strong visual hierarchy */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {isStaff ? 'Mesa de ayuda' : 'Mis solicitudes'}
                </h1>
                {isStaff && tickets.length > 0 && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                    {tickets.length} tickets
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isStaff
                  ? 'Gestión y seguimiento de tickets de soporte'
                  : 'Creá tickets y consultá el estado de tus pedidos'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isStaff ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/helpdesk')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Cog6ToothIcon className="h-4 w-4 mr-1.5" />
                  Admin
                </Button>
              ) : null}
              {canCreateTickets ? (
                <Button type="button" size="sm" onClick={() => navigate('/helpdesk/nuevo')}>
                  <PlusCircleIcon className="h-4 w-4 mr-1.5" />
                  Nuevo
                </Button>
              ) : null}
            </div>
          </div>

          {/* Stats inline with header for staff */}
          {isStaff ? (
            <div className="mt-4 pt-4 border-t">
              <StatsGrid stats={stats} isLoading={isLoadingStats} />
            </div>
          ) : null}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <TicketList
          tickets={tickets}
          isLoading={isLoadingTickets}
          onTicketClick={handleTicketClick}
          onFilterChange={handleFilterChange}
        />
      </main>
    </div>
  );
};

export default HelpdeskPage;
