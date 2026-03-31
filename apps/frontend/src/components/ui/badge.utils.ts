import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-success-foreground hover:bg-success/80',
        // Ticket status variants
        statusOpen: 'border-transparent bg-success/10 text-success',
        statusInProgress: 'border-transparent bg-warning/10 text-warning',
        statusResolved: 'border-transparent bg-primary/10 text-primary',
        statusClosed: 'border-transparent bg-muted text-muted-foreground',
        // Ticket priority variants (semantically correct colors)
        priorityHigh: 'text-red-600',
        priorityNormal: 'text-amber-600',
        priorityLow: 'text-green-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);


