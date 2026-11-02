import { z } from 'zod';
import { AUDIT_PLAN_STATUSES, AUDIT_PRIORITIES } from '@iams/shared';
import { paginationSchema, uuidSchema } from './auth.schema.js';

export const auditPlanStatusSchema = z.enum(AUDIT_PLAN_STATUSES as [string, ...string[]]);
export const auditPrioritySchema = z.enum(AUDIT_PRIORITIES as [string, ...string[]]);

export const createAuditPlanSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300, 'Title must not exceed 300 characters'),
  reference: z.string().trim().min(1, 'Reference is required').max(100, 'Reference must not exceed 100 characters')
    .regex(/^[A-Za-z0-9\-_.]+$/, 'Only letters, numbers, dashes, underscores and dots are allowed'),
  fiscalYear: z.coerce.number().int().min(2000, 'Fiscal year must be at least 2000').max(2200, 'Fiscal year must not exceed 2200'),
  auditEntityId: z.string().uuid('A valid audit entity is required'),
  riskId: z.string().uuid().nullable().optional(),
  objectives: z.string().trim().min(1, 'Objectives are required').max(5000, 'Objectives must not exceed 5000 characters'),
  scope: z.string().trim().min(1, 'Scope is required').max(5000, 'Scope must not exceed 5000 characters'),
  priority: auditPrioritySchema.optional(),
  proposedStartDate: z.string().datetime().nullable().optional(),
  proposedEndDate: z.string().datetime().nullable().optional(),
  estimatedResources: z.string().max(2000).nullable().optional(),
  planningRationale: z.string().max(5000).nullable().optional(),
  leadAuditorId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateAuditPlanSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  reference: z.string().trim().min(1).max(100)
    .regex(/^[A-Za-z0-9\-_.]+$/, 'Only letters, numbers, dashes, underscores and dots are allowed').optional(),
  fiscalYear: z.coerce.number().int().min(2000).max(2200).optional(),
  auditEntityId: z.string().uuid().optional(),
  riskId: z.string().uuid().nullable().optional(),
  objectives: z.string().trim().min(1).max(5000).optional(),
  scope: z.string().trim().min(1).max(5000).optional(),
  priority: auditPrioritySchema.optional(),
  proposedStartDate: z.string().datetime().nullable().optional(),
  proposedEndDate: z.string().datetime().nullable().optional(),
  estimatedResources: z.string().max(2000).nullable().optional(),
  planningRationale: z.string().max(5000).nullable().optional(),
  leadAuditorId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const listAuditPlanSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  fiscalYear: z.coerce.number().int().optional(),
  auditEntityId: z.string().uuid().optional(),
  riskId: z.string().uuid().optional(),
  status: auditPlanStatusSchema.optional(),
  priority: auditPrioritySchema.optional(),
  leadAuditorId: z.string().uuid().optional(),
});

export const transitionAuditPlanSchema = z.object({
  status: auditPlanStatusSchema,
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

export type CreateAuditPlanInput = z.infer<typeof createAuditPlanSchema>;
export type UpdateAuditPlanInput = z.infer<typeof updateAuditPlanSchema>;
export type ListAuditPlanInput = z.infer<typeof listAuditPlanSchema>;
export type TransitionAuditPlanInput = z.infer<typeof transitionAuditPlanSchema>;
