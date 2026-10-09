export type * from './generated/types';
import type { EngineFrame, RunConfig, RunStatus, WorkerState } from './generated/types';

export type FrameType = EngineFrame['type'];
export type FrameOf<T extends FrameType> = Extract<EngineFrame, { type: T }>;

export const FRAME_TYPES = [
  'run.started',
  'run.status',
  'batch.assigned',
  'progress',
  'metrics',
  'heartbeat',
  'checkpoint',
  'worker.failed',
  'failover.started',
  'failover.completed',
  'failback',
  'run.completed',
] as const satisfies readonly FrameType[];

export const RUN_STATUSES = [
  'queued',
  'running',
  'paused',
  'recovering',
  'completed',
  'failed',
  'cancelled',
] as const satisfies readonly RunStatus[];

export const WORKER_STATES = [
  'healthy',
  'late',
  'failed',
  'recovering',
  'idle',
] as const satisfies readonly WorkerState[];

/** Mirrors the schema defaults; contract.test.ts asserts they stay in sync. */
export const DEFAULT_RUN_CONFIG: RunConfig = {
  policy: { interestRatePct: 4.5, marginRequirementPct: 25, circuitBreakerPct: 7 },
  agents: 100_000,
  instruments: 20,
  ticks: 10_000,
  scenarios: 2_000,
  seed: 42,
  checkpointEvery: 1_000,
};

/** Compile-time exhaustiveness guard for switches over unions. */
export function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
}
