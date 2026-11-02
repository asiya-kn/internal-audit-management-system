import type { Request, Response, NextFunction } from 'express';
import { ControlTestService } from '../services/controlTest.service.js';
import { recordAudit } from '../services/audit.service.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type {
  CreateControlTestRequest,
  UpdateControlTestRequest,
  ListControlTestInput,
  RecordControlTestResultRequest,
  ReviewControlTestRequest,
  TransitionControlTestRequest,
  ControlTestStatus,
} from '@iams/shared';

const service = new ControlTestService();

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip;
}

export async function listControlTests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.query as unknown as ListControlTestInput;
    const result = await service.list(input);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getControlTest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const test = await service.getById(id);
    sendSuccess(res, test);
  } catch (err) {
    next(err);
  }
}

export async function createControlTest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as CreateControlTestRequest;
    const test = await service.create(input, req.user!.id);
    recordAudit({
      action: 'control_test.create',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: test.id, reference: test.reference, title: test.title },
    });
    sendSuccess(res, test, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateControlTest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const input = req.body as UpdateControlTestRequest;
    const test = await service.update(id, input, req.user!.id);
    recordAudit({
      action: 'control_test.update',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: test.id, reference: test.reference, status: test.status },
    });
    sendSuccess(res, test);
  } catch (err) {
    next(err);
  }
}

export async function recordResult(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const input = req.body as RecordControlTestResultRequest;
    const test = await service.recordResult(id, input, req.user!.id);
    recordAudit({
      action: 'control_test.record_result',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: test.id, reference: test.reference, outcome: test.outcome },
    });
    sendSuccess(res, test);
  } catch (err) {
    next(err);
  }
}

export async function reviewControlTest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const input = req.body as ReviewControlTestRequest;
    const test = await service.review(id, input, req.user!.id);
    recordAudit({
      action: 'control_test.review',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: test.id, reference: test.reference },
    });
    sendSuccess(res, test);
  } catch (err) {
    next(err);
  }
}

export async function linkFinding(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { findingId } = req.body as { findingId: string };
    const test = await service.linkFinding(id, findingId, req.user!.id);
    recordAudit({
      action: 'control_test.link_finding',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: test.id, findingId },
    });
    sendSuccess(res, test);
  } catch (err) {
    next(err);
  }
}

export async function unlinkFinding(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const test = await service.unlinkFinding(id, req.user!.id);
    recordAudit({
      action: 'control_test.unlink_finding',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: test.id },
    });
    sendSuccess(res, test);
  } catch (err) {
    next(err);
  }
}

export async function transitionControlTest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const input = req.body as TransitionControlTestRequest;
    const test = await service.transition(id, input.status as ControlTestStatus, req.user!.id);
    recordAudit({
      action: 'control_test.transition',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: test.id, reference: test.reference, newStatus: test.status },
    });
    sendSuccess(res, test);
  } catch (err) {
    next(err);
  }
}

export async function deleteControlTest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await service.getById(id);
    await service.delete(id);
    recordAudit({
      action: 'control_test.delete',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: existing.id, reference: existing.reference },
    });
    sendSuccess(res, { message: 'Control test deleted' });
  } catch (err) {
    if (err instanceof NotFoundError) {
      recordAudit({
        action: 'control_test.delete_failed',
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

export async function getControlTestDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const dashboard = await service.getDashboard();
    sendSuccess(res, dashboard);
  } catch (err) {
    next(err);
  }
}
