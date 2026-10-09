import { describe, expect, it } from 'vitest';
import { riskDelta } from './delta';

describe('riskDelta', () => {
  it('higher VaR is riskier even when both are negative (bull market)', () => {
    // Regression: ratio delta showed RATE10 (−1.29%) as "−86%, safer" vs BASE (−9.51%).
    const r = riskDelta(-0.0129, -0.0951, 'fraction');
    expect(r.riskier).toBe(true);
    expect(r.text).toBe('+8.22 pp');
  });
  it('lower is safer', () => {
    const r = riskDelta(0.0197, 0.0431, 'fraction');
    expect(r.safer).toBe(true);
    expect(r.text).toBe('−2.34 pp');
  });
  it('counts use absolute differences, including from zero', () => {
    expect(riskDelta(2.41, 0, 'count').text).toBe('+2.41');
    expect(riskDelta(1304, 9, 'count').text).toBe('+1,295');
  });
  it('treats tiny differences as no change', () => {
    const r = riskDelta(0.04310001, 0.0431, 'fraction');
    expect(r.text).toBe('0');
    expect(r.safer || r.riskier).toBe(false);
  });
});
