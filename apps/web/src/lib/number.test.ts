import { describe, expect, it } from 'vitest';
import { clamp, formatNumber, parseNumber, snap, validateNumber } from './number';

describe('parseNumber', () => {
  it.each([
    ['42', 42],
    [' 4.5 ', 4.5],
    ['1,000,000', 1_000_000],
    ['1_000', 1000],
    ['1e6', 1e6],
    ['.5', 0.5],
    ['-3', -3],
  ])('%s → %s', (raw, n) => expect(parseNumber(raw)).toBe(n));

  it.each(['', 'abc', '1.2.3', '--1', 'Infinity', 'NaN', '1e999'])('rejects %s', (raw) =>
    expect(parseNumber(raw)).toBeNull(),
  );
});

describe('snap / clamp', () => {
  it('snaps without float noise', () => {
    expect(snap(0.1 + 0.2, 0.1)).toBe(0.3);
    expect(snap(4.56, 0.25)).toBe(4.5);
    expect(snap(1234, 1000)).toBe(1000);
  });
  it('clamps', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('validateNumber', () => {
  const rule = { min: 1000, max: 1_000_000, integer: true };
  it('accepts in range', () => expect(validateNumber('100,000', rule)).toBeNull());
  it('explains range', () =>
    expect(validateNumber('10', rule)).toBe('Must be between 1,000 and 1,000,000'));
  it('explains integer', () =>
    expect(validateNumber('1500.5', rule)).toBe('Must be a whole number'));
  it('explains non-number', () => expect(validateNumber('x', rule)).toBe('Enter a number'));
  it('formats', () => expect(formatNumber(1234567.891)).toBe('1,234,567.891'));
});
