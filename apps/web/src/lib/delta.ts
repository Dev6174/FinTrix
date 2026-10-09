/**
 * Difference vs baseline for risk metrics, where lower = safer.
 * Always a plain difference (never a ratio): ratios flip sign or explode when the baseline is
 * negative (VaR in a bull market) or near zero (defaults), and then show "safer" for riskier.
 */
export function riskDelta(v: number, base: number, kind: 'fraction' | 'count') {
  const d = v - base;
  const eps = kind === 'fraction' ? 0.00005 : 0.005;
  const text =
    Math.abs(d) < eps
      ? '0'
      : kind === 'fraction'
        ? `${d > 0 ? '+' : '−'}${Math.abs(d * 100).toFixed(2)} pp`
        : `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return { d, text, safer: d < -eps, riskier: d > eps };
}
