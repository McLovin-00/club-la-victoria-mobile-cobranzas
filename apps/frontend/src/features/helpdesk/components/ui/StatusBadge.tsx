import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { TicketStatus } from '../../types';
import { STATUS_LABELS } from '../../constants';

const STATUS_VARIANT_MAP: Record<TicketStatus, 'statusOpen' | 'statusInProgress' | 'statusResolved' | 'statusClosed'> = {
  OPEN: 'statusOpen',
  IN_PROGRESS: 'statusInProgress',
  RESOLVED: 'statusResolved',
  CLOSED: 'statusClosed',
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

/**
 * Badge component for displaying ticket status.
 * Uses centralized STATUS_LABELS for consistent text.
 */
export function StatusBadge({ status, size = 'sm', className, ...props }: StatusBadgeProps) {
  const variant = STATUS_VARIANT_MAP[status] ?? 'statusOpen';
  const label = STATUS_LABELS[status] ?? status;
  const sizeClasses = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <Badge variant={variant} className={`${sizeClasses} ${className ?? ''}`} {...props}>
      {label}
    </Badge>
  );
}

export default StatusBadge;
