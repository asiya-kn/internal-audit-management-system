import { z } from 'zod';
import { ENGAGEMENT_STATUSES, ENGAGEMENT_TYPES, TEAM_MEMBER_ROLES } from '@iams/shared';
import { paginationSchema, uuidSchema } from './auth.schema.js';

export const engagementStatusSchema = z.enum(ENGAGEMENT_STATUSES as [string, ...string[]]);
export const engagementTypeSchema = z.enum(ENGAGEMENT_TYPES as [string, ...string[]]);
export const teamMemberRoleSchema = z.enum(TEAM_MEMBER_ROLES as [string, ...string[]]);

export const createEngagementSchema = z.object({
  reference: z.string().trim().min(1, 'Reference is required').max(100, 'Reference must not exceed 100 characters')
    .regex(/^[A-Za-z0-9\-_.]+$/, 'Only letters, numbers, dashes, underscores and dots are allowed'),
  title: z.string().trim().min(1, 'Title is required').max(300, 'Title must not exceed 300 characters'),
  auditPlanId: z.string().uuid().nullable().optional(),
  auditEntityId: z.string().uuid('A valid audit entity is required'),
  riskId: z.string().uuid().nullable().optional(),
  type: engagementTypeSchema.optional(),
  objectives: z.string().trim().min(1, 'Objectives are required').max(5000),
  scope: z.string().trim().min(1, 'Scope is required').max(5000),
  methodology: z.string().max(5000).optional(),
  estimatedResources: z.string().max(2000).nullable().optional(),
  leadAuditorId: z.string().uuid().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  teamMemberUserIds: z.array(z.string().uuid()).optional(),
});

export const updateEngagementSchema = z.object({
  reference: z.string().trim().min(1).max(100)
    .regex(/^[A-Za-z0-9\-_.]+$/, 'Only letters, numbers, dashes, underscores and dots are allowed').optional(),
  title: z.string().trim().min(1).max(300).optional(),
  auditPlanId: z.string().uuid().nullable().optional(),
  auditEntityId: z.string().uuid().optional(),
  riskId: z.string().uuid().nullable().optional(),
  type: engagementTypeSchema.optional(),
  objectives: z.string().trim().min(1).max(5000).optional(),
  scope: z.string().trim().min(1).max(5000).optional(),
  methodology: z.string().max(5000).nullable().optional(),
  estimatedResources: z.string().max(2000).nullable().optional(),
  leadAuditorId: z.string().uuid().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export const listEngagementSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  auditPlanId: z.string().uuid().optional(),
  auditEntityId: z.string().uuid().optional(),
  riskId: z.string().uuid().optional(),
  status: engagementStatusSchema.optional(),
  type: engagementTypeSchema.optional(),
  leadAuditorId: z.string().uuid().optional(),
});

export const transitionEngagementSchema = z.object({
  status: engagementStatusSchema,
  closureNotes: z.string().max(5000).optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid('A valid user is required'),
  role: teamMemberRoleSchema.optional(),
});

export const updateTeamMemberSchema = z.object({
  role: teamMemberRoleSchema,
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

const teamMemberParamsSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
});

export { teamMemberParamsSchema };

export type CreateEngagementInput = z.infer<typeof createEngagementSchema>;
export type UpdateEngagementInput = z.infer<typeof updateEngagementSchema>;
export type ListEngagementInput = z.infer<typeof listEngagementSchema>;
export type TransitionEngagementInput = z.infer<typeof transitionEngagementSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
