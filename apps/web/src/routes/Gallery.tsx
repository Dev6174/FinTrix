import { DEFAULT_RUN_CONFIG, WORKER_STATES, type WorkerState } from '@fintrix/contract';
import { Database, FlaskConical, Play, Plus, RotateCcw, Settings2, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Badge, StatusDot, type Tone } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { useCommands } from '../ui/CommandPalette';
import { DataTable, type Column } from '../ui/DataTable';
import { ConfirmDialog, Dialog } from '../ui/Dialog';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { NumberField } from '../ui/NumberField';
import { Popover } from '../ui/Popover';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Select } from '../ui/Select';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { Slider } from '../ui/Slider';
import { Tabs } from '../ui/Tabs';
import { toast } from '../ui/Toast';
import { Tooltip } from '../ui/Tooltip';

const ic = (C: typeof Play) => <C aria-hidden className="size-4" strokeWidth={1.5} />;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`g-${title}`} className="flex flex-col gap-3">
      <h2 id={`g-${title}`} className="text-sm font-medium tracking-wide text-fg-3 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

const Row = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

/** Clearly-labelled synthetic rows (mulberry32, fixed seed) to exercise the virtualised table at 20k. */
interface DemoRow {
  scenario: number;
  seed: number;
  loss: number;
  volatility: number;
  defaults: number;
  status: 'ok' | 'halted';
}
function syntheticRows(n: number): DemoRow[] {
  let a = 0x9e3779b9;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: n }, (_, i) => {
    const loss = -Math.log(1 - rnd()) * 0.02;
    return {
      scenario: i,
      seed: (DEFAULT_RUN_CONFIG.seed + i) >>> 0,
      loss,
      volatility: 0.12 + rnd() * 0.25,
      defaults: Math.floor(loss * 120),
      status: rnd() < 0.08 ? 'halted' : 'ok',
    };
  });
}

const workerTone: Record<WorkerState, Tone> = {
  healthy: 'success',
  late: 'warning',
  failed: 'danger',
  recovering: 'info',
  idle: 'neutral',
};

