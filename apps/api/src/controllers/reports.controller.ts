import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.js';
import { recordAudit } from '../services/audit.service.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { ReportFilters, ReportType } from '@iams/shared';
import { ReportsService } from '../services/reports.service.js';

const service = new ReportsService();

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip;
}

export async function generateReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters: ReportFilters = {
      reportType: req.query.reportType as ReportType,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      engagementId: req.query.engagementId as string | undefined,
      auditEntityId: req.query.auditEntityId as string | undefined,
      fiscalYear: req.query.fiscalYear ? Number(req.query.fiscalYear) : undefined,
    };

    const data = await service.generateReport(filters);

    recordAudit({
      action: 'report.generate',
      category: 'data_access',
      userId: req.user!.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { reportType: filters.reportType },
    });

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
