/** Parse user-typed numbers: allows "1,000,000", "1_000", " 4.5 ", "1e6". Returns null if not a finite number. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/[,_\s]/g, '');
  if (s === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Round to the nearest multiple of step, avoiding float noise (0.1 + 0.2). */
export function snap(n: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number((Math.round(n / step) * step).toFixed(decimals));
}

export interface RangeRule {
  min: number;
  max: number;
  integer?: boolean;
}

/** Specific, actionable validation message, or null when valid. */
export function validateNumber(raw: string, rule: RangeRule): string | null {
  const n = parseNumber(raw);
  if (n === null) return 'Enter a number';
  if (rule.integer && !Number.isInteger(n)) return 'Must be a whole number';
  if (n < rule.min || n > rule.max)
    return `Must be between ${formatNumber(rule.min)} and ${formatNumber(rule.max)}`;
  return null;
}

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
export const formatNumber = (n: number) => fmt.format(n);
