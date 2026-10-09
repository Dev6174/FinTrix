import * as T from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export interface TabDef<V extends string> {
  value: V;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export function Tabs<V extends string>({
  label,
  tabs,
  value,
  onChange,
  defaultValue,
}: {
  label: string;
  tabs: readonly TabDef<V>[];
  value?: V;
  onChange?: (v: V) => void;
  defaultValue?: V;
}) {
  const controlled =
    value !== undefined ? { value } : { defaultValue: defaultValue ?? tabs[0]?.value };
  return (
    <T.Root {...controlled} onValueChange={(v) => onChange?.(v as V)} className="flex flex-col">
      <T.List aria-label={label} className="flex gap-4 border-b border-border-subtle">
        {tabs.map((t) => (
          <T.Trigger
            key={t.value}
            value={t.value}
            disabled={t.disabled ?? false}
            className="-mb-px h-9 border-b-2 border-transparent px-0.5 text-base text-fg-2 transition-colors duration-(--dur-fast) hover:text-fg data-disabled:cursor-not-allowed data-disabled:opacity-40 data-[state=active]:border-accent data-[state=active]:text-fg"
          >
            {t.label}
          </T.Trigger>
        ))}
      </T.List>
      {tabs.map((t) => (
        <T.Content key={t.value} value={t.value} className="pt-4 focus-visible:outline-offset-4">
          {t.content}
        </T.Content>
      ))}
    </T.Root>
  );
}
