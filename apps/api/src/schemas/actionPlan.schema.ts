import { z } from 'zod';
import { ACTION_PLAN_STATUSES, ACTION_PLAN_PRIORITIES } from '@iams/shared';
import { paginationSchema, uuidSchema } from './auth.schema.js';

export const actionPlanStatusSchema = z.enum(ACTION_PLAN_STATUSES as [string, ...string[]]);
export const actionPlanPrioritySchema = z.enum(ACTION_PLAN_PRIORITIES as [string, ...string[]]);

export const createActionPlanSchema = z.object({
  reference: z.string().trim().min(1, 'Reference is required').max(100, 'Reference must not exceed 100 characters')
    .regex(/^[A-Za-z0-9\-_.]+$/, 'Only letters, numbers, dashes, underscores and dots are allowed'),
  title: z.string().trim().min(1, 'Title is required').max(500, 'Title must not exceed 500 characters'),
  description: z.string().trim().min(1, 'Description is required').max(10000),
  findingId: z.string().uuid().nullable().optional(),
  controlTestId: z.string().uuid().nullable().optional(),
  engagementId: z.string().uuid().nullable().optional(),
  auditEntityId: z.string().uuid().nullable().optional(),
  responsibleOwnerId: z.string().uuid().nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  priority: actionPlanPrioritySchema.optional(),
  targetDate: z.string().datetime().nullable().optional(),
  managementJustification: z.string().max(10000).optional(),
  proposedRectification: z.string().max(10000).optional(),
});

export const updateActionPlanSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().min(1).max(10000).optional(),
  findingId: z.string().uuid().nullable().optional(),
  controlTestId: z.string().uuid().nullable().optional(),
  engagementId: z.string().uuid().nullable().optional(),
  auditEntityId: z.string().uuid().nullable().optional(),
  responsibleOwnerId: z.string().uuid().nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  priority: actionPlanPrioritySchema.optional(),
  targetDate: z.string().datetime().nullable().optional(),
  managementJustification: z.string().max(10000).nullable().optional(),
  proposedRectification: z.string().max(10000).nullable().optional(),
});

export const addProgressUpdateSchema = z.object({
  note: z.string().trim().min(1, 'A note is required').max(10000),
  progressPct: z.number().int().min(0).max(100).optional(),
});

export const verifyActionPlanSchema = z.object({
  verificationNotes: z.string().max(10000).optional(),
});

export const transitionActionPlanSchema = z.object({
  status: actionPlanStatusSchema,
});

export const listActionPlanSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  findingId: z.string().uuid().optional(),
  controlTestId: z.string().uuid().optional(),
  engagementId: z.string().uuid().optional(),
  auditEntityId: z.string().uuid().optional(),
  status: actionPlanStatusSchema.optional(),
  priority: actionPlanPrioritySchema.optional(),
  responsibleOwnerId: z.string().uuid().optional(),
  overdue: z.enum(['true', 'false']).optional(),
});

export const actionPlanIdParamSchema = z.object({
  id: uuidSchema,
});
