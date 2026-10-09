/**
 * In-browser SYNTHETIC market model, used until the C++ engine is wired in (step 4).
 * shortcut: agents are aggregated by type (fundamentalist / chartist / noise), not simulated one by one;
 * the C++ engine replaces this with per-agent order books. Same inputs and outputs as the contract.
 */
import type { Policy, RiskSummary } from '@fintrix/contract';

export interface SimInput {
  policy: Policy;
  agents: number;
  ticks: number;
  scenarios: number;
  seed: number;
  /** Ticks aggregated into one OHLC bar. */
  barTicks: number;
  /** Real-market calibration. Absent = synthetic minute-tick market. */
  regime?: Regime;
}

/** Fitted by calibrate() so the Baseline policy reproduces a real period's trend and volatility. */
export interface Regime {
  /** 252 for daily ticks, 252*390 for minute ticks. */
  ticksPerYear: number;
  /** Annual log drift of the fundamental at the baseline rate. */
  driftAnnual: number;
  /** Multiplier on all noise. */
  noiseScale: number;
}

export interface ScenarioRow {
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

export interface SimEvent {
  tick: number;
  kind: 'circuit_breaker' | 'resume' | 'default';
  detail: string;
}

export interface SimOutput {
  /** Scenario 0 rendered as candles. Parallel arrays, one entry per bar. */
  bars: {
    open: Float32Array;
    high: Float32Array;
    low: Float32Array;
    close: Float32Array;
    volume: Float32Array;
    halted: Uint8Array;
  };
  /** Close-price percentiles across all scenarios, per bar. */
  band: { p5: Float32Array; p50: Float32Array; p95: Float32Array };
  rows: ScenarioRow[];
  events: SimEvent[];
  summary: RiskSummary;
  elapsedMs: number;
}

const P0 = 100;
const MINUTES_PER_DAY = 390;
const TICKS_PER_YEAR = 252 * MINUTES_PER_DAY; // synthetic default: one tick = one trading minute
const HALT_TICKS = 30; // ~Level-1 pause; capped at the end of the session
const BASELINE_RATE = 4.5;
const BANKS = 20;

/** mulberry32: tiny, fast, deterministic. One stream per scenario so results never depend on scheduling. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const scenarioSeed = (seed: number, i: number) => (seed + Math.imul(i, 0x9e3779b9)) >>> 0;

/** Linear-interpolated percentile of an ascending-sorted array, q in [0,1]. */
export function percentile(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length;
  if (!n) return NaN;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.min(n - 1, lo + 1);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

export function simulate(input: SimInput, onProgress?: (done: number) => void): SimOutput {
  const t0 = performance.now();
  const { policy, agents, ticks, scenarios, seed, barTicks } = input;
  const nBars = Math.ceil(ticks / barTicks);
  const margin = policy.marginRequirementPct / 100;
  const leverage = Math.min(1 / margin, 10);
  const cb = policy.circuitBreakerPct / 100;

  // Policy → behaviour. Higher rates slow fundamental growth; lower margin lets chartists lever up momentum.
  const tpy = input.regime?.ticksPerYear ?? TICKS_PER_YEAR;
  const ticksPerDay = Math.max(1, Math.round(tpy / 252));
  const noiseScale = input.regime?.noiseScale ?? 1;
  const baseDrift = input.regime?.driftAnnual ?? 0.07 - 0.9 * (BASELINE_RATE / 100);
  const drift = (baseDrift - 0.9 * ((policy.interestRatePct - BASELINE_RATE) / 100)) / tpy;
  // Daily ticks: value traders close the gap in ~20 days; minute ticks: ~500 minutes.
  const kFund = ticksPerDay === 1 ? 0.05 : 0.002;
  const fundSigma = 0.0004 * noiseScale;
  const kChart = 0.09 * leverage; // near 1 at 10x leverage → momentum feedback almost self-sustaining
  // More agents → idiosyncratic noise averages out (≈ 1/√N), floor keeps markets alive.
  const noiseSigma = 0.0009 * noiseScale * Math.max(0.35, Math.sqrt(100_000 / agents));

  const closes = new Float32Array(scenarios * nBars);
  const bars = {
    open: new Float32Array(nBars),
    high: new Float32Array(nBars),
    low: new Float32Array(nBars),
    close: new Float32Array(nBars),
    volume: new Float32Array(nBars),
    halted: new Uint8Array(nBars),
  };
  const rows: ScenarioRow[] = [];
  const events: SimEvent[] = [];

  for (let s = 0; s < scenarios; s++) {
    if (onProgress && s % 25 === 0) onProgress(s);
    const sSeed = scenarioSeed(seed, s);
    const r = rng(sSeed);
    const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    const record = s === 0;

    let logP = Math.log(P0);
    let logF = logP;
    let momentum = 0;
    let ref = P0; // circuit-breaker reference: the session open, like real market-wide breakers
    let traded = 0;
    let halt = 0;
    let peak = P0;
    let maxDD = 0;
    let cbCount = 0;
    let volume = 0;
    let sumR = 0;
    let sumR2 = 0;
    let bar = -1;

    for (let t = 0; t < ticks; t++) {
      const b = Math.floor(t / barTicks);
      let p = Math.exp(logP);
      if (b !== bar) {
        bar = b;
        if (record) {
          bars.open[b] = bars.high[b] = bars.low[b] = p;
          bars.volume[b] = 0;
        }
      }
      if (t % ticksPerDay === 0 && halt === 0) ref = p; // new session
      logF += drift + fundSigma * gauss();

      if (halt > 0) {
        halt--;
        if (record) {
          bars.halted[b] = 1;
          if (halt === 0)
            events.push({ tick: t, kind: 'resume', detail: `Trading resumed at ${p.toFixed(2)}` });
        }
      } else {
        const demand = kFund * (logF - logP) + kChart * momentum + noiseSigma * gauss();
        let ret = demand;
        const limit = Math.log(1 + Math.sign(Math.exp(logP + ret) / ref - 1) * cb) + Math.log(ref);
        const breached = Math.abs(Math.exp(logP + ret) / ref - 1) > cb;
        if (breached) ret = limit - logP; // trading stops at the limit price
        logP += ret;
        traded++;
        momentum = 0.94 * momentum + 0.06 * ret;
        const v = Math.abs(demand) * agents;
        volume += v;
        sumR += ret;
        sumR2 += ret * ret;
        p = Math.exp(logP);
        if (record) bars.volume[b]! += v;

        if (breached) {
          cbCount++;
          // Halt for a pause, never past the end of the session (daily ticks: the rest of the day).
          halt = Math.min(HALT_TICKS, ticksPerDay - 1 - (t % ticksPerDay));
          momentum = 0; // halt breaks the feedback loop: the whole point of a breaker
          if (record) {
            bars.halted[b] = 1;
            events.push({
              tick: t,
              kind: 'circuit_breaker',
              detail: `Hit ${p > ref ? '+' : '−'}${(cb * 100).toFixed(1)}% limit from ${ref.toFixed(2)}; ${halt ? `halted ${halt} ticks` : 'halted for the rest of the session'}`,
            });
          }
          ref = p;
        }
      }

      if (p > peak) peak = p;
      maxDD = Math.max(maxDD, 1 - p / peak);
      if (record) {
        if (p > bars.high[b]!) bars.high[b] = p;
        if (p < bars.low[b]!) bars.low[b] = p;
        bars.close[b] = p;
      }
      if ((t + 1) % barTicks === 0 || t === ticks - 1) closes[s * nBars + b] = p;
    }

    const finalPrice = Math.exp(logP);
    const ret = finalPrice / P0 - 1;
    // Banks hold the market levered up to the margin limit; capital buffer = margin.
    const bankLoss = -ret * Math.min(leverage, 5) * 0.2;
    const defaults = cascade(bankLoss, margin, r, record ? events : null, ticks);
    const n = Math.max(1, traded);
    const variance = Math.max(0, sumR2 / n - (sumR / n) ** 2);

    rows.push({
      scenario: s,
      seed: sSeed,
      loss: bankLoss,
      finalPrice,
      volatility: Math.sqrt(variance * tpy),
      volume,
      maxDrawdown: maxDD,
      circuitBreakerTriggers: cbCount,
      defaults,
    });
  }

  // Per-bar percentile band across scenarios.
  const band = {
    p5: new Float32Array(nBars),
    p50: new Float32Array(nBars),
    p95: new Float32Array(nBars),
  };
  const col = new Float64Array(scenarios);
  for (let b = 0; b < nBars; b++) {
    for (let s = 0; s < scenarios; s++) col[s] = closes[s * nBars + b]!;
    col.sort();
    band.p5[b] = percentile(col, 0.05);
    band.p50[b] = percentile(col, 0.5);
    band.p95[b] = percentile(col, 0.95);
  }

  return { bars, band, rows, events, summary: summarize(rows), elapsedMs: performance.now() - t0 };
}

/** Each bank gets the shock ± idiosyncratic noise; a default spills 30% of its buffer onto the others. */
function cascade(
  shock: number,
  buffer: number,
  r: () => number,
  events: SimEvent[] | null,
  tick: number,
): number {
  const loss = Array.from({ length: BANKS }, () => shock * (0.6 + 0.8 * r()));
  const dead = new Uint8Array(BANKS);
  let defaults = 0;
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < BANKS; i++) {
      if (dead[i] || loss[i]! <= buffer) continue;
      dead[i] = 1;
      defaults++;
      changed = true;
      events?.push({
        tick,
        kind: 'default',
        detail: `Bank ${i + 1} defaulted (loss ${(loss[i]! * 100).toFixed(1)}% > buffer ${(buffer * 100).toFixed(0)}%)`,
      });
      for (let j = 0; j < BANKS; j++) if (!dead[j]) loss[j]! += (0.3 * buffer) / (BANKS - 1);
    }
  }
  return defaults;
}

