import type { RiskSummary } from '@fintrix/contract';
import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/Button';
import { NumberField } from '../../ui/NumberField';
import { Skeleton } from '../../ui/Skeleton';
import { Slider } from '../../ui/Slider';
import { PRESETS, estimateMs, useLab } from './store';

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;

function PanelHeader({ id, title, actions }: { id: string; title: string; actions?: ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-subtle px-3">
      <h2 id={id} className="text-sm font-semibold tracking-wide text-fg uppercase">
        {title}
      </h2>
      {actions}
    </div>
  );
}

/** Policies as tickers. Risk metric is VaR 99; lower is better, so a drop vs BASE is green. */
export function Watchlist() {
  const watch = useLab((s) => s.watch);
  const presetId = useLab((s) => s.presetId);
  const loadPreset = useLab((s) => s.loadPreset);
  const running = useLab((s) => s.status === 'running');
  const base = watch.base?.var99;

  return (
    <section aria-labelledby="wl-h" className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-subtle px-3">
        <h2 id="wl-h" className="text-sm font-semibold tracking-wide text-fg uppercase">
          Watchlist
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          aria-hidden
          className="grid h-7 grid-cols-[1fr_72px_72px] items-center px-3 text-xs text-fg-2"
        >
          <span>Policy</span>
          <span className="text-right">VaR 99</span>
          <span className="text-right">vs BASE</span>
        </div>
        <ul aria-label="Policy watchlist">
          {PRESETS.map((p, i) => {
            const s = watch[p.id];
            const delta = s && base ? s.var99 / base - 1 : null;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-label={`${p.ticker} ${p.name}${s ? `, VaR 99 ${pct(s.var99)}` : ', not run yet'}${delta !== null && p.id !== 'base' ? `, ${(delta * 100).toFixed(1)}% vs baseline` : ''}`}
                  disabled={running}
                  onClick={() => loadPreset(p.id)}
                  aria-current={p.id === presetId || undefined}
                  className={cn(
                    'grid h-row w-full grid-cols-[1fr_72px_72px] items-center px-3 text-left text-base hover:bg-bg-3 disabled:cursor-wait',
                    p.id === presetId && 'bg-accent-subtle hover:bg-accent-subtle',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: `hsl(var(--series-${i + 1}))` }}
                    />
                    <span className="font-semibold">{p.ticker}</span>
                    <span className="truncate text-xs text-fg-2">{p.name}</span>
                  </span>
                  <span className="num text-right">{s ? pct(s.var99) : '—'}</span>
                  <span
                    className={cn(
                      'num text-right',
                      delta === null ? 'text-fg-3' : delta <= 0 ? 'text-up' : 'text-down',
                    )}
                  >
                    {delta === null
                      ? '—'
                      : p.id === 'base'
                        ? '0.0%'
                        : `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="px-3 py-2 text-xs text-fg-2">
          Click a policy to simulate it. “Compare all” in the toolbar runs every row.
        </p>
      </div>
    </section>
  );
}

const KPIS: { key: keyof RiskSummary; label: string; fmt: (v: number) => string; hint: string }[] =
  [
    {
      key: 'var95',
      label: 'VaR 95',
      fmt: (v) => pct(v),
      hint: 'Bank loss exceeded in only 5% of scenarios',
    },
    {
      key: 'var99',
      label: 'VaR 99',
      fmt: (v) => pct(v),
      hint: 'Bank loss exceeded in only 1% of scenarios',
    },
    {
      key: 'es95',
      label: 'Exp. shortfall 95',
      fmt: (v) => pct(v),
      hint: 'Average loss in the worst 5%',
    },
    {
      key: 'es99',
      label: 'Exp. shortfall 99',
      fmt: (v) => pct(v),
      hint: 'Average loss in the worst 1%',
    },
    {
      key: 'volatility',
      label: 'Volatility (ann.)',
      fmt: (v) => pct(v, 1),
      hint: 'Mean annualised volatility',
    },
    {
      key: 'maxDrawdown',
      label: 'Max drawdown',
      fmt: (v) => pct(v, 1),
      hint: 'Mean peak-to-trough fall',
    },
    {
      key: 'circuitBreakerTriggers',
      label: 'Breaker halts',
      fmt: (v) => v.toLocaleString(),
      hint: 'Total halts across all scenarios',
    },
    {
      key: 'cascadingDefaults',
      label: 'Bank defaults',
      fmt: (v) => v.toFixed(2),
      hint: 'Mean defaults per scenario (of 20 banks)',
    },
  ];

export function DetailsPanel() {
  const result = useLab((s) => s.result);
  const sim = useLab((s) => s.sim);
  const policy = useLab((s) => s.policy);
  const base = useLab((s) => s.watch.base);
  const presetId = useLab((s) => s.presetId);
  const status = useLab((s) => s.status);

  return (
    <section aria-labelledby="dt-h" className="flex min-h-0 flex-[1.4] flex-col">
      <div className="flex h-9 shrink-0 items-center border-b border-border-subtle px-3">
        <h2 id="dt-h" className="text-sm font-semibold tracking-wide text-fg uppercase">
          Risk details
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
        <p className="num mb-2 text-xs text-fg-2">
          Rate {policy.interestRatePct}% · Margin {policy.marginRequirementPct}% · Breaker{' '}
          {policy.circuitBreakerPct}%
        </p>
        <dl className="grid grid-cols-1">
          {KPIS.map(({ key, label, fmt, hint }) => {
            const v = result?.summary[key];
            const b = base?.[key];
            // Counts compare as absolute differences (a % change on a small count is meaningless).
            const isCount = key === 'circuitBreakerTriggers' || key === 'cascadingDefaults';
            const d =
              v === undefined || b === undefined ? null : isCount ? v - b : b ? v / b - 1 : null;
            const deltaText =
              d === null
                ? ''
                : `${d > 0 ? '+' : ''}${isCount ? fmt(d) : `${(d * 100).toFixed(1)}%`}`;
            return (
              <div
                key={key}
                className="flex h-7 items-center justify-between border-b border-border-subtle/60"
                title={hint}
              >
                <dt className="text-base text-fg-2">{label}</dt>
                <dd className="flex items-baseline gap-2">
                  {v === undefined ? (
                    <Skeleton className="h-3 w-14" />
                  ) : (
                    <>
                      <span className="num text-base text-fg">{fmt(v)}</span>
                      {d !== null && presetId !== 'base' && Math.abs(d) > 0.0005 && (
                        <span
                          className={cn(
                            'num min-w-14 text-right text-xs',
                            d <= 0 ? 'text-up' : 'text-down',
                          )}
                        >
                          {deltaText}
                        </span>
                      )}
                    </>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
        {result && (
          <p className="mt-3 text-sm text-fg-2">
            {plainLanguage(result.summary)}{' '}
            <span className="text-fg-3">
              {sim.scenarios.toLocaleString()} scenarios in {(result.elapsedMs / 1000).toFixed(2)} s
              {status === 'running' ? ' · updating…' : ''}.
            </span>
          </p>
        )}
      </div>
    </section>
  );
}

function plainLanguage(s: RiskSummary): string {
  const sev =
    s.var99 > 0.06 ? 'High tail risk' : s.var99 > 0.03 ? 'Moderate tail risk' : 'Low tail risk';
  const def =
    s.cascadingDefaults >= 1
      ? ` Bank failures spread: ~${s.cascadingDefaults.toFixed(1)} defaults per scenario.`
      : ' No meaningful contagion.';
  return `${sev}: in the worst 1% of cases banks lose ${pct(s.var99, 1)} or more.${def}`;
}

export function PolicyPanel() {
  const policy = useLab((s) => s.policy);
  const sim = useLab((s) => s.sim);
  const setPolicy = useLab((s) => s.setPolicy);
  const setSim = useLab((s) => s.setSim);
  const reset = useLab((s) => s.reset);
  const run = useLab((s) => s.run);
  const running = useLab((s) => s.status === 'running');
  const est = estimateMs(sim);

  return (
    <section aria-labelledby="pp-h" className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        id="pp-h"
        title="Policy settings"
        actions={
          <Button
            size="sm"
            variant="ghost"
            icon={<RotateCcw className="size-3.5" strokeWidth={1.5} />}
            onClick={reset}
          >
            Reset
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-3">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-fg-2 uppercase">
            Policy
          </legend>
          <Slider
            label="Interest rate"
            value={policy.interestRatePct}
            onChange={(v) => setPolicy({ interestRatePct: v })}
            min={0}
            max={20}
            step={0.25}
            unit="%"
            format={(n) => n.toFixed(2)}
          />
          <Slider
            label="Margin requirement"
            value={policy.marginRequirementPct}
            onChange={(v) => setPolicy({ marginRequirementPct: v })}
            min={1}
            max={100}
            unit="%"
          />
          <Slider
            label="Circuit breaker"
            value={policy.circuitBreakerPct}
            onChange={(v) => setPolicy({ circuitBreakerPct: v })}
            min={1}
            max={50}
            step={0.5}
            unit="%"
          />
        </fieldset>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-fg-2 uppercase">
            Simulation
          </legend>
          <NumberField
            label="Agents"
            value={sim.agents}
            onChange={(v) => setSim({ agents: v })}
            min={1000}
            max={1_000_000}
            step={1000}
            integer
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Ticks"
              value={sim.ticks}
              onChange={(v) => setSim({ ticks: v })}
              min={200}
              max={10_000}
              step={100}
              integer
            />
            <NumberField
              label="Scenarios"
              value={sim.scenarios}
              onChange={(v) => setSim({ scenarios: v })}
              min={20}
              max={2000}
              step={10}
              integer
            />
          </div>
          <NumberField
            label="Seed"
            value={sim.seed}
            onChange={(v) => setSim({ seed: v })}
            min={0}
            max={4_294_967_295}
            integer
            hint="Same seed → identical results"
          />
        </fieldset>
        <div className="mt-auto flex flex-col gap-2">
          <p className={cn('num text-xs', est > 5000 ? 'text-warning' : 'text-fg-2')}>
            Estimated {(est / 1000).toFixed(1)} s in this browser
            {est > 5000 ? ' (long: reduce scenarios or ticks)' : ''}
          </p>
          <Button variant="primary" loading={running} shortcut="Ctrl ↵" onClick={() => void run()}>
            Run simulation
          </Button>
        </div>
      </div>
    </section>
  );
}
