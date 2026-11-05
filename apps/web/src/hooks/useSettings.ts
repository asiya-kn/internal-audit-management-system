import { useMutation, useQuery } from '@tanstack/react-query';
import type { ChangePasswordRequest, UpdateProfileRequest } from '@iams/shared';
import { api } from '@/lib/api';

export const settingsKeys = {
  systemInfo: ['settings', 'system-info'] as const,
};

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => api.updateProfile(data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => api.changePassword(data),
  });
}

export function useSystemInfo() {
  return useQuery({
    queryKey: settingsKeys.systemInfo,
    queryFn: () => api.getSystemInfo(),
  });
}