export function summarize(rows: readonly ScenarioRow[]): RiskSummary {
  const losses = Float64Array.from(rows, (r) => r.loss).sort();
  const tail = (q: number) => {
    const v = percentile(losses, q);
    let sum = 0;
    let n = 0;
    for (const l of losses) {
      if (l < v) continue;
      sum += l;
      n++;
    }
    return { v, es: n ? sum / n : v };
  };
  const t95 = tail(0.95);
  const t99 = tail(0.99);
  const mean = (f: (r: ScenarioRow) => number) =>
    rows.reduce((s, r) => s + f(r), 0) / Math.max(1, rows.length);
  return {
    var95: t95.v,
    var99: t99.v,
    es95: t95.es,
    es99: t99.es,
    volatility: mean((r) => r.volatility),
    maxDrawdown: mean((r) => r.maxDrawdown),
    circuitBreakerTriggers: rows.reduce((s, r) => s + r.circuitBreakerTriggers, 0),
    cascadingDefaults: mean((r) => r.defaults),
  };
}

export interface CalibrationTarget {
  volAnnual: number;
  driftAnnual: number;
  ticksPerYear: number;
}

/**
 * Fit noise and drift so the BASELINE policy reproduces a real period's annualised volatility and drift.
 * Other policies then run on the same fitted market, so their differences come from the policy alone.
 * Vol is ~linear in noise and realised drift ~linear in fundamental drift, so 4 fixed-point steps converge.
 */
export function calibrate(
  base: Omit<SimInput, 'policy' | 'regime'>,
  target: CalibrationTarget,
  baseline: Policy,
): Regime {
  let regime: Regime = {
    ticksPerYear: target.ticksPerYear,
    driftAnnual: target.driftAnnual,
    noiseScale: 1,
  };
  const pilot = { ...base, policy: baseline, scenarios: 80, seed: (base.seed ^ 0x5eed) >>> 0 };
  for (let i = 0; i < 4; i++) {
    const out = simulate({ ...pilot, regime });
    const vol = out.rows.reduce((s, r) => s + r.volatility, 0) / out.rows.length;
    const drift =
      (out.rows.reduce((s, r) => s + Math.log(r.finalPrice / P0), 0) / out.rows.length) *
      (target.ticksPerYear / base.ticks);
    regime = {
      ...regime,
      noiseScale: regime.noiseScale * (vol > 0 ? target.volAnnual / vol : 1),
      driftAnnual: regime.driftAnnual + (target.driftAnnual - drift),
    };
  }
  return regime;
}
