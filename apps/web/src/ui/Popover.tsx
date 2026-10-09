import * as P from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

export function Popover({
  trigger,
  children,
  label,
  side = 'bottom',
  align = 'start',
}: {
  trigger: ReactNode;
  children: ReactNode;
  /** Accessible name for the popover content. */
  label: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <P.Root>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content
          aria-label={label}
          side={side}
          align={align}
          sideOffset={6}
          className="z-50 w-72 rounded-md border border-border-subtle bg-bg-2 p-4 text-base shadow-lg"
        >
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
