import * as S from '@radix-ui/react-slider';
import { useId } from 'react';
import { formatNumber } from '../lib/number';

export interface SliderProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  format?: (n: number) => string;
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  disabled,
  format = formatNumber,
}: SliderProps) {
  const id = useId();
  const text = `${format(value)}${unit ? ` ${unit}` : ''}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span id={id} className="text-sm font-medium text-fg-2">
          {label}
        </span>
        <output aria-live="off" className="num text-sm text-fg">
          {text}
        </output>
      </div>
      <S.Root
        aria-labelledby={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        className="relative flex h-5 touch-none select-none items-center data-disabled:opacity-50"
      >
        <S.Track className="relative h-1 grow rounded-full bg-bg-3">
          <S.Range className="absolute h-full rounded-full bg-accent" />
        </S.Track>
        <S.Thumb
          aria-valuetext={text}
          className="block size-4 rounded-full border-2 border-accent bg-bg-0 shadow-sm transition-transform duration-(--dur-fast) hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95 data-disabled:cursor-not-allowed"
        />
      </S.Root>
    </div>
  );
}
