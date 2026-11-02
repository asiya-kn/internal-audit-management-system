import { prisma } from '../config/db.js';
import { AuditPlanRepository } from '../repositories/auditPlan.repository.js';
import { mapPlanToSummary, mapPlanToDetail } from './auditPlan.mapper.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import { canTransition, type AuditPlanStatus, type AuditPriority, type AuditPlanDashboardDto } from '@iams/shared';
import type { Prisma } from '../generated/client/index.js';
import type {
  AuditPlanSummaryDto,
  AuditPlanDetailDto,
} from '@iams/shared';

const SORT_COLUMNS = [
  'title',
  'reference',
  'fiscalYear',
  'priority',
  'status',
  'proposedStartDate',
  'proposedEndDate',
  'createdAt',
  'updatedAt',
] as const;

type SortColumn = (typeof SORT_COLUMNS)[number];

const STATUS_LABELS: Record<AuditPlanStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export class AuditPlanService {
  constructor(
    private readonly repo: AuditPlanRepository = new AuditPlanRepository(),
  ) {}

  async list(input: import('@iams/shared').ListAuditPlanInput): Promise<{ items: AuditPlanSummaryDto[]; total: number; page: number; pageSize: number }> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const { sortBy, sortOrder, search, fiscalYear, auditEntityId, riskId, status, priority, leadAuditorId } = input;

    const where: Prisma.AuditPlanWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { auditEntity: { name: { contains: search, mode: 'insensitive' } } },
        { auditEntity: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (auditEntityId) where.auditEntityId = auditEntityId;
    if (riskId) where.riskId = riskId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (leadAuditorId) where.leadAuditorId = leadAuditorId;

    const sortCol: SortColumn = sortBy && (SORT_COLUMNS as readonly string[]).includes(sortBy)
      ? (sortBy as SortColumn)
      : 'fiscalYear';
    const orderBy: Prisma.AuditPlanOrderByWithRelationInput = {
      [sortCol]: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const [items, total] = await Promise.all([
      this.repo.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.repo.count(where),
    ]);

    return { items: items.map(mapPlanToSummary), total, page, pageSize };
  }

  async getById(id: string): Promise<AuditPlanDetailDto> {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundError('Audit plan not found');
    return mapPlanToDetail(plan);
  }

  async create(input: import('@iams/shared').CreateAuditPlanInput, userId: string): Promise<AuditPlanDetailDto> {
    const entity = await prisma.auditUniverse.findUnique({ where: { id: input.auditEntityId } });
    if (!entity) {
      throw new ValidationError('The specified audit entity does not exist', { auditEntityId: input.auditEntityId });
    }

    const existing = await this.repo.findByReference(input.reference);
    if (existing) {
      throw new ConflictError(`An audit plan with reference "${input.reference}" already exists`);
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

    if (input.proposedStartDate && input.proposedEndDate) {
      if (new Date(input.proposedEndDate) < new Date(input.proposedStartDate)) {
        throw new ValidationError('End date must be after start date');
      }
    }

    const created = await this.repo.create({
      title: input.title,
      reference: input.reference,
      fiscalYear: input.fiscalYear,
      auditEntity: { connect: { id: input.auditEntityId } },
      risk: input.riskId ? { connect: { id: input.riskId } } : undefined,
      objectives: input.objectives,
      scope: input.scope,
      priority: (input.priority ?? 'MEDIUM') as AuditPriority,
      proposedStartDate: input.proposedStartDate ? new Date(input.proposedStartDate) : undefined,
      proposedEndDate: input.proposedEndDate ? new Date(input.proposedEndDate) : undefined,
      estimatedResources: input.estimatedResources ?? null,
      planningRationale: input.planningRationale ?? null,
      leadAuditor: input.leadAuditorId ? { connect: { id: input.leadAuditorId } } : undefined,
      notes: input.notes,
      createdBy: { connect: { id: userId } },
      updatedBy: { connect: { id: userId } },
    });

    return mapPlanToDetail(created);
  }

  async update(id: string, input: import('@iams/shared').UpdateAuditPlanInput, userId: string): Promise<AuditPlanDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Audit plan not found');

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new ValidationError(`Cannot edit a plan that is ${STATUS_LABELS[existing.status].toLowerCase()}`);
    }

    if (input.reference && input.reference !== existing.reference) {
      const dup = await this.repo.findByReference(input.reference);
      if (dup) throw new ConflictError(`An audit plan with reference "${input.reference}" already exists`);
    }

    if (input.auditEntityId && input.auditEntityId !== existing.auditEntityId) {
      const entity = await prisma.auditUniverse.findUnique({ where: { id: input.auditEntityId } });
      if (!entity) throw new ValidationError('The specified audit entity does not exist', { auditEntityId: input.auditEntityId });
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

    if (input.proposedStartDate && input.proposedEndDate) {
      if (new Date(input.proposedEndDate) < new Date(input.proposedStartDate)) {
        throw new ValidationError('End date must be after start date');
      }
    }

    const data: Prisma.AuditPlanUpdateInput = {
      updatedBy: { connect: { id: userId } },
    };

    if (input.title !== undefined) data.title = input.title;
    if (input.reference !== undefined) data.reference = input.reference;
    if (input.fiscalYear !== undefined) data.fiscalYear = input.fiscalYear;
    if (input.auditEntityId !== undefined) data.auditEntity = { connect: { id: input.auditEntityId } };
    if (input.riskId !== undefined) data.risk = input.riskId ? { connect: { id: input.riskId } } : { disconnect: true };
    if (input.objectives !== undefined) data.objectives = input.objectives;
    if (input.scope !== undefined) data.scope = input.scope;
    if (input.priority !== undefined) data.priority = input.priority as AuditPriority;
    if (input.proposedStartDate !== undefined) data.proposedStartDate = input.proposedStartDate ? new Date(input.proposedStartDate) : null;
    if (input.proposedEndDate !== undefined) data.proposedEndDate = input.proposedEndDate ? new Date(input.proposedEndDate) : null;
    if (input.estimatedResources !== undefined) data.estimatedResources = input.estimatedResources;
    if (input.planningRationale !== undefined) data.planningRationale = input.planningRationale;
    if (input.leadAuditorId !== undefined) data.leadAuditor = input.leadAuditorId ? { connect: { id: input.leadAuditorId } } : { disconnect: true };
    if (input.notes !== undefined) data.notes = input.notes;

    const updated = await this.repo.update(id, data);
    return mapPlanToDetail(updated);
  }

  async transition(id: string, newStatus: AuditPlanStatus, userId: string): Promise<AuditPlanDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Audit plan not found');

    if (!canTransition(existing.status, newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${STATUS_LABELS[existing.status]} to ${STATUS_LABELS[newStatus]}`,
      );
    }

    const data: Prisma.AuditPlanUpdateInput = {
      status: newStatus,
      updatedBy: { connect: { id: userId } },
    };

    if (newStatus === 'APPROVED') {
      data.approvedAt = new Date();
      data.approvedBy = { connect: { id: userId } };
    }

    const updated = await this.repo.update(id, data);
    return mapPlanToDetail(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Audit plan not found');

    if (existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
      throw new ValidationError('Only draft or cancelled plans can be deleted');
    }

    await this.repo.delete(id);
  }

  async getDashboard(): Promise<AuditPlanDashboardDto> {
    const all = await this.repo.findMany({
      where: {},
      orderBy: { priority: 'desc' },
      take: 200,
    });

    const byStatus: Record<AuditPlanStatus, number> = {
      DRAFT: 0, IN_REVIEW: 0, APPROVED: 0, SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0,
    };
    const byPriority: Record<AuditPriority, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0,
    };
    const yearMap = new Map<number, number>();
    const entityIdsWithPlan = new Set<string>();

    for (const plan of all) {
      byStatus[plan.status]++;
      byPriority[plan.priority]++;
      entityIdsWithPlan.add(plan.auditEntityId);
      yearMap.set(plan.fiscalYear, (yearMap.get(plan.fiscalYear) ?? 0) + 1);
    }

    const totalEntities = await prisma.auditUniverse.count({ where: { status: 'ACTIVE' } });
    const coveragePct = totalEntities > 0 ? Math.round((entityIdsWithPlan.size / totalEntities) * 100) : 0;

    const now = new Date();
    const upcoming = all
      .filter((p) => p.proposedStartDate && p.proposedStartDate >= now && p.status !== 'CANCELLED' && p.status !== 'COMPLETED')
      .sort((a, b) => (a.proposedStartDate!.getTime() - b.proposedStartDate!.getTime()))
      .slice(0, 5)
      .map(mapPlanToSummary);

    return {
      totalPlans: all.length,
      byStatus,
      byPriority,
      byFiscalYear: [...yearMap.entries()].map(([fiscalYear, count]) => ({ fiscalYear, count })).sort((a, b) => a.fiscalYear - b.fiscalYear),
      entityCoverage: {
        totalEntities,
        entitiesWithPlan: entityIdsWithPlan.size,
        coveragePct,
      },
      upcomingAudits: upcoming,
      highPriorityCount: byPriority.CRITICAL + byPriority.HIGH,
      pendingApprovalCount: byStatus.IN_REVIEW,
    };
  }
}
