import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import type {
  AdminUserFilters,
  AdminUserDetailDto,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  RoleDetailDto,
  UpdateRolePermissionsRequest,
  AuditLogFilters,
} from '@iams/shared';

const USERS_KEY = ['admin', 'users'] as const;
const ROLES_KEY = ['admin', 'roles'] as const;
const LOGS_KEY = ['admin', 'audit-logs'] as const;
const STATS_KEY = ['admin', 'stats'] as const;

export function useAdminUserList(filters: AdminUserFilters) {
  return useQuery({
    queryKey: [...USERS_KEY, filters],
    queryFn: () => api.listAdminUsers(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserDetail(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'users', 'detail', id],
    queryFn: () => api.getAdminUser(id!),
    enabled: Boolean(id),
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => api.listRoles(),
    staleTime: 60_000,
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => api.listPermissions(),
    staleTime: 60_000,
  });
}

export function useAdminAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: [...LOGS_KEY, filters],
    queryFn: () => api.listAuditLogs(filters),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => api.getAdminStats(),
    staleTime: 30_000,
  });
}

function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: USERS_KEY });
    queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'detail'] });
    queryClient.invalidateQueries({ queryKey: STATS_KEY });
    queryClient.invalidateQueries({ queryKey: ROLES_KEY });
  };
}

export function useCreateAdminUser() {
  const invalidate = useInvalidateAdmin();
  return useMutation<AdminUserDetailDto, ApiError, CreateAdminUserRequest>({
    mutationFn: (data) => api.createAdminUser(data),
    onSuccess: invalidate,
  });
}

export function useUpdateAdminUser(id: string) {
  const invalidate = useInvalidateAdmin();
  return useMutation<AdminUserDetailDto, ApiError, UpdateAdminUserRequest>({
    mutationFn: (data) => api.updateAdminUser(id, data),
    onSuccess: invalidate,
  });
}

export function useSetAdminUserActive() {
  const invalidate = useInvalidateAdmin();
  return useMutation<AdminUserDetailDto, ApiError, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => api.setAdminUserActive(id, isActive),
    onSuccess: invalidate,
  });
}

export function useUpdateRolePermissions() {
  const invalidate = useInvalidateAdmin();
  return useMutation<RoleDetailDto, ApiError, { roleId: string; data: UpdateRolePermissionsRequest }>({
    mutationFn: ({ roleId, data }) => api.updateRolePermissions(roleId, data),
    onSuccess: invalidate,
  });
}
