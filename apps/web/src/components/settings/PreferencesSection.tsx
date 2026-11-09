import type { ChangeEvent } from 'react';
import type { DateFormat, UserPreferences } from '@iams/shared';
import { useToast } from '@/context/ToastContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { DATE_FORMATS, TABLE_PAGE_SIZES } from '@/lib/preferences';

export function PreferencesSection() {
  const { preferences, savePreferences } = useUserPreferences();
  const { toast } = useToast();

  function updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    savePreferences({ ...preferences, [key]: value });
    toast('Preferences saved', 'success');
  }

  return (
    <section className="card space-y-5 p-6">
      <header>
        <h2 className="text-lg font-semibold text-neutral-900">Preferences</h2>
        <p className="mt-1 text-sm text-neutral-500">Choose how dates and tables are displayed.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dateFormat" className="label">Date format</label>
          <select
            id="dateFormat"
            name="dateFormat"
            className="input"
            value={preferences.dateFormat}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => updatePreference('dateFormat', event.target.value as DateFormat)}
          >
            {DATE_FORMATS.map((format) => (
              <option key={format.value} value={format.value}>{format.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tablePageSize" className="label">Default table page size</label>
          <select
            id="tablePageSize"
            name="tablePageSize"
            className="input"
            value={preferences.tablePageSize}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => updatePreference('tablePageSize', Number(event.target.value))}
          >
            {TABLE_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size} rows</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}