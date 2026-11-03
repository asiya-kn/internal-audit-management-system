import type { Request, Response, NextFunction } from 'express';
import { EvidenceService } from '../services/evidence.service.js';
import { recordAudit } from '../services/audit.service.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type {
  CreateEvidenceInput,
  UpdateEvidenceInput,
  ListEvidenceInput,
  EvidenceReviewStatus,
} from '@iams/shared';

const service = new EvidenceService();

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip;
}

function safeMetadata(payload: Record<string, unknown>): Record<string, unknown> {
  const { notes, description, reviewComments, documentMetadata, ...rest } = payload;
  return {
    ...rest,
    notesPresent: Boolean(notes),
    descriptionPresent: Boolean(description),
  };
}

export async function listEvidence(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.query as unknown as ListEvidenceInput;
    const result = await service.list(input);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getEvidence(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const entity = await service.getById(id);
    sendSuccess(res, entity);
  } catch (err) {
    next(err);
  }
}

export async function createEvidence(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as CreateEvidenceInput;
    const entity = await service.create(input, req.user!.id);

    recordAudit({
      action: 'evidence.create',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: safeMetadata({
        id: entity.id,
        reference: entity.reference,
        title: entity.title,
        evidenceType: entity.evidenceType,
        engagementId: entity.engagementId,
        controlTestId: entity.controlTestId,
        findingId: entity.findingId,
        actionPlanId: entity.actionPlanId,
      }),
    });

    sendSuccess(res, entity, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateEvidence(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const input = req.body as UpdateEvidenceInput;
    const entity = await service.update(id, input, req.user!.id);

    recordAudit({
      action: 'evidence.update',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: safeMetadata({
        id: entity.id,
        reference: entity.reference,
        title: entity.title,
        evidenceType: entity.evidenceType,
        reviewStatus: entity.reviewStatus,
      }),
    });

    sendSuccess(res, entity);
  } catch (err) {
    next(err);
  }
}

export async function reviewEvidence(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { reviewStatus, reviewComments } = req.body as {
      reviewStatus: EvidenceReviewStatus;
      reviewComments?: string;
    };
    const entity = await service.review(id, reviewStatus, reviewComments, req.user!.id);

    recordAudit({
      action: 'evidence.review',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: safeMetadata({
        id: entity.id,
        reference: entity.reference,
        reviewStatus: entity.reviewStatus,
      }),
    });

    sendSuccess(res, entity);
  } catch (err) {
    next(err);
  }
}

export async function deleteEvidence(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await service.getById(id);
    await service.delete(id);

    recordAudit({
      action: 'evidence.delete',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: existing.id, reference: existing.reference, title: existing.title },
    });

    sendSuccess(res, { message: 'Evidence record deleted' });
  } catch (err) {
    if (err instanceof NotFoundError) {
      recordAudit({
        action: 'evidence.delete_failed',
        category: 'data_access',
        userId: req.user?.id,
        ip: clientIp(req),
        userAgent: req.headers['user-agent'],
        metadata: { id: req.params.id, reason: 'not_found' },
        success: false,
      });
    }
    next(err);
  }
}

export async function getEvidenceDashboard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dashboard = await service.getDashboard();
    sendSuccess(res, dashboard);
  } catch (err) {
    next(err);
  }
}
