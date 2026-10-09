import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../schema/fintrix.schema.json';
import { DEFAULT_RUN_CONFIG, FRAME_TYPES } from './index';

const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addSchema(schema);
const ref = (name: string) => ajv.getSchema(`${schema.$id}#/$defs/${name}`)!;

const base = { runId: 'run_abc123def456', seq: 1, ts: 1_700_000_000_000 };
const series = [100, 101];
const valid: Record<(typeof FRAME_TYPES)[number], object> = {
  'run.started': { ...base, type: 'run.started', config: DEFAULT_RUN_CONFIG, workers: 4 },
  'run.status': { ...base, type: 'run.status', status: 'paused' },
  'batch.assigned': {
    ...base,
    type: 'batch.assigned',
    workerId: 0,
    batchId: 0,
    scenarioStart: 0,
    scenarioCount: 500,
  },
  progress: {
    ...base,
    type: 'progress',
    scenariosDone: 10,
    scenariosTotal: 2000,
    scenariosPerSec: 41.5,
  },
  metrics: {
    ...base,
    type: 'metrics',
    tick0: 0,
    dt: 10,
    p5: series,
    p50: series,
    p95: series,
    volume: series,
    volatility: series,
    var95: series,
  },
  heartbeat: { ...base, type: 'heartbeat', workerId: 2, batchId: 2, tick: 5000, threadUtil: 0.93 },
  checkpoint: {
    ...base,
    type: 'checkpoint',
    workerId: 2,
    batchId: 2,
    tick: 5000,
    bytes: 1_048_576,
    ms: 3.2,
  },
  'worker.failed': {
    ...base,
    type: 'worker.failed',
    workerId: 2,
    batchId: 2,
    reason: 'heartbeat_timeout',
    detectedAfterMs: 6100,
    lastCheckpointTick: 5000,
    lastTick: 5730,
  },
  'failover.started': {
    ...base,
    type: 'failover.started',
    fromWorkerId: 2,
    toWorkerId: 4,
    batchId: 2,
    resumeTick: 5000,
  },
  'failover.completed': {
    ...base,
    type: 'failover.completed',
    toWorkerId: 4,
    batchId: 2,
    recoveryMs: 420,
    ticksLost: 730,
  },
  failback: { ...base, type: 'failback', workerId: 2 },
  'run.completed': { ...base, type: 'run.completed', status: 'completed', elapsedMs: 81_000 },
};

describe('contract', () => {
  it.each(FRAME_TYPES)('accepts a valid %s frame', (t) => {
    const v = ref('EngineFrame');
    expect(v(valid[t]), JSON.stringify(v.errors)).toBe(true);
  });

  it('rejects unknown frame types and bad ranges', () => {
    const v = ref('EngineFrame');
    expect(v({ ...base, type: 'nope' })).toBe(false);
    expect(v({ ...valid.heartbeat, threadUtil: 1.5 })).toBe(false);
    expect(v({ ...valid.progress, runId: 'bad id' })).toBe(false);
  });

  it('rejects out-of-range policy input', () => {
    const v = ref('CreateRunRequest');
    const bad = { name: 'x', config: { ...DEFAULT_RUN_CONFIG, agents: 10 } };
    expect(v(bad)).toBe(false);
    expect(v({ name: 'x', config: DEFAULT_RUN_CONFIG })).toBe(true);
  });

  it('DEFAULT_RUN_CONFIG matches schema defaults', () => {
    const d = schema.$defs;
    const p = d.Policy.properties;
    expect(DEFAULT_RUN_CONFIG.policy).toEqual({
      interestRatePct: p.interestRatePct.default,
      marginRequirementPct: p.marginRequirementPct.default,
      circuitBreakerPct: p.circuitBreakerPct.default,
    });
    const r = d.RunConfig.properties;
    for (const k of [
      'agents',
      'instruments',
      'ticks',
      'scenarios',
      'seed',
      'checkpointEvery',
    ] as const) {
      expect(DEFAULT_RUN_CONFIG[k]).toBe(r[k].default);
    }
  });

  it('FRAME_TYPES covers every EngineFrame variant', () => {
    expect(schema.$defs.EngineFrame.oneOf).toHaveLength(FRAME_TYPES.length);
  });
});
