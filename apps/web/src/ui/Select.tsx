import * as S from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';
import { Field, controlBase } from './Field';

export interface SelectOption<V extends string> {
  value: V;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<V extends string> {
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: readonly SelectOption<V>[];
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function Select<V extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  disabled,
  className,
}: SelectProps<V>) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <S.Root value={value} onValueChange={(v) => onChange(v as V)} disabled={disabled}>
          <S.Trigger
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(
              controlBase,
              'flex items-center justify-between gap-2 text-left data-placeholder:text-fg-3',
            )}
          >
            <S.Value />
            <S.Icon>
              <ChevronDown aria-hidden className="size-4 text-fg-3" strokeWidth={1.5} />
            </S.Icon>
          </S.Trigger>
          <S.Portal>
            <S.Content
              position="popper"
              sideOffset={4}
              className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border-subtle bg-bg-2 p-1 shadow-lg"
            >
              <S.Viewport>
                {options.map((o) => (
                  <S.Item
                    key={o.value}
                    value={o.value}
                    disabled={o.disabled ?? false}
                    className="relative flex h-control cursor-default select-none items-center rounded-sm pr-2 pl-7 text-base text-fg outline-none data-disabled:opacity-40 data-highlighted:bg-bg-3"
                  >
                    <S.ItemIndicator className="absolute left-2">
                      <Check aria-hidden className="size-4 text-accent" strokeWidth={1.5} />
                    </S.ItemIndicator>
                    <S.ItemText>{o.label}</S.ItemText>
                  </S.Item>
                ))}
              </S.Viewport>
            </S.Content>
          </S.Portal>
        </S.Root>
      )}
    </Field>
  );
}
