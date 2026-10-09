import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: 'neutral' | 'danger';
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'flex size-10 items-center justify-center rounded-md border',
          tone === 'danger'
            ? 'border-danger/40 bg-danger/10 text-danger'
            : 'border-border-subtle bg-bg-2 text-fg-3',
        )}
      >
        {icon}
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <h3 className="text-md font-semibold text-fg">{title}</h3>
        <p className="text-base text-fg-2">{description}</p>
      </div>
      {action}
    </div>
  );
}
