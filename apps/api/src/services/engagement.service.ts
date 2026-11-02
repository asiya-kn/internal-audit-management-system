import { prisma } from '../config/db.js';
import { EngagementRepository } from '../repositories/engagement.repository.js';
import { mapEngagementToSummary, mapEngagementToDetail, mapTeamMemberToDto } from './engagement.mapper.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import { canTransitionEngagement, type EngagementStatus, type EngagementType, type TeamMemberRole, type EngagementDashboardDto } from '@iams/shared';
import type { Prisma } from '../generated/client/index.js';
import type {
  EngagementSummaryDto,
  EngagementDetailDto,
  EngagementTeamMemberDto,
} from '@iams/shared';

const SORT_COLUMNS = [
  'title',
  'reference',
  'type',
  'status',
  'startDate',
  'endDate',
  'createdAt',
  'updatedAt',
] as const;

type SortColumn = (typeof SORT_COLUMNS)[number];

const STATUS_LABELS: Record<EngagementStatus, string> = {
  PLANNED: 'Planned', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review', COMPLETED: 'Completed', CANCELLED: 'Cancelled', ON_HOLD: 'On Hold',
};

export class EngagementService {
  constructor(
    private readonly repo: EngagementRepository = new EngagementRepository(),
  ) {}

  async list(input: import('@iams/shared').ListEngagementInput): Promise<{ items: EngagementSummaryDto[]; total: number; page: number; pageSize: number }> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const { sortBy, sortOrder, search, auditPlanId, auditEntityId, riskId, status, type, leadAuditorId } = input;

    const where: Prisma.EngagementWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { auditEntity: { name: { contains: search, mode: 'insensitive' } } },
        { auditEntity: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (auditPlanId) where.auditPlanId = auditPlanId;
    if (auditEntityId) where.auditEntityId = auditEntityId;
    if (riskId) where.riskId = riskId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (leadAuditorId) where.leadAuditorId = leadAuditorId;

    const sortCol: SortColumn = sortBy && (SORT_COLUMNS as readonly string[]).includes(sortBy)
      ? (sortBy as SortColumn)
      : 'createdAt';
    const orderBy: Prisma.EngagementOrderByWithRelationInput = {
      [sortCol]: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const [items, total] = await Promise.all([
      this.repo.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.repo.count(where),
    ]);

    return { items: items.map(mapEngagementToSummary), total, page, pageSize };
  }

  async getById(id: string): Promise<EngagementDetailDto> {
    const eng = await this.repo.findById(id);
    if (!eng) throw new NotFoundError('Engagement not found');
    return mapEngagementToDetail(eng);
  }

  async create(input: import('@iams/shared').CreateEngagementInput, userId: string): Promise<EngagementDetailDto> {
    const entity = await prisma.auditUniverse.findUnique({ where: { id: input.auditEntityId } });
    if (!entity) throw new ValidationError('The specified audit entity does not exist', { auditEntityId: input.auditEntityId });

    const existing = await this.repo.findByReference(input.reference);
    if (existing) throw new ConflictError(`An engagement with reference "${input.reference}" already exists`);

    if (input.auditPlanId) {
      const plan = await prisma.auditPlan.findUnique({ where: { id: input.auditPlanId } });
      if (!plan) throw new ValidationError('The specified audit plan does not exist', { auditPlanId: input.auditPlanId });
    }

    if (input.riskId) {
      const risk = await prisma.risk.findUnique({ where: { id: input.riskId } });
      if (!risk) throw new ValidationError('The specified risk does not exist', { riskId: input.riskId });
      if (risk.auditEntityId !== input.auditEntityId) {
        throw new ValidationError('The linked risk must belong to the same audit entity', { riskId: input.riskId });
      }
    }

    if (input.leadAuditorId) {
      const auditor = await prisma.user.findUnique({ where: { id: input.leadAuditorId } });
      if (!auditor) throw new ValidationError('The specified lead auditor does not exist', { leadAuditorId: input.leadAuditorId });
    }

    if (input.startDate && input.endDate) {
      if (new Date(input.endDate) < new Date(input.startDate)) {
        throw new ValidationError('End date must be after start date');
      }
    }

    const teamMemberUserIds = input.teamMemberUserIds ?? [];
    if (teamMemberUserIds.length > 0) {
      const users = await prisma.user.findMany({ where: { id: { in: teamMemberUserIds } } });
      if (users.length !== teamMemberUserIds.length) {
        throw new ValidationError('One or more team member users do not exist');
      }
    }

    const data: Prisma.EngagementCreateInput = {
      reference: input.reference,
      title: input.title,
      auditEntity: { connect: { id: input.auditEntityId } },
      auditPlan: input.auditPlanId ? { connect: { id: input.auditPlanId } } : undefined,
      risk: input.riskId ? { connect: { id: input.riskId } } : undefined,
      type: (input.type ?? 'INTERNAL_AUDIT') as EngagementType,
      objectives: input.objectives,
      scope: input.scope,
      methodology: input.methodology,
      estimatedResources: input.estimatedResources ?? null,
      leadAuditor: input.leadAuditorId ? { connect: { id: input.leadAuditorId } } : undefined,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      createdBy: { connect: { id: userId } },
      updatedBy: { connect: { id: userId } },
    };

    if (teamMemberUserIds.length > 0) {
      data.teamMembers = {
        create: teamMemberUserIds.map((uid) => ({
          user: { connect: { id: uid } },
          role: 'AUDITOR' as TeamMemberRole,
        })),
      };
    }

    const created = await this.repo.create(data);
    return mapEngagementToDetail(created);
  }

  async update(id: string, input: import('@iams/shared').UpdateEngagementInput, userId: string): Promise<EngagementDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Engagement not found');

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new ValidationError(`Cannot edit an engagement that is ${STATUS_LABELS[existing.status].toLowerCase()}`);
    }

