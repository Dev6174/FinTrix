/* Generated from schema/fintrix.schema.json by scripts/generate.mjs. Do not edit. */

/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "RunId".
 */
export type RunId = string;
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "RunStatus".
 */
export type RunStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'recovering'
  | 'completed'
  | 'failed'
  | 'cancelled';
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "EpochMs".
 */
export type EpochMs = number;
/**
 * Monotonic per run; used to resume a stream.
 *
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "Seq".
 */
export type Seq = number;
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "WorkerId".
 */
export type WorkerId = number;
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "EngineFrame".
 */
export type EngineFrame =
  | RunStartedFrame
  | RunStatusFrame
  | BatchAssignedFrame
  | ProgressFrame
  | MetricsFrame
  | HeartbeatFrame
  | CheckpointFrame
  | WorkerFailedFrame
  | FailoverStartedFrame
  | FailoverCompletedFrame
  | FailbackFrame
  | RunCompletedFrame;
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "BatchId".
 */
export type BatchId = number;
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "ClientMessage".
 */
export type ClientMessage = SubscribeMessage | UnsubscribeMessage;
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "WorkerState".
 */
export type WorkerState = 'healthy' | 'late' | 'failed' | 'recovering' | 'idle';

/**
 * Single source of truth for every message between engine, supervisor, gateway and browser. Wire encoding is MessagePack; fields typed Float32Array travel as msgpack bin (little-endian float32).
 */
