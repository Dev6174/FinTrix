import {
  ChevronDown,
  ChevronUp,
  Layers,
  ListOrdered,
  Play,
  Rows3,
  SlidersHorizontal,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Toolbar, ToolbarDivider } from '../../app/AppShell';
import { cn } from '../../lib/cn';
import { usePersisted } from '../../lib/usePersisted';
import { Button } from '../../ui/Button';
import { useRegisterCommands, type CommandItem } from '../../ui/CommandPalette';
import { Popover } from '../../ui/Popover';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Skeleton } from '../../ui/Skeleton';
import { Splitter } from '../../ui/Splitter';
import { Tooltip } from '../../ui/Tooltip';
import { BottomPanel } from './BottomPanel';
import { DetailsPanel, PolicyPanel, Watchlist } from './SidePanels';
import { PRESETS, estimateMs, useLab } from './store';

const PriceChart = lazy(() => import('./PriceChart').then((m) => ({ default: m.PriceChart })));

type Widget = 'watchlist' | 'policy';

export default function Lab() {
  const result = useLab((s) => s.result);
  const status = useLab((s) => s.status);
  const progress = useLab((s) => s.progress);
  const presetId = useLab((s) => s.presetId);
  const barTicks = useLab((s) => s.sim.barTicks);
  const sim = useLab((s) => s.sim);
  const run = useLab((s) => s.run);
  const runAll = useLab((s) => s.runAll);
  const setSim = useLab((s) => s.setSim);
  const loadPreset = useLab((s) => s.loadPreset);

  const [rightW, setRightW] = usePersisted('fintrix.layout.right', 300);
  const [bottomH, setBottomH] = usePersisted('fintrix.layout.bottom', 240);
  const [bottomOpen, setBottomOpen] = usePersisted('fintrix.layout.bottomOpen', true);
  const [widget, setWidget] = usePersisted<Widget>('fintrix.layout.widget', 'watchlist');
  const [showBand, setShowBand] = usePersisted('fintrix.chart.band', true);

  const ticker = PRESETS.find((p) => p.id === presetId)?.ticker ?? 'CUSTOM';
  const running = status === 'running';

  // First visit: run once so the chart is never empty.
  useEffect(() => {
    if (!useLab.getState().result) void run();
  }, [run]);

  // Ctrl/Cmd+Enter runs from anywhere on the screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: 'lab:run',
        group: 'Policy Lab',
        label: 'Run simulation',
        shortcut: 'Ctrl ↵',
        icon: <Play />,
        run: () => void run(),
      },
      {
        id: 'lab:runall',
        group: 'Policy Lab',
        label: 'Compare all policies',
        icon: <ListOrdered />,
        run: () => void runAll(),
      },
      ...PRESETS.map((p) => ({
        id: `lab:preset:${p.id}`,
        group: 'Policies',
        label: `${p.ticker} · ${p.name}`,
        keywords: [p.name],
        icon: <Layers />,
        run: () => loadPreset(p.id),
      })),
    ],
    [run, runAll, loadPreset],
  );
  useRegisterCommands(commands);

  return (
    <>
      <Toolbar>
        <Popover
          label="Choose policy"
          trigger={
            <button
              type="button"
              className="flex h-7 items-center gap-1.5 rounded-sm px-2 text-base font-semibold text-fg hover:bg-bg-3"
            >
              {ticker}
              <ChevronDown aria-hidden className="size-3.5 text-fg-2" strokeWidth={1.5} />
            </button>
          }
        >
          <ul className="-m-2 flex flex-col">
            {PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => loadPreset(p.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-bg-3',
                    p.id === presetId && 'text-accent',
                  )}
                >
                  <span className="font-semibold">{p.ticker}</span>
                  <span className="text-sm text-fg-2">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </Popover>
        <ToolbarDivider />
        <SegmentedControl
          label="Bar size in ticks"
          value={String(barTicks) as '5' | '10' | '50'}
          onChange={(v) => setSim({ barTicks: Number(v) })}
          segments={[
            { value: '5', label: '5T' },
            { value: '10', label: '10T' },
            { value: '50', label: '50T' },
          ]}
        />
        <ToolbarDivider />
        <Tooltip content="Show the 5–95% price band across all scenarios">
          <button
            type="button"
            aria-pressed={showBand}
            onClick={() => setShowBand(!showBand)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-sm px-2 text-sm hover:bg-bg-3',
              showBand ? 'text-accent' : 'text-fg-2',
            )}
          >
            <Rows3 aria-hidden className="size-4" strokeWidth={1.5} />
            Band
          </button>
        </Tooltip>
        <ToolbarDivider />
        <Button
          size="sm"
          variant="ghost"
          icon={<ListOrdered className="size-4" strokeWidth={1.5} />}
          onClick={() => void runAll()}
          disabled={running}
          disabledReason="A run is in progress"
        >
          Compare all
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon={<Play className="size-4" strokeWidth={1.5} />}
          loading={running}
          shortcut="Ctrl ↵"
          onClick={() => void run()}
        >
          {running ? `Running ${Math.round(progress * 100)}%` : 'Run'}
        </Button>
        <span className="num ml-2 hidden text-xs text-fg-3 xl:inline">
          {sim.scenarios.toLocaleString()} scen × {sim.ticks.toLocaleString()} ticks ≈{' '}
          {(estimateMs(sim) / 1000).toFixed(1)} s
        </span>
      </Toolbar>

      <div
        className="grid h-full min-h-0"
        style={{
          gridTemplateColumns: `minmax(0,1fr) 4px ${rightW}px 4px 40px`,
          gridTemplateRows: bottomOpen
            ? `minmax(0,1fr) 4px ${bottomH}px`
            : 'minmax(0,1fr) 4px 32px',
        }}
      >
        <section aria-label="Price chart" className="relative min-h-0 bg-bg-1">
          {running && (
            <div
              className="absolute inset-x-0 top-0 z-20 h-0.5 bg-bg-3"
              role="progressbar"
              aria-label="Simulation progress"
              aria-valuenow={Math.round(progress * 100)}
            >
              <div
                className="h-full bg-accent transition-[width] duration-(--dur-fast)"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
          <Suspense fallback={<Skeleton className="h-full rounded-none" />}>
            <PriceChart result={result} ticker={ticker} barTicks={barTicks} showBand={showBand} />
          </Suspense>
        </section>

        <div className="row-span-3">
          <Splitter
            label="Resize side panel"
            orientation="vertical"
            size={rightW}
            min={240}
            max={520}
            invert
            onResize={setRightW}
          />
        </div>

        <aside
          aria-label={widget === 'watchlist' ? 'Watchlist and details' : 'Policy settings'}
          className="row-span-3 flex min-h-0 flex-col bg-bg-1"
        >
          {widget === 'watchlist' ? (
            <>
              <Watchlist />
              <div className="h-1 bg-bg-0" />
              <DetailsPanel />
            </>
          ) : (
            <PolicyPanel />
          )}
        </aside>

        <div className="row-span-3 bg-bg-0" />

        <nav
          aria-label="Widgets"
          className="row-span-3 flex flex-col items-center gap-1 bg-bg-1 py-2"
        >
          {(
            [
              ['watchlist', 'Watchlist & details', ListOrdered],
              ['policy', 'Policy settings', SlidersHorizontal],
            ] as const
          ).map(([id, label, Icon]) => (
            <Tooltip key={id} content={label} side="left">
              <button
                type="button"
                aria-label={label}
                aria-pressed={widget === id}
                onClick={() => setWidget(id)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-sm hover:bg-bg-3',
                  widget === id ? 'text-accent' : 'text-fg-2 hover:text-fg',
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={1.5} />
              </button>
            </Tooltip>
          ))}
        </nav>

        {bottomOpen ? (
          <Splitter
            label="Resize bottom panel"
            orientation="horizontal"
            size={bottomH}
            min={120}
            max={560}
            invert
            onResize={setBottomH}
          />
        ) : (
          <div className="bg-bg-0" />
        )}

        <section aria-label="Bottom panel" className="min-h-0 bg-bg-1">
          <BottomPanel
            open={bottomOpen}
            height={bottomH}
            toggle={
              <Tooltip content={bottomOpen ? 'Collapse panel' : 'Expand panel'}>
                <button
                  type="button"
                  aria-label={bottomOpen ? 'Collapse panel' : 'Expand panel'}
                  aria-expanded={bottomOpen}
                  onClick={() => setBottomOpen(!bottomOpen)}
                  className="flex size-7 items-center justify-center rounded-sm text-fg-2 hover:bg-bg-3 hover:text-fg"
                >
                  {bottomOpen ? (
                    <ChevronDown aria-hidden className="size-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronUp aria-hidden className="size-4" strokeWidth={1.5} />
                  )}
                </button>
              </Tooltip>
            }
          />
        </section>
      </div>
    </>
  );
}
