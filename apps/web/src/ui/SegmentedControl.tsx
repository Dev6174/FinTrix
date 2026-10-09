import * as TG from '@radix-ui/react-toggle-group';
import type { ReactNode } from 'react';

export interface Segment<V extends string> {
  value: V;
  label: ReactNode;
  disabled?: boolean;
}

/** Single-choice toggle. Always has a value: clicking the active segment does not clear it. */
export function SegmentedControl<V extends string>({
  label,
  value,
  onChange,
  segments,
  disabled,
}: {
  label: string;
  value: V;
  onChange: (v: V) => void;
  segments: readonly Segment<V>[];
  disabled?: boolean;
}) {
  return (
    <TG.Root
      type="single"
      aria-label={label}
      value={value}
      disabled={disabled}
      onValueChange={(v) => v && onChange(v as V)}
      className="inline-flex h-control items-center gap-0.5 rounded-sm border border-border-subtle bg-bg-1 p-0.5 data-disabled:opacity-50"
    >
      {segments.map((s) => (
        <TG.Item
          key={s.value}
          value={s.value}
          disabled={s.disabled ?? false}
          className="inline-flex h-full items-center gap-1.5 rounded-[calc(var(--radius-sm)-2px)] px-2.5 text-sm text-fg-2 transition-colors duration-(--dur-fast) hover:text-fg data-disabled:cursor-not-allowed data-disabled:opacity-40 data-[state=on]:bg-bg-3 data-[state=on]:text-fg data-[state=on]:shadow-sm"
        >
          {s.label}
        </TG.Item>
      ))}
    </TG.Root>
  );
}
