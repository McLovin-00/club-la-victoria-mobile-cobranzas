import * as React from 'react';

export type TicketSource = 'platform' | 'telegram';

export interface SourceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  source: TicketSource;
}

/**
 * Badge component for displaying ticket source (Telegram vs Web).
 * Uses Telegram brand blue for telegram source.
 */
export function SourceBadge({ source, className, ...props }: SourceBadgeProps) {
  const isTelegram = source === 'telegram';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        isTelegram
          ? 'bg-[#229ED9]/10 text-[#229ED9] dark:bg-[#229ED9]/20 dark:text-[#229ED9]'
          : 'bg-muted text-muted-foreground'
      } ${className ?? ''}`}
      {...props}
    >
      {isTelegram ? (
        <>
          {/* Telegram icon */}
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Telegram
        </>
      ) : (
        <>
          {/* Web/Desktop icon */}
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/>
          </svg>
          Web
        </>
      )}
    </span>
  );
}

export default SourceBadge;
