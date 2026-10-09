import type { KeyboardEvent, PointerEvent } from 'react';
import { cn } from '../lib/cn';
import { clamp } from '../lib/number';

/**
 * Drag handle in the gutter between two panels. `invert` when the resized panel sits after the handle
 * (right/bottom panels grow as the pointer moves left/up). Arrow keys resize by 16px.
 */
export function Splitter({
  label,
  orientation,
  size,
  min,
  max,
  invert,
  onResize,
}: {
  label: string;
  orientation: 'vertical' | 'horizontal';
  size: number;
  min: number;
  max: number;
  invert?: boolean;
  onResize: (size: number) => void;
}) {
  const vertical = orientation === 'vertical';
  const sign = invert ? -1 : 1;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const start = vertical ? e.clientX : e.clientY;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: globalThis.PointerEvent) =>
      onResize(clamp(size + sign * ((vertical ? ev.clientX : ev.clientY) - start), min, max));
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const keys = vertical ? { ArrowLeft: -16, ArrowRight: 16 } : { ArrowUp: -16, ArrowDown: 16 };
    const d = keys[e.key as keyof typeof keys];
    if (!d) return;
    e.preventDefault();
    onResize(clamp(size + sign * d, min, max));
  };

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(size)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        'relative z-10 bg-bg-0 transition-colors duration-(--dur-fast) hover:bg-accent/50 focus-visible:bg-accent focus-visible:outline-none',
        vertical ? 'h-full w-1 cursor-col-resize' : 'h-1 w-full cursor-row-resize',
      )}
    />
  );
}