export interface FintrixContract {
  policy?: Policy;
  runConfig?: RunConfig;
  run?: Run;
  runPage?: RunPage;
  scenarioPage?: ScenarioPage;
  createRunRequest?: CreateRunRequest;
  runControlRequest?: RunControlRequest;
  killWorkerRequest?: KillWorkerRequest;
  benchmarkReport?: BenchmarkReport;
  systemInfo?: SystemInfo;
  apiError?: ApiError;
  engineFrame?: EngineFrame;
  clientMessage?: ClientMessage;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "Policy".
 */
export interface Policy {
  /**
   * Policy rate, % per year.
   */
  interestRatePct: number;
  /**
   * Initial margin as % of position value.
   */
  marginRequirementPct: number;
  /**
   * Halt trading when price moves this % from session open.
   */
  circuitBreakerPct: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "RunConfig".
 */
export interface RunConfig {
  policy: Policy;
  agents: number;
  instruments: number;
  ticks: number;
  scenarios: number;
  seed: number;
  /**
   * Ticks between checkpoints.
   */
  checkpointEvery?: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "Run".
 */
export interface Run {
  id: RunId;
  name: string;
  config: RunConfig;
  status: RunStatus;
  createdAt: EpochMs;
  startedAt?: EpochMs;
  finishedAt?: EpochMs;
  lastSeq: Seq;
  summary?: RiskSummary;
  error?: ApiError;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "RiskSummary".
 */
export interface RiskSummary {
  /**
   * 95% VaR of portfolio loss, fraction of notional.
   */
  var95: number;
  var99: number;
  /**
   * Expected shortfall beyond VaR95.
   */
  es95: number;
  es99: number;
  /**
   * Annualised volatility of mean price path.
   */
  volatility: number;
  maxDrawdown: number;
  circuitBreakerTriggers: number;
  /**
   * Mean defaults per scenario.
   */
  cascadingDefaults: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "ApiError".
 */
export interface ApiError {
  /**
   * Stable machine code, e.g. ENGINE_OOM.
   */
  code: string;
  /**
   * Specific and actionable.
   */
  message: string;
  details?: {
    [k: string]: (string | number | boolean) | undefined;
  };
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "RunPage".
 */
export interface RunPage {
  items: Run[];
  nextCursor: string | null;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "ScenarioPage".
 */
export interface ScenarioPage {
  items: ScenarioResult[];
  nextCursor: string | null;
  total: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "ScenarioResult".
 */
export interface ScenarioResult {
  scenario: number;
  seed: number;
  loss: number;
  finalPrice: number;
  volatility: number;
  volume: number;
  maxDrawdown: number;
  circuitBreakerTriggers: number;
  defaults: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "CreateRunRequest".
 */
export interface CreateRunRequest {
  name: string;
  config: RunConfig;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "RunControlRequest".
 */
export interface RunControlRequest {
  action: 'pause' | 'resume' | 'cancel';
}
/**
 * Demo-only fault injection.
 *
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "KillWorkerRequest".
 */
export interface KillWorkerRequest {
  workerId: WorkerId;
  atTick: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "BenchmarkReport".
 */
export interface BenchmarkReport {
  id: string;
  measuredAt: EpochMs;
  points: BenchmarkPoint[];
  /**
   * Fitted Amdahl serial fraction.
   */
  serialFraction: number;
  system: SystemInfo;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "BenchmarkPoint".
 */
export interface BenchmarkPoint {
  kind: 'threads' | 'ranks' | 'gustafson' | 'checkpoint';
  /**
   * Threads or ranks; checkpoint interval for kind=checkpoint.
   */
  p: number;
  seconds: number;
  speedup: number;
  efficiency: number;
  scenariosPerSec: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "SystemInfo".
 */
export interface SystemInfo {
  cores: number;
  ramBytes: number;
  compiler: string;
  flags: string;
  commit: string;
  mpiAvailable: boolean;
  /**
   * mock = clearly labelled synthetic generator.
   */
  engine: 'native' | 'mock';
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "RunStartedFrame".
 */
export interface RunStartedFrame {
  type: 'run.started';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  config: RunConfig;
  workers: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "RunStatusFrame".
 */
export interface RunStatusFrame {
  type: 'run.status';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  status: RunStatus;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "BatchAssignedFrame".
 */
export interface BatchAssignedFrame {
  type: 'batch.assigned';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  workerId: WorkerId;
  batchId: BatchId;
  scenarioStart: number;
  scenarioCount: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "ProgressFrame".
 */
export interface ProgressFrame {
  type: 'progress';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  scenariosDone: number;
  scenariosTotal: number;
  scenariosPerSec: number;
}
/**
 * Batched series. All arrays share length n; sample i is at tick tick0 + i*dt.
 *
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "MetricsFrame".
 */
export interface MetricsFrame {
  type: 'metrics';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  tick0: number;
  dt: number;
  /**
   * 5th percentile of price across completed scenarios.
   */
  p5: Float32Array;
  p50: Float32Array;
  p95: Float32Array;
  volume: Float32Array;
  volatility: Float32Array;
  /**
   * Running VaR95 estimate (convergence curve).
   */
  var95: Float32Array;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "HeartbeatFrame".
 */
export interface HeartbeatFrame {
  type: 'heartbeat';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  workerId: WorkerId;
  batchId: BatchId;
  tick: number;
  threadUtil: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "CheckpointFrame".
 */
export interface CheckpointFrame {
  type: 'checkpoint';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  workerId: WorkerId;
  batchId: BatchId;
  tick: number;
  bytes: number;
  ms: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "WorkerFailedFrame".
 */
export interface WorkerFailedFrame {
  type: 'worker.failed';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  workerId: WorkerId;
  batchId: BatchId;
  reason: 'heartbeat_timeout' | 'watchdog' | 'exit';
  exitCode?: number;
  /**
   * Time from last heartbeat to detection.
   */
  detectedAfterMs: number;
  lastCheckpointTick: number;
  lastTick: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "FailoverStartedFrame".
 */
export interface FailoverStartedFrame {
  type: 'failover.started';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  fromWorkerId: WorkerId;
  toWorkerId: WorkerId;
  batchId: BatchId;
  resumeTick: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "FailoverCompletedFrame".
 */
export interface FailoverCompletedFrame {
  type: 'failover.completed';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  toWorkerId: WorkerId;
  batchId: BatchId;
  /**
   * Detection to resumed progress.
   */
  recoveryMs: number;
  /**
   * lastTick - lastCheckpointTick, i.e. recomputed work.
   */
  ticksLost: number;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "FailbackFrame".
 */
export interface FailbackFrame {
  type: 'failback';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  workerId: WorkerId;
}
/**
 * This interface was referenced by `FintrixContract`'s JSON-Schema
 * via the `definition` "RunCompletedFrame".
 */
export interface RunCompletedFrame {
  type: 'run.completed';
  runId: RunId;
  seq: Seq;
  ts: EpochMs;
  status: 'completed' | 'failed' | 'cancelled';
  elapsedMs: number;
  summary?: RiskSummary;
  error?: ApiError;
}
export interface SubscribeMessage {
  type: 'subscribe';
  runId: RunId;
  fromSeq: Seq;
}
export interface UnsubscribeMessage {
  type: 'unsubscribe';
  runId: RunId;
}
