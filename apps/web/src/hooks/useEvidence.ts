import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import type {
  EvidenceFilters,
  EvidenceDetailDto,
  EvidenceDashboardDto,
  CreateEvidenceRequest,
  UpdateEvidenceRequest,
  ReviewEvidenceRequest,
} from '@iams/shared';

const LIST_KEY = ['evidence', 'list'] as const;
const DASH_KEY = ['evidence', 'dashboard'] as const;

export function useEvidenceList(filters: EvidenceFilters) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: () => api.listEvidence(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useEvidenceDetail(id: string | null) {
  return useQuery({
    queryKey: ['evidence', 'detail', id],
    queryFn: () => api.getEvidence(id!),
    enabled: Boolean(id),
  });
}

export function useEvidenceDashboard() {
  return useQuery({
    queryKey: DASH_KEY,
    queryFn: () => api.getEvidenceDashboard(),
    staleTime: 60_000,
  });
}

function useInvalidateEvidence() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    queryClient.invalidateQueries({ queryKey: DASH_KEY });
    queryClient.invalidateQueries({ queryKey: ['evidence', 'detail'] });
  };
}

export function useCreateEvidence() {
  const invalidate = useInvalidateEvidence();
  return useMutation<EvidenceDetailDto, ApiError, CreateEvidenceRequest>({
    mutationFn: (data) => api.createEvidence(data),
    onSuccess: invalidate,
  });
}

export function useUpdateEvidence(id: string) {
  const invalidate = useInvalidateEvidence();
  return useMutation<EvidenceDetailDto, ApiError, UpdateEvidenceRequest>({
    mutationFn: (data) => api.updateEvidence(id, data),
    onSuccess: invalidate,
  });
}

export function useReviewEvidence() {
  const invalidate = useInvalidateEvidence();
  return useMutation<EvidenceDetailDto, ApiError, { id: string; data: ReviewEvidenceRequest }>({
    mutationFn: ({ id, data }) => api.reviewEvidence(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteEvidence() {
  const invalidate = useInvalidateEvidence();
  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: (id) => api.deleteEvidence(id),
    onSuccess: invalidate,
  });
}
