import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Card({
  title,
  description,
  actions,
  children,
  className,
  ...rest
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-md border border-border-subtle bg-bg-1 shadow-sm',
        className,
      )}
      {...rest}
    >
      {(title || actions) && (
        <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border-subtle px-4 py-2">
          <div className="flex min-w-0 flex-col">
            {title && <h3 className="truncate text-base font-semibold text-fg">{title}</h3>}
            {description && <p className="truncate text-sm text-fg-3">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}
