import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_PREFERENCES, formatDate, loadPreferences, savePreferences } from '../src/lib/preferences';

const USER_ID = 'user-1';

describe('preferences storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadPreferences(USER_ID)).toEqual(DEFAULT_PREFERENCES);
  });

  it('round-trips saved preferences for the same user', () => {
    savePreferences(USER_ID, { dateFormat: 'european', tablePageSize: 50 });
    expect(loadPreferences(USER_ID)).toEqual({ dateFormat: 'european', tablePageSize: 50 });
  });

  it('keeps preferences separate per user', () => {
    savePreferences(USER_ID, { dateFormat: 'iso', tablePageSize: 100 });
    expect(loadPreferences('user-2')).toEqual(DEFAULT_PREFERENCES);
  });

  it('falls back to defaults for invalid stored values', () => {
    window.localStorage.setItem(
      `iams.preferences.${USER_ID}`,
      JSON.stringify({ dateFormat: 'martian', tablePageSize: 7 }),
    );
    expect(loadPreferences(USER_ID)).toEqual(DEFAULT_PREFERENCES);
  });

  it('falls back to defaults for corrupt stored JSON', () => {
    window.localStorage.setItem(`iams.preferences.${USER_ID}`, '{not json');
    expect(loadPreferences(USER_ID)).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('formatDate', () => {
  const date = new Date(2026, 10, 5, 14, 7);

  it('formats US dates', () => {
    expect(formatDate(date, 'us')).toBe('11/05/2026 14:07');
  });

  it('formats European dates', () => {
    expect(formatDate(date, 'european')).toBe('05/11/2026 14:07');
  });

  it('formats ISO dates', () => {
    expect(formatDate(date, 'iso')).toBe('2026-11-05 14:07');
  });
});
