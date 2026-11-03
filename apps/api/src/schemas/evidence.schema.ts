import { z } from 'zod';
import { EVIDENCE_TYPES, EVIDENCE_REVIEW_STATUSES } from '@iams/shared';
import { paginationSchema } from './auth.schema.js';

export const evidenceTypeSchema = z.enum(EVIDENCE_TYPES as [string, ...string[]]);
export const evidenceReviewStatusSchema = z.enum(EVIDENCE_REVIEW_STATUSES as [string, ...string[]]);

export const createEvidenceSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, 'Reference is required')
    .max(50, 'Reference must not exceed 50 characters')
    .regex(/^[A-Za-z0-9\-_.]+$/, 'Reference may only contain letters, numbers, dashes, underscores and dots'),
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  description: z.string().max(2000, 'Description must not exceed 2000 characters').optional(),
  evidenceType: evidenceTypeSchema.optional(),
  source: z.string().max(200, 'Source must not exceed 200 characters').optional(),
  engagementId: z.string().uuid().nullable().optional(),
  controlTestId: z.string().uuid().nullable().optional(),
  findingId: z.string().uuid().nullable().optional(),
  actionPlanId: z.string().uuid().nullable().optional(),
  auditEntityId: z.string().uuid().nullable().optional(),
  collectionDate: z.string().datetime().nullable().optional(),
  submittedById: z.string().uuid().nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  documentReference: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateEvidenceSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  evidenceType: evidenceTypeSchema.optional(),
  source: z.string().max(200).nullable().optional(),
  engagementId: z.string().uuid().nullable().optional(),
  controlTestId: z.string().uuid().nullable().optional(),
  findingId: z.string().uuid().nullable().optional(),
  actionPlanId: z.string().uuid().nullable().optional(),
  auditEntityId: z.string().uuid().nullable().optional(),
  collectionDate: z.string().datetime().nullable().optional(),
  submittedById: z.string().uuid().nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  documentReference: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const reviewEvidenceSchema = z.object({
  reviewStatus: evidenceReviewStatusSchema,
  reviewComments: z.string().max(2000).optional(),
});

export const listEvidenceSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  engagementId: z.string().uuid().optional(),
  controlTestId: z.string().uuid().optional(),
  findingId: z.string().uuid().optional(),
  actionPlanId: z.string().uuid().optional(),
  auditEntityId: z.string().uuid().optional(),
  evidenceType: evidenceTypeSchema.optional(),
  reviewStatus: evidenceReviewStatusSchema.optional(),
  submittedById: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
});

export const evidenceIdParamSchema = z.object({
  id: z.string().uuid('A valid UUID is required'),
});