export default function Gallery() {
  const [rate, setRate] = useState(DEFAULT_RUN_CONFIG.policy.interestRatePct);
  const [agents, setAgents] = useState(DEFAULT_RUN_CONFIG.agents);
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [scheduler, setScheduler] = useState<'static' | 'dynamic' | 'guided'>('dynamic');
  const [dialog, setDialog] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [tableState, setTableState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');
  const setPalette = useCommands((s) => s.setOpen);

  const rows = useMemo(() => syntheticRows(20_000), []);
  const columns = useMemo<Column<DemoRow>[]>(
    () => [
      { id: 'scenario', header: 'Scenario', value: (r) => r.scenario, width: 110, align: 'right' },
      { id: 'seed', header: 'Seed', value: (r) => r.seed, width: 110, align: 'right' },
      {
        id: 'loss',
        header: 'Loss',
        value: (r) => r.loss,
        render: (r) => `${(r.loss * 100).toFixed(2)}%`,
        width: 120,
        align: 'right',
      },
      {
        id: 'vol',
        header: 'Volatility',
        value: (r) => r.volatility,
        render: (r) => `${(r.volatility * 100).toFixed(1)}%`,
        width: 120,
        align: 'right',
      },
      { id: 'defaults', header: 'Defaults', value: (r) => r.defaults, width: 100, align: 'right' },
      {
        id: 'status',
        header: 'Status',
        value: (r) => r.status,
        render: (r) => (
          <Badge tone={r.status === 'ok' ? 'success' : 'warning'}>
            {r.status === 'ok' ? 'Completed' : 'Halted'}
          </Badge>
        ),
        width: 130,
      },
    ],
    [],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Component gallery</h1>
        <p className="text-base text-fg-2">
          Every primitive in every state, built only from design tokens. Toggle the theme in the top
          bar to check both.
        </p>
      </header>

      <Section title="Buttons">
        <Row>
          <Button
            variant="primary"
            icon={ic(Play)}
            shortcut="Ctrl ↵"
            onClick={() =>
              toast({
                tone: 'success',
                title: 'Run queued',
                description: 'Baseline policy · 2,000 scenarios',
              })
            }
          >
            Run policy
          </Button>
          <Button icon={ic(Plus)}>Add variant</Button>
          <Button variant="ghost" icon={ic(RotateCcw)}>
            Reset
          </Button>
          <Button variant="danger" icon={ic(Trash2)} onClick={() => setConfirm(true)}>
            Delete run
          </Button>
          <Button variant="primary" loading>
            Starting…
          </Button>
          <Button variant="primary" disabled disabledReason="Fix 2 invalid fields before running">
            Run (disabled)
          </Button>
          <Button size="sm">Small</Button>
        </Row>
        <Row>
          <IconButton label="Settings" icon={ic(Settings2)} />
          <IconButton label="Delete" variant="danger" icon={ic(Trash2)} />
          <IconButton label="Run" variant="primary" icon={ic(Play)} />
          <IconButton
            label="Delete"
            icon={ic(Trash2)}
            disabled
            disabledReason="Running runs cannot be deleted"
          />
        </Row>
      </Section>

      <Section title="Form controls">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Slider
            label="Interest rate"
            value={rate}
            onChange={setRate}
            min={0}
            max={20}
            step={0.25}
            unit="%"
            format={(n) => n.toFixed(2)}
          />
          <NumberField
            label="Interest rate"
            value={rate}
            onChange={setRate}
            min={0}
            max={20}
            step={0.25}
            unit="%"
          />
          <NumberField
            label="Agents"
            value={agents}
            onChange={setAgents}
            min={1000}
            max={1_000_000}
            step={1000}
            integer
            unit="agents"
          />
          <Input
            label="Run name"
            placeholder="e.g. Tight margin, Q3"
            hint="Shown in history and exports"
          />
          <Input
            label="Preset name"
            defaultValue=""
            error="A preset with this name already exists"
          />
          <Input label="Seed (disabled)" defaultValue="42" disabled />
          <Select
            label="Schedule"
            value={scheduler}
            onChange={setScheduler}
            options={[
              { value: 'static', label: 'static' },
              { value: 'dynamic', label: 'dynamic, 1024' },
              { value: 'guided', label: 'guided' },
            ]}
            hint="OpenMP loop schedule for agent updates"
          />
          <Slider
            label="Circuit breaker (disabled)"
            value={7}
            onChange={() => {}}
            min={1}
            max={50}
            unit="%"
            disabled
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg-2">Segmented control</span>
            <SegmentedControl
              label="Lab mode"
              value={mode}
              onChange={setMode}
              segments={[
                { value: 'single', label: 'Single policy' },
                { value: 'compare', label: 'Compare' },
              ]}
            />
            <SegmentedControl
              label="Disabled example"
              value="a"
              onChange={() => {}}
              disabled
              segments={[
                { value: 'a', label: 'Threads' },
                { value: 'b', label: 'Ranks' },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Status">
        <Row>
          {WORKER_STATES.map((s) => (
            <StatusDot
              key={s}
              tone={workerTone[s]}
              label={s[0]!.toUpperCase() + s.slice(1)}
              pulse={s === 'recovering'}
            />
          ))}
        </Row>
        <Row>
          <Badge>Queued</Badge>
          <Badge tone="accent">Running</Badge>
          <Badge tone="info">Recovering</Badge>
          <Badge tone="success">Completed</Badge>
          <Badge tone="warning">Late heartbeat</Badge>
          <Badge tone="danger">Failed</Badge>
        </Row>
      </Section>

      <Section title="Overlays">
        <Row>
          <Tooltip content="VaR 95: the loss exceeded in only 5% of scenarios">
            <Button variant="ghost">Hover or focus for tooltip</Button>
          </Tooltip>
          <Popover label="Estimate details" trigger={<Button>Open popover</Button>}>
            <div className="flex flex-col gap-2">
              <p className="font-medium">Estimate details</p>
              <p className="text-sm text-fg-2">
                Popovers hold secondary detail and close on Escape or outside click.
              </p>
            </div>
          </Popover>
          <Button onClick={() => setDialog(true)}>Open dialog</Button>
          <Button onClick={() => setPalette(true)} shortcut="Ctrl K">
            Command palette
          </Button>
          <Button
            onClick={() =>
              toast({
                tone: 'warning',
                title: 'Worker 2 heartbeat late',
                description: 'No heartbeat for 4.1 s (timeout 6 s)',
              })
            }
          >
            Warning toast
          </Button>
          <Button
            onClick={() =>
              toast({
                tone: 'danger',
                title: 'Engine exited with code 137: out of memory',
                description: 'Reduce agents or add RAM.',
              })
            }
          >
            Error toast
          </Button>
        </Row>
        <Dialog
          open={dialog}
          onOpenChange={setDialog}
          title="Save as preset"
          description="Presets store the policy and simulation settings, not results."
          footer={
            <>
              <Button onClick={() => setDialog(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setDialog(false)}>
                Save preset
              </Button>
            </>
          }
        >
          <Input label="Preset name" placeholder="Tight margin" autoFocus />
        </Dialog>
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Delete this run?"
          description="Results, events and checkpoints for this run are removed. This cannot be undone."
          confirmLabel="Delete run"
          onConfirm={() => toast({ tone: 'info', title: 'Run deleted' })}
        />
      </Section>

      <Section title="Tabs and cards">
        <Tabs
          label="Demo tabs"
          tabs={[
            {
              value: 'kpi',
              label: 'KPI card',
              content: (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card title="VaR 99%" description="Baseline policy">
                    <p className="num text-xl font-semibold">4.82%</p>
                    <p className="text-sm text-fg-3">Example card layout, not a measured result.</p>
                  </Card>
                  <Card title="Loading card">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="mt-2 h-4 w-40" />
                  </Card>
                  <Card title="Text loading">
                    <SkeletonText />
                  </Card>
                </div>
              ),
            },
            {
              value: 'empty',
              label: 'Empty states',
              content: (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <EmptyState
                      icon={<FlaskConical className="size-5" strokeWidth={1.5} />}
                      title="No runs yet"
                      description="Configure a policy in the Policy Lab and launch your first Monte Carlo run."
                      action={<Button variant="primary">Open Policy Lab</Button>}
                    />
                  </Card>
                  <Card>
                    <EmptyState
                      tone="danger"
                      icon={<Database className="size-5" strokeWidth={1.5} />}
                      title="Gateway unreachable"
                      description="Could not connect to localhost:8787. Start it with “make dev”, then retry."
                      action={<Button>Retry</Button>}
                    />
                  </Card>
                </div>
              ),
            },
            { value: 'disabled', label: 'Disabled tab', content: null, disabled: true },
          ]}
        />
      </Section>

      <Section title="Data table · 20,000 synthetic rows">
        <SegmentedControl
          label="Table state"
          value={tableState}
          onChange={setTableState}
          segments={[
            { value: 'data', label: 'Data' },
            { value: 'loading', label: 'Loading' },
            { value: 'empty', label: 'Empty' },
            { value: 'error', label: 'Error' },
          ]}
        />
        <DataTable
          label="Synthetic scenarios"
          rows={tableState === 'empty' ? [] : rows}
          columns={columns}
          loading={tableState === 'loading'}
          error={
            tableState === 'error'
              ? 'GET /api/runs/run_x/scenarios returned 503: engine busy. Retry in a few seconds.'
              : null
          }
          empty={
            <EmptyState
              icon={<Database className="size-5" strokeWidth={1.5} />}
              title="No scenarios yet"
              description="Scenario rows appear here as the run completes batches."
            />
          }
          onRowActivate={(r) =>
            toast({ tone: 'info', title: `Scenario ${r.scenario}`, description: `Seed ${r.seed}` })
          }
        />
        <p className="text-xs text-fg-3">
          Synthetic data (seeded generator) for UI testing. Not engine output.
        </p>
      </Section>
    </div>
  );
}
