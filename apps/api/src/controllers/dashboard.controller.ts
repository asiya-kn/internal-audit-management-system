import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { DashboardFilters } from '@iams/shared';
import { DashboardService } from '../services/dashboard.service.js';

const service = new DashboardService();

export async function getDashboardMetrics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters: DashboardFilters = {
      reportingYear: req.query.reportingYear as string | undefined,
      auditCycle: req.query.auditCycle as string | undefined,
      riskArea: req.query.riskArea as string | undefined,
      auditOwner: req.query.auditOwner as string | undefined,
      status: req.query.status as string | undefined,
    };

    const data = await service.getMetrics(filters);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
