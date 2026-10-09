import { DEFAULT_RUN_CONFIG, type Policy, type RiskSummary } from '@fintrix/contract';
import { create } from 'zustand';
import type { CalibrationTarget, SimInput, SimOutput } from '../../lib/sim';
import type { WorkerIn, WorkerOut } from '../../lib/sim.worker';
import { toast } from '../../ui/Toast';
import { REGIMES, loadRegime, type LoadedRegime, type RegimeId } from './regimes';

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
  regimeId: RegimeId;
  /** Loaded market data for regimeId (null for synthetic or while loading). */
  regime: LoadedRegime | null;
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
  setRegime: (id: RegimeId) => Promise<void>;
  run: () => Promise<SimOutput | null>;
  runAll: () => Promise<void>;
}

const KEY = 'fintrix.lab';
type Saved = Pick<LabState, 'policy' | 'sim' | 'presetId' | 'regimeId'>;
function loadSaved(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Saved> | null;
    if (v?.policy && v.sim)
      return {
        policy: { ...DEFAULT_RUN_CONFIG.policy, ...v.policy },
        sim: { ...DEFAULT_SIM, ...v.sim },
        presetId: v.presetId ?? null,
        regimeId: REGIMES.some((r) => r.id === v.regimeId) ? v.regimeId! : 'synthetic',
      };
  } catch {
    /* fall through to defaults */
  }
  return {
    policy: DEFAULT_RUN_CONFIG.policy,
    sim: DEFAULT_SIM,
    presetId: 'base',
    regimeId: 'synthetic',
  };
}

let worker: Worker | null = null;
let nextId = 1;
function runInWorker(
  input: SimInput,
  target: CalibrationTarget | undefined,
  onProgress: (p: number) => void,
): Promise<SimOutput> {
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
    w.postMessage((target ? { id, input, target } : { id, input }) satisfies WorkerIn);
  });
}

export const useLab = create<LabState>((set, get) => {
  const persist = () => {
    const { policy, sim, presetId, regimeId } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ policy, sim, presetId, regimeId }));
    } catch {
      /* storage blocked: session-only */
    }
  };
  return {
    ...loadSaved(),
    regime: null,
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
      const { regime } = get();
      set({
        policy: DEFAULT_RUN_CONFIG.policy,
        sim: regime ? { ...DEFAULT_SIM, ticks: regime.stats.days, barTicks: 5 } : DEFAULT_SIM,
        presetId: 'base',
      });
      persist();
    },
    setRegime: async (id) => {
      if (get().status === 'running') return;
      // A different market makes old watchlist numbers incomparable.
      set({ regimeId: id, regime: null, watch: {}, result: null });
      if (id === 'synthetic') {
        set({ sim: { ...get().sim, ticks: DEFAULT_SIM.ticks, barTicks: DEFAULT_SIM.barTicks } });
      } else {
        const regime = await loadRegime(id);
        if (get().regimeId !== id) return; // switched again meanwhile
        // One tick = one trading day on the real calendar; weekly candles.
        set({ regime, sim: { ...get().sim, ticks: regime.stats.days, barTicks: 5 } });
      }
      persist();
      await get().run();
    },
    run: async () => {
      if (get().status === 'running') return null;
      set({ status: 'running', progress: 0, error: null });
      try {
        const { regimeId } = get();
        if (regimeId !== 'synthetic' && !get().regime) {
          const regime = await loadRegime(regimeId);
          set({ regime, sim: { ...get().sim, ticks: regime.stats.days } });
        }
        const { policy, sim, presetId, regime } = get();
        const target = regime
          ? {
              volAnnual: regime.stats.volAnnual,
              driftAnnual: regime.stats.driftAnnual,
              ticksPerYear: 252,
            }
          : undefined;
        const result = await runInWorker({ ...sim, policy }, target, (progress) =>
          set({ progress }),
        );
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
