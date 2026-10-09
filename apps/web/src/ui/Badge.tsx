import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const badgeTone: Record<Tone, string> = {
  neutral: 'text-fg-2 border-border-strong',
  accent: 'text-accent border-accent/50 bg-accent/10',
  success: 'text-success border-success/50 bg-success/10',
  warning: 'text-warning border-warning/50 bg-warning/10',
  danger: 'text-danger border-danger/50 bg-danger/10',
  info: 'text-info border-info/50 bg-info/10',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 text-xs font-medium',
        badgeTone[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const dotTone: Record<Tone, string> = {
  neutral: 'bg-fg-3',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

/** Colour is never the only signal: the label is always rendered (visually or for screen readers). */
export function StatusDot({
  tone,
  label,
  pulse,
  showLabel = true,
}: {
  tone: Tone;
  label: string;
  pulse?: boolean;
  showLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-fg-2">
      <span aria-hidden className="relative flex size-2">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping',
              dotTone[tone],
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', dotTone[tone])} />
      </span>
      <span className={showLabel ? undefined : 'sr-only'}>{label}</span>
    </span>
  );
}
