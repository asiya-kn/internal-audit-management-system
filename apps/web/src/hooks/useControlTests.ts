import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import type {
  ControlTestFilters,
  ControlTestDetailDto,
  ControlTestDashboardDto,
  CreateControlTestRequest,
  UpdateControlTestRequest,
  RecordControlTestResultRequest,
  ReviewControlTestRequest,
  ControlTestStatus,
} from '@iams/shared';

const LIST_KEY = ['control-tests', 'list'] as const;
const DASH_KEY = ['control-tests', 'dashboard'] as const;

export function useControlTestList(filters: ControlTestFilters) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: () => api.listControlTests(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useControlTestDetail(id: string | null) {
  return useQuery({
    queryKey: ['control-tests', 'detail', id],
    queryFn: () => api.getControlTest(id!),
    enabled: Boolean(id),
  });
}

export function useControlTestDashboard() {
  return useQuery({
    queryKey: DASH_KEY,
    queryFn: () => api.getControlTestDashboard(),
    staleTime: 60_000,
  });
}

function useInvalidateControlTests() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    queryClient.invalidateQueries({ queryKey: DASH_KEY });
    queryClient.invalidateQueries({ queryKey: ['control-tests', 'detail'] });
  };
}

export function useCreateControlTest() {
  const invalidate = useInvalidateControlTests();
  return useMutation<ControlTestDetailDto, ApiError, CreateControlTestRequest>({
    mutationFn: (data) => api.createControlTest(data),
    onSuccess: invalidate,
  });
}

export function useUpdateControlTest(id: string) {
  const invalidate = useInvalidateControlTests();
  return useMutation<ControlTestDetailDto, ApiError, UpdateControlTestRequest>({
    mutationFn: (data) => api.updateControlTest(id, data),
    onSuccess: invalidate,
  });
}

export function useRecordControlTestResult() {
  const invalidate = useInvalidateControlTests();
  return useMutation<ControlTestDetailDto, ApiError, { id: string; data: RecordControlTestResultRequest }>({
    mutationFn: ({ id, data }) => api.recordControlTestResult(id, data),
    onSuccess: invalidate,
  });
}

export function useReviewControlTest() {
  const invalidate = useInvalidateControlTests();
  return useMutation<ControlTestDetailDto, ApiError, { id: string; data: ReviewControlTestRequest }>({
    mutationFn: ({ id, data }) => api.reviewControlTest(id, data),
    onSuccess: invalidate,
  });
}

export function useLinkControlTestFinding() {
  const invalidate = useInvalidateControlTests();
  return useMutation<ControlTestDetailDto, ApiError, { id: string; findingId: string }>({
    mutationFn: ({ id, findingId }) => api.linkControlTestFinding(id, findingId),
    onSuccess: invalidate,
  });
}

export function useUnlinkControlTestFinding() {
  const invalidate = useInvalidateControlTests();
  return useMutation<ControlTestDetailDto, ApiError, string>({
    mutationFn: (id) => api.unlinkControlTestFinding(id),
    onSuccess: invalidate,
  });
}

export function useTransitionControlTest() {
  const invalidate = useInvalidateControlTests();
  return useMutation<ControlTestDetailDto, ApiError, { id: string; status: ControlTestStatus }>({
    mutationFn: ({ id, status }) => api.transitionControlTest(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteControlTest() {
  const invalidate = useInvalidateControlTests();
  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: (id) => api.deleteControlTest(id),
    onSuccess: invalidate,
  });
}
