import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import type {
  ActionPlanFilters,
  ActionPlanDetailDto,
  ActionPlanDashboardDto,
  CreateActionPlanRequest,
  UpdateActionPlanRequest,
  AddProgressUpdateRequest,
  VerifyActionPlanRequest,
  ActionPlanStatus,
} from '@iams/shared';

const LIST_KEY = ['action-plans', 'list'] as const;
const DASH_KEY = ['action-plans', 'dashboard'] as const;

export function useActionPlanList(filters: ActionPlanFilters) {
  return useQuery({
    queryKey: [...LIST_KEY, filters],
    queryFn: () => api.listActionPlans(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useActionPlanDetail(id: string | null) {
  return useQuery({
    queryKey: ['action-plans', 'detail', id],
    queryFn: () => api.getActionPlan(id!),
    enabled: Boolean(id),
  });
}

export function useActionPlanDashboard() {
  return useQuery({
    queryKey: DASH_KEY,
    queryFn: () => api.getActionPlanDashboard(),
    staleTime: 60_000,
  });
}

function useInvalidateActionPlans() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    queryClient.invalidateQueries({ queryKey: DASH_KEY });
    queryClient.invalidateQueries({ queryKey: ['action-plans', 'detail'] });
  };
}

export function useCreateActionPlan() {
  const invalidate = useInvalidateActionPlans();
  return useMutation<ActionPlanDetailDto, ApiError, CreateActionPlanRequest>({
    mutationFn: (data) => api.createActionPlan(data),
    onSuccess: invalidate,
  });
}

export function useUpdateActionPlan(id: string) {
  const invalidate = useInvalidateActionPlans();
  return useMutation<ActionPlanDetailDto, ApiError, UpdateActionPlanRequest>({
    mutationFn: (data) => api.updateActionPlan(id, data),
    onSuccess: invalidate,
  });
}

export function useAddActionPlanProgressUpdate() {
  const invalidate = useInvalidateActionPlans();
  return useMutation<ActionPlanDetailDto, ApiError, { id: string; data: AddProgressUpdateRequest }>({
    mutationFn: ({ id, data }) => api.addActionPlanProgressUpdate(id, data),
    onSuccess: invalidate,
  });
}

export function useVerifyActionPlan() {
  const invalidate = useInvalidateActionPlans();
  return useMutation<ActionPlanDetailDto, ApiError, { id: string; data: VerifyActionPlanRequest }>({
    mutationFn: ({ id, data }) => api.verifyActionPlan(id, data),
    onSuccess: invalidate,
  });
}

export function useTransitionActionPlan() {
  const invalidate = useInvalidateActionPlans();
  return useMutation<ActionPlanDetailDto, ApiError, { id: string; status: ActionPlanStatus }>({
    mutationFn: ({ id, status }) => api.transitionActionPlan(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteActionPlan() {
  const invalidate = useInvalidateActionPlans();
  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: (id) => api.deleteActionPlan(id),
    onSuccess: invalidate,
  });
}
