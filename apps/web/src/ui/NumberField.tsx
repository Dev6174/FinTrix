import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../lib/cn';
import { clamp, formatNumber, parseNumber, snap, validateNumber } from '../lib/number';
import { Field, controlBase } from './Field';

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  integer?: boolean;
  unit?: string;
  hint?: string;
  disabled?: boolean;
  /** Reports validity of the current draft so parent forms can block submit. */
  onValidityChange?: (error: string | null) => void;
  className?: string;
}

/**
 * Text input (not type=number: no scroll-wheel surprises, accepts "1,000,000").
 * ↑/↓ steps, Shift ×10. Commits on blur/Enter; invalid drafts are kept and explained.
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  integer,
  unit,
  hint,
  disabled,
  onValidityChange,
  className,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(() => formatNumber(value));
  const [error, setError] = useState<string | null>(null);

  // External value changes (reset, slider) replace the draft; our own edits don't reformat mid-typing.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    if (parseNumber(draftRef.current) === value) return;
    setDraft(formatNumber(value));
    setError(null);
    onValidityChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only external value changes matter
  }, [value]);

  const update = (raw: string) => {
    setDraft(raw);
    const e = validateNumber(raw, { min, max, integer: integer ?? false });
    setError(e);
    onValidityChange?.(e);
    const n = parseNumber(raw);
    if (!e && n !== null && n !== value) onChange(n);
  };

  const commit = () => {
    if (!error) setDraft(formatNumber(value));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') return commit();
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const base = parseNumber(draft) ?? value;
    const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
    const next = clamp(snap(base + delta, step), min, max);
    update(formatNumber(next));
  };

  return (
    <Field
      label={label}
      error={error ?? undefined}
      hint={hint ?? `${formatNumber(min)}–${formatNumber(max)}${unit ? ` ${unit}` : ''}`}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            value={draft}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            role="spinbutton"
            onChange={(e) => update(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            className={cn(controlBase, 'num text-right', unit && 'pr-12')}
          />
          {unit && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-fg-3"
            >
              {unit}
            </span>
          )}
        </div>
      )}
    </Field>
  );
}
