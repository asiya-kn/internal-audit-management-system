import type { DateFormat, UserPreferences } from '@iams/shared';

export const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'us', label: 'US (MM/DD/YYYY)' },
  { value: 'european', label: 'European (DD/MM/YYYY)' },
  { value: 'iso', label: 'ISO (YYYY-MM-DD)' },
];

export const TABLE_PAGE_SIZES = [10, 20, 50, 100] as const;

export const DEFAULT_PREFERENCES: UserPreferences = {
  dateFormat: 'us',
  tablePageSize: 20,
};

const storageKey = (userId: string) => `iams.preferences.${userId}`;

export function loadPreferences(userId: string): UserPreferences {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    const dateFormat = DATE_FORMATS.some((f) => f.value === parsed.dateFormat)
      ? (parsed.dateFormat as DateFormat)
      : DEFAULT_PREFERENCES.dateFormat;
    const tablePageSize = (TABLE_PAGE_SIZES as readonly number[]).includes(parsed.tablePageSize as number)
      ? (parsed.tablePageSize as number)
      : DEFAULT_PREFERENCES.tablePageSize;
    return { dateFormat, tablePageSize };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(userId: string, preferences: UserPreferences): void {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(preferences));
}

export function formatDate(value: string | Date, format: DateFormat): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  switch (format) {
    case 'iso':
      return `${year}-${month}-${day} ${time}`;
    case 'us':
      return `${month}/${day}/${year} ${time}`;
    case 'european':
      return `${day}/${month}/${year} ${time}`;
  }
}