    if (input.reference && input.reference !== existing.reference) {
      const dup = await this.repo.findByReference(input.reference);
      if (dup) throw new ConflictError(`An engagement with reference "${input.reference}" already exists`);
    }

    if (input.auditEntityId && input.auditEntityId !== existing.auditEntityId) {
      const entity = await prisma.auditUniverse.findUnique({ where: { id: input.auditEntityId } });
      if (!entity) throw new ValidationError('The specified audit entity does not exist', { auditEntityId: input.auditEntityId });
    }

    if (input.auditPlanId !== undefined && input.auditPlanId !== null && input.auditPlanId !== existing.auditPlanId) {
      const plan = await prisma.auditPlan.findUnique({ where: { id: input.auditPlanId } });
      if (!plan) throw new ValidationError('The specified audit plan does not exist', { auditPlanId: input.auditPlanId });
    }

    if (input.riskId !== undefined && input.riskId !== null && input.riskId !== existing.riskId) {
      const risk = await prisma.risk.findUnique({ where: { id: input.riskId } });
      if (!risk) throw new ValidationError('The specified risk does not exist', { riskId: input.riskId });
      const entityId = input.auditEntityId ?? existing.auditEntityId;
      if (risk.auditEntityId !== entityId) {
        throw new ValidationError('The linked risk must belong to the same audit entity', { riskId: input.riskId });
      }
    }

    if (input.leadAuditorId !== undefined && input.leadAuditorId !== null && input.leadAuditorId !== existing.leadAuditorId) {
      const auditor = await prisma.user.findUnique({ where: { id: input.leadAuditorId } });
      if (!auditor) throw new ValidationError('The specified lead auditor does not exist', { leadAuditorId: input.leadAuditorId });
    }

    if (input.startDate && input.endDate) {
      if (new Date(input.endDate) < new Date(input.startDate)) {
        throw new ValidationError('End date must be after start date');
      }
    }

    const data: Prisma.EngagementUpdateInput = {
      updatedBy: { connect: { id: userId } },
    };

