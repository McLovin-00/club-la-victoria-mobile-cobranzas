import React, { useMemo } from 'react';
import type { Ticket } from '../types';
import { CATEGORY_LABELS } from '../constants';
import { StatusBadge, PriorityBadge, SourceBadge } from './ui';

interface TicketCardProps {
  ticket: Ticket;
  onClick?: (ticket: Ticket) => void;
}

// Deterministic avatar color from name hash
const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:bg-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:bg-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:bg-indigo-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:bg-orange-300',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Border color by priority
const PRIORITY_BORDER: Record<Ticket['priority'], string> = {
  HIGH: 'border-l-red-500',
  NORMAL: 'border-l-amber-400',
  LOW: 'border-l-emerald-400',
};

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onClick }) => {
  const ticketPriority = ticket.confirmedPriority || ticket.priority;

  const avatarColor = useMemo(
    () => AVATAR_COLORS[hashString(ticket.createdByName) % AVATAR_COLORS.length],
    [ticket.createdByName]
  );
  const initials = useMemo(() => getInitials(ticket.createdByName), [ticket.createdByName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(ticket);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  const categoryLabel = CATEGORY_LABELS[ticket.category] ?? ticket.category;
  const categoryClasses = ticket.category === 'TECHNICAL'
    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
    : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';

  return (
    <article
      className={`group relative flex flex-col gap-3 p-4 border-l-4 ${PRIORITY_BORDER[ticketPriority]} border rounded-lg bg-card cursor-pointer transition-all hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset`}
      onClick={() => onClick?.(ticket)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Ver ticket #${ticket.number}: ${ticket.subject}`}
    >
      {/* Row 1: Number + Badges + Tenant */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
          #{String(ticket.number).padStart(4, '0')}
        </span>
        <SourceBadge source={ticket.source} />
        <PriorityBadge priority={ticketPriority} />
        <StatusBadge status={ticket.status} />
        {ticket.empresaNombre && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[11px] font-medium truncate max-w-[180px]">
            <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {ticket.empresaNombre}
          </span>
        )}
      </div>

      {/* Row 2: Subject */}
      <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {ticket.subject}
      </h3>

      {/* Row 3: Meta — avatar, creator, company, date, category */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        {/* Avatar */}
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 ${avatarColor}`}>
          {initials}
        </span>
        <span className="font-medium text-foreground/80">{ticket.createdByName}</span>

        <span className="opacity-30">·</span>
        <time
          dateTime={ticket.createdAt instanceof Date ? ticket.createdAt.toISOString() : String(ticket.createdAt)}
          className="tabular-nums"
        >
          {formatDate(ticket.createdAt)}
        </time>

        {/* Category tag — pushed right */}
        <span className={`ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded ${categoryClasses}`}>
          {categoryLabel}
        </span>
      </div>
    </article>
  );
};

export default TicketCard;
