import { DEFAULT_RUN_CONFIG } from '@fintrix/contract';
import { describe, expect, it } from 'vitest';
import { percentile, simulate, type SimInput } from './sim';

const base: SimInput = {
  policy: DEFAULT_RUN_CONFIG.policy,
  agents: 100_000,
  ticks: 2_000,
  scenarios: 300,
  seed: 42,
  barTicks: 10,
};
const run = (p: Partial<SimInput['policy']> = {}, o: Partial<SimInput> = {}) =>
  simulate({ ...base, ...o, policy: { ...base.policy, ...p } });

describe('percentile', () => {
  it('interpolates', () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([0, 10], 0.95)).toBeCloseTo(9.5);
    expect(percentile([], 0.5)).toBeNaN();
  });
});

describe('simulate', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = run();
    const b = run();
    expect(a.summary).toEqual(b.summary);
    expect([...a.bars.close]).toEqual([...b.bars.close]);
    expect(run({}, { seed: 7 }).summary.var95).not.toBe(a.summary.var95);
  });

  it('produces well-formed bars and band', () => {
    const { bars, band } = run();
    expect(bars.close.length).toBe(200);
    for (let i = 0; i < bars.close.length; i++) {
      expect(bars.high[i]).toBeGreaterThanOrEqual(Math.max(bars.open[i]!, bars.close[i]!) - 1e-4);
      expect(bars.low[i]).toBeLessThanOrEqual(Math.min(bars.open[i]!, bars.close[i]!) + 1e-4);
      expect(band.p5[i]).toBeLessThanOrEqual(band.p50[i]!);
      expect(band.p50[i]).toBeLessThanOrEqual(band.p95[i]!);
    }
  });

  it('tighter circuit breaker triggers more halts', () => {
    expect(run({ circuitBreakerPct: 2 }).summary.circuitBreakerTriggers).toBeGreaterThan(
      run({ circuitBreakerPct: 20 }).summary.circuitBreakerTriggers,
    );
  });

  it('higher margin requirement lowers tail risk and defaults', () => {
    const loose = run({ marginRequirementPct: 5 }).summary;
    const tight = run({ marginRequirementPct: 50 }).summary;
    console.log({ loose, tight, base: run().summary, ms: run().elapsedMs });
    expect(tight.var99).toBeLessThan(loose.var99);
    expect(tight.cascadingDefaults).toBeLessThanOrEqual(loose.cascadingDefaults);
    expect(tight.volatility).toBeLessThan(loose.volatility);
  });

  it('ES ≥ VaR', () => {
    const s = run().summary;
    expect(s.es95).toBeGreaterThanOrEqual(s.var95);
    expect(s.es99).toBeGreaterThanOrEqual(s.var99);
  });
});