    if (input.reference !== undefined) data.reference = input.reference;
    if (input.title !== undefined) data.title = input.title;
    if (input.auditEntityId !== undefined) data.auditEntity = { connect: { id: input.auditEntityId } };
    if (input.auditPlanId !== undefined) data.auditPlan = input.auditPlanId ? { connect: { id: input.auditPlanId } } : { disconnect: true };
    if (input.riskId !== undefined) data.risk = input.riskId ? { connect: { id: input.riskId } } : { disconnect: true };
    if (input.type !== undefined) data.type = input.type as EngagementType;
    if (input.objectives !== undefined) data.objectives = input.objectives;
    if (input.scope !== undefined) data.scope = input.scope;
    if (input.methodology !== undefined) data.methodology = input.methodology;
    if (input.estimatedResources !== undefined) data.estimatedResources = input.estimatedResources;
    if (input.leadAuditorId !== undefined) data.leadAuditor = input.leadAuditorId ? { connect: { id: input.leadAuditorId } } : { disconnect: true };
    if (input.startDate !== undefined) data.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.endDate !== undefined) data.endDate = input.endDate ? new Date(input.endDate) : null;

    const updated = await this.repo.update(id, data);
    return mapEngagementToDetail(updated);
  }

  async transition(id: string, newStatus: EngagementStatus, userId: string, closureNotes?: string): Promise<EngagementDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Engagement not found');

    if (!canTransitionEngagement(existing.status, newStatus)) {
      throw new ValidationError(`Cannot transition from ${STATUS_LABELS[existing.status]} to ${STATUS_LABELS[newStatus]}`);
    }

    const data: Prisma.EngagementUpdateInput = {
      status: newStatus,
      updatedBy: { connect: { id: userId } },
    };

    if (newStatus === 'IN_PROGRESS') {
      data.actualStartDate = new Date();
    }

    if (newStatus === 'COMPLETED') {
      data.actualEndDate = new Date();
      data.closedAt = new Date();
      data.closedBy = { connect: { id: userId } };
      if (closureNotes) data.closureNotes = closureNotes;
    }

    const updated = await this.repo.update(id, data);
    return mapEngagementToDetail(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Engagement not found');

    if (existing.status !== 'PLANNED' && existing.status !== 'CANCELLED') {
      throw new ValidationError('Only planned or cancelled engagements can be deleted');
    }

    await this.repo.delete(id);
  }

  // ---- Team Members ----

  async addTeamMember(engagementId: string, userId: string, role: TeamMemberRole): Promise<EngagementTeamMemberDto> {
    const eng = await this.repo.findById(engagementId);
    if (!eng) throw new NotFoundError('Engagement not found');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ValidationError('The specified user does not exist', { userId });

    const existing = await this.repo.findTeamMember(engagementId, userId);
    if (existing) throw new ConflictError('This user is already a team member');

    const tm = await this.repo.addTeamMember({
      engagement: { connect: { id: engagementId } },
      user: { connect: { id: userId } },
      role,
    });

    await this.repo.update(engagementId, { updatedBy: { connect: { id: userId } } });
    return mapTeamMemberToDto(tm);
  }

  async updateTeamMember(engagementId: string, userId: string, role: TeamMemberRole): Promise<EngagementTeamMemberDto> {
    const existing = await this.repo.findTeamMember(engagementId, userId);
    if (!existing) throw new NotFoundError('Team member not found');

    const tm = await this.repo.updateTeamMember(engagementId, userId, { role });
    return mapTeamMemberToDto(tm);
  }

  async removeTeamMember(engagementId: string, userId: string): Promise<void> {
    const existing = await this.repo.findTeamMember(engagementId, userId);
    if (!existing) throw new NotFoundError('Team member not found');
    await this.repo.removeTeamMember(engagementId, userId);
  }

  // ---- Dashboard ----

  async getDashboard(): Promise<EngagementDashboardDto> {
    const all = await this.repo.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const byStatus: Record<EngagementStatus, number> = {
      PLANNED: 0, ASSIGNED: 0, IN_PROGRESS: 0, IN_REVIEW: 0, COMPLETED: 0, CANCELLED: 0, ON_HOLD: 0,
    };
    const byType: Record<EngagementType, number> = {
      INTERNAL_AUDIT: 0, COMPLIANCE_AUDIT: 0, IT_AUDIT: 0, OPERATIONAL_AUDIT: 0,
      FINANCIAL_AUDIT: 0, FOLLOW_UP: 0, SPECIAL_REVIEW: 0, AD_HOC: 0,
    };

    let plannedFromAuditPlan = 0;
    let overdueEngagements = 0;
    const now = new Date();

    for (const eng of all) {
      byStatus[eng.status]++;
      byType[eng.type]++;
      if (eng.auditPlanId) plannedFromAuditPlan++;
      if (eng.endDate && eng.status !== 'COMPLETED' && eng.status !== 'CANCELLED' && new Date(eng.endDate) < now) {
        overdueEngagements++;
      }
    }

    const upcoming = all
      .filter((e) => e.startDate && e.startDate >= now && e.status !== 'CANCELLED' && e.status !== 'COMPLETED')
      .sort((a, b) => (a.startDate!.getTime() - b.startDate!.getTime()))
      .slice(0, 5)
      .map(mapEngagementToSummary);

    return {
      totalEngagements: all.length,
      byStatus,
      byType,
      activeCount: byStatus.IN_PROGRESS + byStatus.IN_REVIEW,
      completedCount: byStatus.COMPLETED,
      plannedFromAuditPlan,
      upcomingEngagements: upcoming,
      overdueEngagements,
    };
  }
}
