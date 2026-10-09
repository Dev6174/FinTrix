import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SearchX, TriangleAlert } from 'lucide-react';
import {
  useDeferredValue,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';
import { formatNumber } from '../lib/number';
import { nextSort, viewIndices, type Cell, type SortState } from '../lib/table';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export interface Column<R> {
  id: string;
  header: string;
  value: (row: R) => Cell;
  render?: (row: R) => ReactNode;
  width: number;
  minWidth?: number;
  align?: 'left' | 'right';
}

export interface DataTableProps<R> {
  label: string;
  rows: readonly R[];
  columns: readonly Column<R>[];
  onRowActivate?: (row: R) => void;
  loading?: boolean;
  error?: string | null;
  empty?: ReactNode;
  height?: number;
  filterPlaceholder?: string;
}

const MIN_W = 56;

export function DataTable<R>({
  label,
  rows,
  columns,
  onRowActivate,
  loading,
  error,
  empty,
  height = 420,
  filterPlaceholder = 'Filter rows…',
}: DataTableProps<R>) {
  const uid = useId();
  const [sort, setSort] = useState<SortState | null>(null);
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter); // keep typing responsive on 20k rows
  const [widths, setWidths] = useState(() =>
    Object.fromEntries(columns.map((c) => [c.id, c.width])),
  );
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getters = useMemo(() => new Map(columns.map((c) => [c.id, c.value])), [columns]);
  const view = useMemo(
    () => viewIndices(rows, getters, sort, deferredFilter),
    [rows, getters, sort, deferredFilter],
  );
  const template = columns.map((c) => `${widths[c.id] ?? c.width}px`).join(' ');
  const totalWidth = columns.reduce((s, c) => s + (widths[c.id] ?? c.width), 0);

  // Read once per mount; density changes remount screens.
  const [rowH] = useState(
    () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row-h')) || 32,
  );
  const virt = useVirtualizer({
    count: view.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowH,
    overscan: 12,
  });

  const activeIdx = Math.min(active, Math.max(0, view.length - 1));
  const rowAt = (i: number) => rows[view[i]!]!;

  const onKeyDown = (e: KeyboardEvent) => {
    const page = Math.max(1, Math.floor(height / rowH) - 1);
    const moves: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      PageDown: page,
      PageUp: -page,
      Home: -Infinity,
      End: Infinity,
    };
    if (e.key in moves) {
      e.preventDefault();
      const next = Math.max(0, Math.min(view.length - 1, activeIdx + moves[e.key]!));
      setActive(next);
      virt.scrollToIndex(next, { align: 'auto' });
    } else if (e.key === 'Enter' && onRowActivate && view.length) {
      onRowActivate(rowAt(activeIdx));
    }
  };

  const startResize = (id: string, e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widths[id] ?? MIN_W;
    const min = columns.find((c) => c.id === id)?.minWidth ?? MIN_W;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: globalThis.PointerEvent) =>
      setWidths((w) => ({ ...w, [id]: Math.max(min, startW + ev.clientX - startX) }));
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };

  const body = (() => {
    if (error)
      return (
        <EmptyState
          tone="danger"
          icon={<TriangleAlert className="size-5" strokeWidth={1.5} />}
          title="Could not load rows"
          description={error}
        />
      );
    if (loading)
      return (
        <div role="status" aria-label="Loading rows">
          {Array.from({ length: Math.ceil(height / rowH) }, (_, i) => (
            <div
              key={i}
              className="grid h-row items-center gap-0 border-b border-border-subtle"
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((c) => (
                <div key={c.id} className="px-3">
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    if (!rows.length) return empty;
    if (!view.length)
      return (
        <EmptyState
          icon={<SearchX className="size-5" strokeWidth={1.5} />}
          title="No matching rows"
          description={`Nothing matches “${deferredFilter}”. Try a shorter or different term.`}
        />
      );
    return (
      <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
        {virt.getVirtualItems().map((vr) => {
          const row = rowAt(vr.index);
          const isActive = vr.index === activeIdx;
          return (
            <div
              key={vr.key}
              id={`${uid}-r${vr.index}`}
              role="row"
              aria-rowindex={vr.index + 2}
              aria-selected={isActive}
              onClick={() => {
                setActive(vr.index);
                onRowActivate?.(row);
              }}
              className={cn(
                'absolute top-0 left-0 grid h-row w-full items-center border-b border-border-subtle text-base',
                onRowActivate && 'cursor-pointer hover:bg-bg-2',
                isActive && 'bg-bg-2 shadow-[inset_2px_0_0_hsl(var(--accent))]',
              )}
              style={{ transform: `translateY(${vr.start}px)`, gridTemplateColumns: template }}
            >
              {columns.map((c) => {
                const v = c.value(row);
                return (
                  <div
                    key={c.id}
                    role="gridcell"
                    className={cn('truncate px-3', c.align === 'right' && 'num text-right')}
                  >
                    {c.render ? c.render(row) : typeof v === 'number' ? formatNumber(v) : v}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  })();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label className="relative w-64">
          <span className="sr-only">Filter {label}</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-3"
            strokeWidth={1.5}
          />
          <input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setActive(0);
            }}
            placeholder={filterPlaceholder}
            disabled={loading || !!error}
            className="h-control w-full rounded-sm border border-border-strong bg-bg-1 pr-2.5 pl-8 text-base text-fg placeholder:text-fg-3 focus-visible:border-accent focus-visible:outline-none disabled:opacity-50"
          />
        </label>
        <span className="num text-sm text-fg-3" aria-live="polite">
          {loading ? '—' : `${formatNumber(view.length)} of ${formatNumber(rows.length)} rows`}
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-border-subtle bg-bg-1">
        <div
          ref={scrollRef}
          role="grid"
          aria-label={label}
          aria-rowcount={view.length + 1}
          aria-colcount={columns.length}
          aria-busy={loading || undefined}
          tabIndex={0}
          aria-activedescendant={view.length ? `${uid}-r${activeIdx}` : undefined}
          onKeyDown={onKeyDown}
          className="overflow-auto focus-visible:outline-offset-[-2px]"
          style={{ height }}
        >
          <div style={{ minWidth: totalWidth }}>
            <div
              role="row"
              aria-rowindex={1}
              className="sticky top-0 z-10 grid h-row border-b border-border-strong bg-bg-2 text-sm font-medium text-fg-2"
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((c) => {
                const dir = sort?.id === c.id ? sort.dir : null;
                const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
                return (
                  <div
                    key={c.id}
                    role="columnheader"
                    aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="relative flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() => setSort((s) => nextSort(s, c.id))}
                      className={cn(
                        'flex h-full w-full items-center gap-1 px-3 hover:text-fg',
                        c.align === 'right' && 'flex-row-reverse text-right',
                        dir && 'text-fg',
                      )}
                    >
                      <span className="truncate">{c.header}</span>
                      <Icon
                        aria-hidden
                        className={cn('size-3.5 shrink-0', !dir && 'opacity-40')}
                        strokeWidth={1.5}
                      />
                    </button>
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${c.header}`}
                      aria-valuenow={widths[c.id]}
                      aria-valuemin={c.minWidth ?? MIN_W}
                      tabIndex={0}
                      onPointerDown={(e) => startResize(c.id, e)}
                      onKeyDown={(e) => {
                        const d = e.key === 'ArrowRight' ? 16 : e.key === 'ArrowLeft' ? -16 : 0;
                        if (!d) return;
                        e.preventDefault();
                        setWidths((w) => ({
                          ...w,
                          [c.id]: Math.max(c.minWidth ?? MIN_W, (w[c.id] ?? c.width) + d),
                        }));
                      }}
                      className="absolute top-1 right-0 bottom-1 w-1.5 cursor-col-resize border-r border-border-subtle hover:border-accent focus-visible:border-accent"
                    />
                  </div>
                );
              })}
            </div>
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}
