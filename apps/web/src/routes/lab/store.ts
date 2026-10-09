import { DEFAULT_RUN_CONFIG, type Policy, type RiskSummary } from '@fintrix/contract';
import { create } from 'zustand';
import type { SimInput, SimOutput } from '../../lib/sim';
import type { WorkerIn, WorkerOut } from '../../lib/sim.worker';
import { toast } from '../../ui/Toast';

export interface Preset {
  id: string;
  name: string;
  ticker: string;
  policy: Policy;
}

/** The "watchlist": named policies a regulator compares. Index = fixed series colour. */
export const PRESETS: readonly Preset[] = [
  { id: 'base', name: 'Baseline', ticker: 'BASE', policy: DEFAULT_RUN_CONFIG.policy },
  {
    id: 'tight',
    name: 'Tight margin',
    ticker: 'MRG50',
    policy: { ...DEFAULT_RUN_CONFIG.policy, marginRequirementPct: 50 },
  },
  {
    id: 'loose',
    name: 'Loose margin',
    ticker: 'MRG5',
    policy: { ...DEFAULT_RUN_CONFIG.policy, marginRequirementPct: 5 },
  },
  {
    id: 'wide',
    name: 'Wide breaker',
    ticker: 'CB20',
    policy: { ...DEFAULT_RUN_CONFIG.policy, circuitBreakerPct: 20 },
  },
  {
    id: 'hike',
    name: 'Rate hike',
    ticker: 'RATE10',
    policy: { ...DEFAULT_RUN_CONFIG.policy, interestRatePct: 10 },
  },
];

export type Sim = Omit<SimInput, 'policy'>;
export const DEFAULT_SIM: Sim = {
  agents: 100_000,
  ticks: 2_000,
  scenarios: 500,
  seed: 42,
  barTicks: 10,
};
/** Measured in Chrome (dev build, laptop): 1M scenario-ticks took 0.33–0.42 s. */
export const estimateMs = (s: Sim) => s.ticks * s.scenarios * 0.0004;

type Status = 'idle' | 'running' | 'done' | 'error';

interface LabState {
  presetId: string | null;
  policy: Policy;
  sim: Sim;
  status: Status;
  progress: number;
  error: string | null;
  result: SimOutput | null;
  /** Last summary per preset id, for the watchlist. */
  watch: Record<string, RiskSummary>;
  setPolicy: (p: Partial<Policy>) => void;
  setSim: (s: Partial<Sim>) => void;
  loadPreset: (id: string) => void;
  reset: () => void;
  run: () => Promise<SimOutput | null>;
  runAll: () => Promise<void>;
}

const KEY = 'fintrix.lab';
function loadSaved(): Pick<LabState, 'policy' | 'sim' | 'presetId'> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Pick<
      LabState,
      'policy' | 'sim' | 'presetId'
    > | null;
    if (v?.policy && v.sim)
      return {
        policy: { ...DEFAULT_RUN_CONFIG.policy, ...v.policy },
        sim: { ...DEFAULT_SIM, ...v.sim },
        presetId: v.presetId ?? null,
      };
  } catch {
    /* fall through to defaults */
  }
  return { policy: DEFAULT_RUN_CONFIG.policy, sim: DEFAULT_SIM, presetId: 'base' };
}

let worker: Worker | null = null;
let nextId = 1;
function runInWorker(input: SimInput, onProgress: (p: number) => void): Promise<SimOutput> {
  worker ??= new Worker(new URL('../../lib/sim.worker.ts', import.meta.url), { type: 'module' });
  const id = nextId++;
  const w = worker;
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent<WorkerOut>) => {
      const m = e.data;
      if (m.id !== id) return;
      if (m.type === 'progress') return onProgress(m.done / m.total);
      w.removeEventListener('message', onMsg);
      if (m.type === 'done') resolve(m.result);
      else reject(new Error(m.message));
    };
    w.addEventListener('message', onMsg);
    w.postMessage({ id, input } satisfies WorkerIn);
  });
}

export const useLab = create<LabState>((set, get) => {
  const persist = () => {
    const { policy, sim, presetId } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ policy, sim, presetId }));
    } catch {
      /* storage blocked: session-only */
    }
  };
  return {
    ...loadSaved(),
    status: 'idle',
    progress: 0,
    error: null,
    result: null,
    watch: {},
    setPolicy: (p) => {
      const policy = { ...get().policy, ...p };
      const match = PRESETS.find((x) => JSON.stringify(x.policy) === JSON.stringify(policy));
      set({ policy, presetId: match?.id ?? null });
      persist();
    },
    setSim: (s) => {
      set({ sim: { ...get().sim, ...s } });
      persist();
    },
    loadPreset: (id) => {
      const p = PRESETS.find((x) => x.id === id);
      if (!p) return;
      set({ policy: p.policy, presetId: id });
      persist();
      void get().run();
    },
    reset: () => {
      set({ policy: DEFAULT_RUN_CONFIG.policy, sim: DEFAULT_SIM, presetId: 'base' });
      persist();
    },
    run: async () => {
      if (get().status === 'running') return null;
      const { policy, sim, presetId } = get();
      set({ status: 'running', progress: 0, error: null });
      try {
        const result = await runInWorker({ ...sim, policy }, (progress) => set({ progress }));
        set((s) => ({
          status: 'done',
          progress: 1,
          result,
          watch: presetId ? { ...s.watch, [presetId]: result.summary } : s.watch,
        }));
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        set({ status: 'error', error: message });
        toast({
          tone: 'danger',
          title: 'Simulation failed',
          description: `${message}. Try fewer scenarios or ticks.`,
        });
        return null;
      }
    },
    runAll: async () => {
      const current = get().presetId;
      for (const p of PRESETS) {
        set({ policy: p.policy, presetId: p.id });
        if (!(await get().run())) return;
      }
      if (current) get().loadPreset(current);
      toast({
        tone: 'success',
        title: `Compared ${PRESETS.length} policies`,
        description: 'VaR 99 and deltas vs Baseline are in the watchlist.',
      });
    },
  };
});
