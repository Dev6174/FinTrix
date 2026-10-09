import { DEFAULT_RUN_CONFIG } from '@fintrix/contract';
import { describe, expect, it } from 'vitest';
import spx2007 from '../data/market/spx-2007.json';
import { marketStats, type MarketFile } from './market';
import { calibrate, percentile, simulate, type SimInput } from './sim';

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

describe('calibrate to real data', () => {
  it('baseline reproduces S&P 500 2007–09 volatility and drift', () => {
    const spx = spx2007 as MarketFile;
    const st = marketStats(spx);
    const sim = { agents: 100_000, ticks: st.days, scenarios: 400, seed: 42, barTicks: 5 };
    const regime = calibrate(
      sim,
      { volAnnual: st.volAnnual, driftAnnual: st.driftAnnual, ticksPerYear: 252 },
      base.policy,
    );
    const out = simulate({ ...sim, policy: base.policy, regime });
    const vol = out.rows.reduce((s, r) => s + r.volatility, 0) / out.rows.length;
    const drift =
      (out.rows.reduce((s, r) => s + Math.log(r.finalPrice / 100), 0) / out.rows.length) *
      (252 / st.days);
    console.log({
      target: { vol: st.volAnnual, drift: st.driftAnnual },
      got: { vol, drift },
      regime,
      summary: out.summary,
    });
    expect(vol).toBeGreaterThan(st.volAnnual * 0.9);
    expect(vol).toBeLessThan(st.volAnnual * 1.1);
    expect(Math.abs(drift - st.driftAnnual)).toBeLessThan(0.04);
    // Policy still matters on the calibrated market.
    const loose = simulate({
      ...sim,
      policy: { ...base.policy, marginRequirementPct: 5 },
      regime,
    }).summary;
    expect(loose.var99).toBeGreaterThan(out.summary.var99);
  });
});
