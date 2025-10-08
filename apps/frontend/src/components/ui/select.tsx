import * as React from 'react';
import { cn } from '../../lib/utils';

// Re-export advanced select components for compatibility
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './select-advanced';

// Keep the basic select for backward compatibility
export type BasicSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const BasicSelect = React.forwardRef<HTMLSelectElement, BasicSelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
BasicSelect.displayName = 'BasicSelect';

export { BasicSelect };
