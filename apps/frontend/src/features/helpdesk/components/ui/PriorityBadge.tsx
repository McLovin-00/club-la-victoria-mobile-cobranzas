import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { TicketPriority } from '../../types';
import { PRIORITY_LABELS } from '../../constants';

const PRIORITY_VARIANT_MAP: Record<TicketPriority, 'priorityHigh' | 'priorityNormal' | 'priorityLow'> = {
  HIGH: 'priorityHigh',
  NORMAL: 'priorityNormal',
  LOW: 'priorityLow',
};

export interface PriorityBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  priority: TicketPriority;
  size?: 'sm' | 'md';
}

/**
 * Badge component for displaying ticket priority.
 * Uses centralized PRIORITY_LABELS for consistent text.
 * Semantic colors: HIGH=red (danger), NORMAL=amber (warning), LOW=green (success)
 */
export function PriorityBadge({ priority, size = 'sm', className, ...props }: PriorityBadgeProps) {
  const variant = PRIORITY_VARIANT_MAP[priority] ?? 'priorityNormal';
  const label = PRIORITY_LABELS[priority] ?? priority;
  const sizeClasses = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <Badge variant={variant} className={`${sizeClasses} ${className ?? ''}`} {...props}>
      {label}
    </Badge>
  );
}

export default PriorityBadge;
