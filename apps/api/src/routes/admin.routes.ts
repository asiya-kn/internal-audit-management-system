import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  setUserActive,
  listRoles,
  updateRolePermissions,
  listPermissions,
  listAuditLogs,
  getStats,
} from '../controllers/admin.controller.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// User management
router.get('/users', requirePermission('users.view'), listUsers);
router.get('/users/:id', requirePermission('users.view'), getUser);
router.post('/users', requirePermission('users.create'), createUser);
router.put('/users/:id', requirePermission('users.update'), updateUser);
router.patch('/users/:id/active', requirePermission('users.update'), setUserActive);

// Role & permission management
router.get('/roles', requirePermission('roles.view'), listRoles);
router.put('/roles/:roleId/permissions', requirePermission('roles.manage'), updateRolePermissions);
router.get('/permissions', requirePermission('roles.view'), listPermissions);

// Audit logs
router.get('/audit-logs', requirePermission('activity_logs.view'), listAuditLogs);

// Admin statistics
router.get('/stats', requirePermission('users.view'), getStats);

export default router;
