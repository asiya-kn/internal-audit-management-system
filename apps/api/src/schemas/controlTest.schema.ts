import { z } from 'zod';
import { CONTROL_TEST_STATUSES, CONTROL_TEST_OUTCOMES } from '@iams/shared';
import { paginationSchema, uuidSchema } from './auth.schema.js';

export const controlTestStatusSchema = z.enum(CONTROL_TEST_STATUSES as [string, ...string[]]);
export const controlTestOutcomeSchema = z.enum(CONTROL_TEST_OUTCOMES as [string, ...string[]]);

export const createControlTestSchema = z.object({
  reference: z.string().trim().min(1, 'Reference is required').max(100, 'Reference must not exceed 100 characters')
    .regex(/^[A-Za-z0-9\-_.]+$/, 'Only letters, numbers, dashes, underscores and dots are allowed'),
  title: z.string().trim().min(1, 'Title is required').max(500, 'Title must not exceed 500 characters'),
  engagementId: z.string().uuid().nullable().optional(),
  auditEntityId: z.string().uuid().nullable().optional(),
  riskId: z.string().uuid().nullable().optional(),
  controlReference: z.string().max(200).optional(),
  objective: z.string().trim().min(1, 'Objective is required').max(10000),
  procedures: z.string().trim().min(1, 'Procedures are required').max(10000),
  criteria: z.string().max(10000).optional(),
  sampleDescription: z.string().max(10000).optional(),
  sampleSize: z.number().int().min(0).max(1000000).optional(),
  expectedResult: z.string().max(10000).optional(),
  testerId: z.string().uuid().nullable().optional(),
});

export const updateControlTestSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  engagementId: z.string().uuid().nullable().optional(),
  auditEntityId: z.string().uuid().nullable().optional(),
  riskId: z.string().uuid().nullable().optional(),
  controlReference: z.string().max(200).nullable().optional(),
  objective: z.string().trim().min(1).max(10000).optional(),
  procedures: z.string().trim().min(1).max(10000).optional(),
  criteria: z.string().max(10000).nullable().optional(),
  sampleDescription: z.string().max(10000).nullable().optional(),
  sampleSize: z.number().int().min(0).max(1000000).nullable().optional(),
  expectedResult: z.string().max(10000).nullable().optional(),
  testerId: z.string().uuid().nullable().optional(),
});

export const recordResultSchema = z.object({
  actualResult: z.string().trim().min(1, 'Actual result is required').max(10000),
  outcome: controlTestOutcomeSchema,
  exceptions: z.string().max(10000).optional(),
  conclusion: z.string().max(10000).optional(),
  evidenceReference: z.string().max(500).optional(),
  testedAt: z.string().datetime().optional(),
  testerNotes: z.string().max(10000).optional(),
});

export const reviewControlTestSchema = z.object({
  reviewerNotes: z.string().max(10000).optional(),
  reviewedAt: z.string().datetime().optional(),
});

export const linkFindingSchema = z.object({
  findingId: z.string().uuid('A valid finding is required'),
});

export const transitionControlTestSchema = z.object({
  status: controlTestStatusSchema,
});

export const listControlTestSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  engagementId: z.string().uuid().optional(),
  auditEntityId: z.string().uuid().optional(),
  riskId: z.string().uuid().optional(),
  status: controlTestStatusSchema.optional(),
  outcome: controlTestOutcomeSchema.optional(),
  testerId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  findingId: z.string().uuid().optional(),
});

export const controlTestIdParamSchema = z.object({
  id: uuidSchema,
});
