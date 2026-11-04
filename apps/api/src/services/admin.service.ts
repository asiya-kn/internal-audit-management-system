import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import type { User, Role, Permission } from '../generated/client/index.js';
import type {
  AdminUserSummaryDto,
  AdminUserDetailDto,
  AdminUserFilters,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  RoleDetailDto,
  AuditLogDto,
  AuditLogFilters,
  AdminStatsDto,
} from '@iams/shared';

interface UserWithRelations extends User {
  userRoles: {
    role: Role & {
      rolePermissions: { permission: Permission }[];
    };
  }[];
}

function mapUserToSummary(user: UserWithRelations): AdminUserSummaryDto {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    roles: user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function mapUserToDetail(user: UserWithRelations): AdminUserDetailDto {
  const permissions = [
    ...new Set(
      user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.name),
      ),
    ),
  ];
  return { ...mapUserToSummary(user), permissions };
}

function mapRoleToDetail(
  role: Role & {
    rolePermissions: { permission: Permission }[];
    _count?: { userRoles: number };
    userRoles?: unknown[];
  },
): RoleDetailDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.rolePermissions.map((rp) => ({
      id: rp.permission.id,
      name: rp.permission.name,
      description: rp.permission.description,
    })),
    userCount: role._count?.userRoles ?? (role.userRoles as unknown[] | undefined)?.length ?? 0,
  };
}

export class AdminService {
  async listUsers(filters: AdminUserFilters): Promise<{ items: AdminUserSummaryDto[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const sortBy = filters.sortBy ?? 'createdAt';
    const sortOrder = filters.sortOrder ?? 'desc';

    const where: Record<string, unknown> = {};
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.roleId) where.userRoles = { some: { roleId: filters.roleId } };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          userRoles: {
            include: {
              role: {
                include: { rolePermissions: { include: { permission: true } } },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { items: users.map(mapUserToSummary), total, page, pageSize };
  }

  async getUser(id: string): Promise<AdminUserDetailDto> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundError('User not found');
    return mapUserToDetail(user);
  }

  async createUser(data: CreateAdminUserRequest): Promise<AdminUserDetailDto> {
    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError('A user with this email already exists');

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email,
        passwordHash,
        isActive: data.isActive ?? true,
        userRoles: data.roleIds.length
          ? { createMany: { data: data.roleIds.map((roleId) => ({ roleId })) } }
          : undefined,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    return mapUserToDetail(user);
  }

  async updateUser(id: string, data: UpdateAdminUserRequest): Promise<AdminUserDetailDto> {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User not found');

    if (data.email && data.email.toLowerCase().trim() !== existing.email) {
      const conflict = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (conflict) throw new ConflictError('A user with this email already exists');
    }

    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    if (data.roleIds !== undefined) {
      updateData.userRoles = {
        deleteMany: {},
        createMany: { data: data.roleIds.map((roleId) => ({ roleId })) },
      };
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    return mapUserToDetail(user);
  }

  async setUserActive(id: string, isActive: boolean): Promise<AdminUserDetailDto> {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('User not found');

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    return mapUserToDetail(user);
  }

  async listRoles(): Promise<{ items: RoleDetailDto[]; total: number }> {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
    return { items: roles.map(mapRoleToDetail), total: roles.length };
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<RoleDetailDto> {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role not found');

    await prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      });
    }

    const updated = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });
    if (!updated) throw new NotFoundError('Role not found');
    return mapRoleToDetail(updated);
  }

  async listPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
    return permissions.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
    }));
  }

  async listAuditLogs(filters: AuditLogFilters): Promise<{ items: AuditLogDto[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const where: Record<string, unknown> = {};
    if (filters.category) where.category = filters.category;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.userId) where.userId = filters.userId;
    if (filters.success !== undefined) where.success = filters.success;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(filters.dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: where as Record<string, never>,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where: where as Record<string, never> }),
    ]);

    // Resolve user emails for the returned logs
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
      : [];
    const emailMap = new Map(users.map((u) => [u.id, u.email]));

    const items = logs.map((log) => ({
      id: log.id,
      action: log.action,
      category: log.category,
      userId: log.userId,
      userEmail: log.userId ? (emailMap.get(log.userId) ?? null) : null,
      ip: log.ip,
      userAgent: log.userAgent,
      success: log.success,
      createdAt: log.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize };
  }

  async getStats(): Promise<AdminStatsDto> {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalRoles,
      totalPermissions,
      recentLogins,
      failedLoginAttempts,
      totalAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.role.count(),
      prisma.permission.count(),
      prisma.auditLog.count({
        where: {
          action: 'login',
          success: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: 'login_failed',
          success: false,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.auditLog.count(),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalRoles,
      totalPermissions,
      recentLogins,
      failedLoginAttempts,
      totalAuditLogs,
    };
  }
}
