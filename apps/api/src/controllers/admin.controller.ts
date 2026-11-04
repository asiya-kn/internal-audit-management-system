import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.js';
import { recordAudit } from '../services/audit.service.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AdminService } from '../services/admin.service.js';
import {
  adminUserFiltersSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  auditLogFiltersSchema,
  updateRolePermissionsSchema,
} from '../schemas/admin.schema.js';

const service = new AdminService();

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip;
}

export async function listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = adminUserFiltersSchema.parse(req.query);
    const result = await service.listUsers({
      ...filters,
      isActive: filters.isActive !== undefined ? filters.isActive === 'true' : undefined,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = await service.getUser(id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createAdminUserSchema.parse(req.body);
    const user = await service.createUser(data);
    recordAudit({
      action: 'admin.user.create',
      category: 'admin',
      userId: req.user?.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { createdUserId: user.id, email: user.email },
    });
    sendSuccess(res, user, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateAdminUserSchema.parse(req.body);
    const user = await service.updateUser(id, data);
    recordAudit({
      action: 'admin.user.update',
      category: 'admin',
      userId: req.user?.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { updatedUserId: user.id, fields: Object.keys(data) },
    });
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function setUserActive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive } = req.body as { isActive: boolean };
    const user = await service.setUserActive(id, isActive);
    recordAudit({
      action: isActive ? 'admin.user.activate' : 'admin.user.deactivate',
      category: 'admin',
      userId: req.user?.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { targetUserId: user.id, isActive },
    });
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function listRoles(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listRoles();
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function updateRolePermissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roleId } = req.params;
    const { permissionIds } = updateRolePermissionsSchema.parse(req.body);
    const role = await service.updateRolePermissions(roleId, permissionIds);
    recordAudit({
      action: 'admin.role.update_permissions',
      category: 'admin',
      userId: req.user?.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { roleId, permissionCount: permissionIds.length },
    });
    sendSuccess(res, role);
  } catch (err) {
    next(err);
  }
}

export async function listPermissions(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listPermissions();
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = auditLogFiltersSchema.parse(req.query);
    const result = await service.listAuditLogs({
      ...filters,
      success: filters.success !== undefined ? filters.success === 'true' : undefined,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await service.getStats();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}
