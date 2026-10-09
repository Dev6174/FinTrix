import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Label + hint/error wiring shared by every form control. */
export function Field({
  label,
  hint,
  error,
  trailing,
  children,
  className,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  trailing?: ReactNode;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  const msg = error ?? hint;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-fg-2">
          {label}
        </label>
        {trailing}
      </div>
      {children({ id, describedBy: msg ? msgId : undefined, invalid: !!error })}
      {msg && (
        <p
          id={msgId}
          role={error ? 'alert' : undefined}
          className={cn('text-xs', error ? 'text-danger' : 'text-fg-3')}
        >
          {msg}
        </p>
      )}
    </div>
  );
}

export const controlBase =
  'h-control w-full rounded-sm border border-border-strong bg-bg-1 px-2.5 text-base text-fg ' +
  'placeholder:text-fg-3 transition-colors duration-(--dur-fast) ' +
  'hover:border-fg-3 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ' +
  'aria-invalid:border-danger aria-invalid:ring-danger/30 disabled:cursor-not-allowed disabled:opacity-50';
