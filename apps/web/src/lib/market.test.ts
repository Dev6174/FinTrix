import { describe, expect, it } from 'vitest';
import nifty2007 from '../data/market/nifty-2007.json';
import spx2007 from '../data/market/spx-2007.json';
import spx2024 from '../data/market/spx-2024.json';
import { marketStats, percentileRank, rebased, type MarketFile } from './market';

const stats = (m: unknown) => marketStats(m as MarketFile);

describe('market snapshot matches known history', () => {
  it('S&P 500 2007–09: Oct-2007 peak, Mar-2009 trough, ~57% drawdown', () => {
    const s = stats(spx2007);
    expect(s.peakDate).toBe('2007-10-09'); // record close 1565.15
    expect(s.troughDate).toBe('2009-03-09'); // close 676.53
    expect(s.maxDrawdown).toBeGreaterThan(0.56);
    expect(s.maxDrawdown).toBeLessThan(0.58);
    expect(s.worstDayDate).toBe('2008-10-15'); // −9.0%
    expect(s.volAnnual).toBeGreaterThan(0.25); // crisis-level volatility
  });

  it('S&P 500 2024–25 is calmer and rising', () => {
    const s = stats(spx2024);
    expect(s.totalReturn).toBeGreaterThan(0.2);
    expect(s.volAnnual).toBeLessThan(stats(spx2007).volAnnual);
  });

  it('NIFTY 2007–09 drawdown exceeds 55%', () => {
    expect(stats(nifty2007).maxDrawdown).toBeGreaterThan(0.55);
  });
});

describe('helpers', () => {
  it('rebases to 100', () => expect(rebased(spx2007 as MarketFile)[0]).toBe(100));
  it('percentileRank', () => {
    expect(percentileRank([1, 2, 3, 4], 3)).toBe(0.5);
    expect(percentileRank([], 1)).toBeNaN();
  });
  it('rejects too-short data', () => {
    expect(() => marketStats({ ...(spx2007 as MarketFile), rows: [] })).toThrow(/at least 2/);
  });
});
