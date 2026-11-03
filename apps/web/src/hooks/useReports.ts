import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ReportFilters } from '@iams/shared';

const KEY = ['reports', 'generate'] as const;

export function useGenerateReport(filters: ReportFilters | null) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () => api.generateReport(filters!),
    enabled: Boolean(filters && filters.reportType),
    staleTime: 30_000,
  });
}
