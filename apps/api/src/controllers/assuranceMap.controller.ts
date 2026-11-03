import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AssuranceMapService } from '../services/assuranceMap.service.js';
import type { AssuranceMapFilters, AssuranceProvider, AssuranceLevel, AssuranceTargetType } from '@iams/shared';

const service = new AssuranceMapService();

export async function getAssuranceMap(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters: AssuranceMapFilters = {
      search: req.query.search as string | undefined,
      provider: req.query.provider as AssuranceProvider | undefined,
      assuranceLevel: req.query.assuranceLevel as AssuranceLevel | undefined,
      targetType: req.query.targetType as AssuranceTargetType | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    };

    const data = await service.getAssuranceMap(filters);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
