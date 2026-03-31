import * as React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  value: number | string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Card component for displaying metrics/statistics.
 * Replaces duplicate stat card implementations across helpdesk pages.
 */
export function StatCard({ value, label, color, icon, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <CardTitle className={cn('text-3xl', color)}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export default StatCard;
