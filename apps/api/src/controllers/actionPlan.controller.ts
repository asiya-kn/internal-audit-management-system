import type { Request, Response, NextFunction } from 'express';
import { ActionPlanService } from '../services/actionPlan.service.js';
import { recordAudit } from '../services/audit.service.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type {
  CreateActionPlanRequest,
  UpdateActionPlanRequest,
  ListActionPlanInput,
  AddProgressUpdateRequest,
  VerifyActionPlanRequest,
  TransitionActionPlanRequest,
  ActionPlanStatus,
} from '@iams/shared';

const service = new ActionPlanService();

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip;
}

export async function listActionPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.query as unknown as ListActionPlanInput;
    const result = await service.list(input);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getActionPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const plan = await service.getById(id);
    sendSuccess(res, plan);
  } catch (err) {
    next(err);
  }
}

export async function createActionPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as CreateActionPlanRequest;
    const plan = await service.create(input, req.user!.id);
    recordAudit({
      action: 'action_plan.create',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: plan.id, reference: plan.reference, title: plan.title },
    });
    sendSuccess(res, plan, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateActionPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const input = req.body as UpdateActionPlanRequest;
    const plan = await service.update(id, input, req.user!.id);
    recordAudit({
      action: 'action_plan.update',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: plan.id, reference: plan.reference, status: plan.status },
    });
    sendSuccess(res, plan);
  } catch (err) {
    next(err);
  }
}

export async function addProgressUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const input = req.body as AddProgressUpdateRequest;
    const plan = await service.addProgressUpdate(id, input, req.user!.id);
    recordAudit({
      action: 'action_plan.progress_update',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: plan.id, progressPct: plan.progressPct },
    });
    sendSuccess(res, plan);
  } catch (err) {
    next(err);
  }
}

export async function verifyActionPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const input = req.body as VerifyActionPlanRequest;
    const plan = await service.verify(id, input, req.user!.id);
    recordAudit({
      action: 'action_plan.verify',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: plan.id, reference: plan.reference },
    });
    sendSuccess(res, plan);
  } catch (err) {
    next(err);
  }
}

export async function transitionActionPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const input = req.body as TransitionActionPlanRequest;
    const plan = await service.transition(id, input.status as ActionPlanStatus, req.user!.id);
    recordAudit({
      action: 'action_plan.transition',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: plan.id, reference: plan.reference, newStatus: plan.status },
    });
    sendSuccess(res, plan);
  } catch (err) {
    next(err);
  }
}

export async function deleteActionPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await service.getById(id);
    await service.delete(id);
    recordAudit({
      action: 'action_plan.delete',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { id: existing.id, reference: existing.reference },
    });
    sendSuccess(res, { message: 'Action plan deleted' });
  } catch (err) {
    if (err instanceof NotFoundError) {
      recordAudit({
        action: 'action_plan.delete_failed',
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

export async function getActionPlanDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const dashboard = await service.getDashboard();
    sendSuccess(res, dashboard);
  } catch (err) {
    next(err);
  }
}
