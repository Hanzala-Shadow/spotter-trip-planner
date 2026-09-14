import { describe, it, expect } from 'vitest';
import { duration, exactTime, dateLabel, time, offsetLabel } from './format';
describe('driver-facing time formatting', () => {
  it('carries rounded minutes into the next hour', () => expect(duration(3599)).toBe('1h 00m'));
  it('preserves exact duty seconds', () => expect(exactTime(3661)).toBe('1:01:01'));
  it('shows a complete daily sheet', () => expect(exactTime(86400)).toBe('24:00'));
  it('retains terminal clock time rather than browser time', () =>
    expect(time('2026-09-15T06:00:00-06:00')).toBe('06:00'));
  it('does not shift the log date by viewer timezone', () =>
    expect(dateLabel('2026-09-15')).toBe('Sep 15'));
  it('formats the selected fixed offset', () => expect(offsetLabel(-360)).toBe('UTC−06:00'));
});
