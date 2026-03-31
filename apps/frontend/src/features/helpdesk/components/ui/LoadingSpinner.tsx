import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border',
  md: 'h-8 w-8 border-b-2',
  lg: 'h-12 w-12 border-b-2',
} as const;

/**
 * Reusable loading spinner with configurable size.
 * Uses Tailwind animate-spin and primary color for consistency.
 */
export function LoadingSpinner({ size = 'md', className, ...props }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary',
        SIZE_CLASSES[size],
        className
      )}
      role="status"
      aria-label="Cargando"
      {...props}
    />
  );
}

export default LoadingSpinner;
