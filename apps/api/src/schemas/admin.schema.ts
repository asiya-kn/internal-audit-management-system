import { z } from 'zod';

export const adminUserFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  roleId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const createAdminUserSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().max(254, 'Email must not exceed 254 characters').email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  roleIds: z.array(z.string().uuid()).default([]),
  isActive: z.boolean().optional(),
});

export const updateAdminUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().max(254).email('A valid email is required').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});

export const auditLogFiltersSchema = z.object({
  category: z.string().max(50).optional(),
  action: z.string().max(100).optional(),
  userId: z.string().uuid().optional(),
  success: z.enum(['true', 'false']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export type AdminUserFiltersInput = z.infer<typeof adminUserFiltersSchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>;
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
