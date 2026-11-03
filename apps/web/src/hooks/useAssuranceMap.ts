import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AssuranceMapFilters } from '@iams/shared';

const KEY = ['assurance-map'] as const;

export function useAssuranceMap(filters: AssuranceMapFilters = {}) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () => api.getAssuranceMap(filters),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}
