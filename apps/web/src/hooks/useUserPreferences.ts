import { useCallback, useMemo, useState } from 'react';
import type { UserPreferences } from '@iams/shared';
import { useAuth } from '@/context/AuthContext';
import { loadPreferences, savePreferences } from '@/lib/preferences';

export function useUserPreferences() {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';
  const [version, setVersion] = useState(0);

  const preferences = useMemo(() => loadPreferences(userId), [userId, version]);

  const save = useCallback(
    (next: UserPreferences) => {
      savePreferences(userId, next);
      setVersion((v) => v + 1);
    },
    [userId],
  );

  return { preferences, savePreferences: save };
}
