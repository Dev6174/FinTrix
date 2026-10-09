import { Activity } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { usePersisted } from '../../lib/usePersisted';
import type { ScenarioRow, SimEvent } from '../../lib/sim';
import { Badge } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { EmptyState } from '../../ui/EmptyState';
import { useLab } from './store';

type Tab = 'scenarios' | 'events' | 'model';
const TABS: { id: Tab; label: string }[] = [
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'events', label: 'Event log' },
  { id: 'model', label: 'About the model' },
];

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

export function BottomPanel({
  open,
  toggle,
  height,
}: {
  open: boolean;
  toggle: ReactNode;
  height: number;
}) {
  // panel minus tab strip (32), padding (16), filter row (38)
  const tableH = Math.max(80, height - 86);
  const [tab, setTab] = usePersisted<Tab>('fintrix.layout.bottomTab', 'scenarios');
  const result = useLab((s) => s.result);
  const status = useLab((s) => s.status);
  const error = useLab((s) => s.error);
  const dates = useLab((s) => s.regime?.dates ?? null);

  const scenarioCols = useMemo<Column<ScenarioRow>[]>(
    () => [
      { id: 'scenario', header: '#', value: (r) => r.scenario, width: 64, align: 'right' },
      { id: 'seed', header: 'Seed', value: (r) => r.seed, width: 140, align: 'right' },
      {
        id: 'loss',
        header: 'Bank loss',
        value: (r) => r.loss,
        render: (r) => <span className={r.loss > 0 ? 'text-down' : 'text-up'}>{pct(r.loss)}</span>,
        width: 100,
        align: 'right',
      },
      {
        id: 'final',
        header: 'Final price',
        value: (r) => r.finalPrice,
        render: (r) => r.finalPrice.toFixed(2),
        width: 100,
        align: 'right',
      },
      {
        id: 'vol',
        header: 'Volatility',
        value: (r) => r.volatility,
        render: (r) => pct(r.volatility),
        width: 100,
        align: 'right',
      },
      {
        id: 'dd',
        header: 'Max DD',
        value: (r) => r.maxDrawdown,
        render: (r) => pct(r.maxDrawdown),
        width: 100,
        align: 'right',
      },
      {
        id: 'cb',
        header: 'Halts',
        value: (r) => r.circuitBreakerTriggers,
        width: 84,
        align: 'right',
      },
      { id: 'def', header: 'Defaults', value: (r) => r.defaults, width: 100, align: 'right' },
    ],
    [],
  );

  const eventCols = useMemo<Column<SimEvent>[]>(
    () => [
      dates
        ? { id: 'tick', header: 'Date', value: (e) => dates[e.tick] ?? String(e.tick), width: 110 }
        : { id: 'tick', header: 'Tick', value: (e) => e.tick, width: 80, align: 'right' },
      {
        id: 'kind',
        header: 'Type',
        value: (e) => e.kind,
        render: (e) =>
          e.kind === 'circuit_breaker' ? (
            <Badge tone="warning">Circuit breaker</Badge>
          ) : e.kind === 'resume' ? (
            <Badge tone="info">Resumed</Badge>
          ) : (
            <Badge tone="danger">Default</Badge>
          ),
        width: 140,
      },
      { id: 'detail', header: 'Detail', value: (e) => e.detail, width: 520 },
    ],
    [dates],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Bottom panel"
        className="flex h-8 shrink-0 items-center gap-0.5 border-b border-border-subtle px-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={open && tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'h-7 rounded-sm px-2.5 text-sm hover:bg-bg-3',
              open && tab === t.id ? 'text-fg' : 'text-fg-2',
            )}
          >
            {t.label}
            {t.id === 'events' && result ? (
              <span className="num ml-1.5 text-fg-3">{result.events.length}</span>
            ) : null}
          </button>
        ))}
        <span className="flex-1" />
        {toggle}
      </div>
      {open && (
        <div role="tabpanel" className="min-h-0 flex-1 overflow-auto p-2">
          {tab === 'scenarios' && (
            <DataTable
              key={result ? result.rows.length + ':' + result.elapsedMs : 'none'}
              label="Scenario results"
              rows={result?.rows ?? []}
              columns={scenarioCols}
              loading={!result && status === 'running'}
              error={status === 'error' ? error : null}
              height={tableH}
              empty={
                <EmptyState
                  icon={<Activity className="size-5" strokeWidth={1.5} />}
                  title="No run yet"
                  description="Press Run (Ctrl+Enter) to simulate this policy."
                />
              }
            />
          )}
          {tab === 'events' && (
            <DataTable
              key={dates ? 'daily' : 'synthetic'}
              label="Event log, scenario 0"
              rows={result?.events ?? []}
              columns={eventCols}
              loading={!result && status === 'running'}
              height={tableH}
              empty={
                <EmptyState
                  icon={<Activity className="size-5" strokeWidth={1.5} />}
                  title="Quiet market"
                  description="No circuit-breaker halts or bank defaults in scenario 0. Try a looser margin (MRG5)."
                />
              }
            />
          )}
          {tab === 'model' && <ModelNotes />}
        </div>
      )}
    </div>
  );
}

function ModelNotes() {
  return (
    <div className="max-w-3xl space-y-2 p-2 text-base text-fg-2">
      <p>
        <Badge tone="warning">Synthetic</Badge> This screen runs an in-browser model in a Web Worker
        so you can explore policies before the C++ HPC engine is connected. Results are
        deterministic for a given seed.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b className="text-fg">Fundamentalists</b> pull price toward a fundamental value whose
          growth slows as the interest rate rises.
        </li>
        <li>
          <b className="text-fg">Chartists</b> chase momentum, with strength scaled by leverage (1 ÷
          margin requirement). Low margin means stronger feedback loops and crashes.
        </li>
        <li>
          <b className="text-fg">Noise traders</b> add randomness that shrinks as the agent count
          grows.
        </li>
        <li>
          <b className="text-fg">Circuit breaker</b>: a move beyond the threshold halts trading for
          30 ticks and resets momentum.
        </li>
        <li>
          <b className="text-fg">Banks</b> (20) hold the market at the allowed leverage. A loss
          above their margin buffer causes default, and each default spills losses onto the others
          (contagion).
        </li>
      </ul>
      <p>
        Each scenario has its own seed, so results never depend on how work is split across threads,
        the same rule the HPC engine follows.
      </p>
    </div>
  );
}
