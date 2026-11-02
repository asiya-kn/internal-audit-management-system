import { prisma } from '../config/db.js';
import { ActionPlanRepository } from '../repositories/actionPlan.repository.js';
import { mapActionPlanToSummary, mapActionPlanToDetail } from './actionPlan.mapper.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import {
  canTransitionActionPlan,
  type ActionPlanStatus,
  type ActionPlanPriority,
  type ActionPlanDashboardDto,
} from '@iams/shared';
import type { Prisma } from '../generated/client/index.js';
import type {
  ActionPlanSummaryDto,
  ActionPlanDetailDto,
  CreateActionPlanInput,
  UpdateActionPlanInput,
  ListActionPlanInput,
  AddProgressUpdateInput,
  VerifyActionPlanInput,
} from './actionPlan.types.js';

const SORT_COLUMNS = [
  'title',
  'reference',
  'status',
  'priority',
  'targetDate',
  'progressPct',
  'createdAt',
  'updatedAt',
] as const;

type SortColumn = (typeof SORT_COLUMNS)[number];

const STATUS_LABELS: Record<ActionPlanStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', PENDING_VERIFICATION: 'Pending Verification',
  COMPLETED: 'Completed', OVERDUE: 'Overdue', CANCELLED: 'Cancelled',
};

async function validateUser(id: string, field: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ValidationError(`The specified ${field} does not exist`, { [field]: id });
}

async function validateFinding(id: string): Promise<void> {
  const f = await prisma.finding.findUnique({ where: { id } });
  if (!f) throw new ValidationError('The specified finding does not exist', { findingId: id });
}

async function validateControlTest(id: string): Promise<void> {
  const t = await prisma.controlTest.findUnique({ where: { id } });
  if (!t) throw new ValidationError('The specified control test does not exist', { controlTestId: id });
}

async function validateEngagement(id: string): Promise<void> {
  const e = await prisma.engagement.findUnique({ where: { id } });
  if (!e) throw new ValidationError('The specified engagement does not exist', { engagementId: id });
}

async function validateEntity(id: string): Promise<void> {
  const a = await prisma.auditUniverse.findUnique({ where: { id } });
  if (!a) throw new ValidationError('The specified audit entity does not exist', { auditEntityId: id });
}

export class ActionPlanService {
  constructor(
    private readonly repo: ActionPlanRepository = new ActionPlanRepository(),
  ) {}

  async list(input: ListActionPlanInput): Promise<{ items: ActionPlanSummaryDto[]; total: number; page: number; pageSize: number }> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const { sortBy, sortOrder, search, findingId, controlTestId, engagementId, auditEntityId, status, priority, responsibleOwnerId, overdue } = input;

    const where: Prisma.ActionPlanWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { auditEntity: { name: { contains: search, mode: 'insensitive' } } },
        { auditEntity: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (findingId) where.findingId = findingId;
    if (controlTestId) where.controlTestId = controlTestId;
    if (engagementId) where.engagementId = engagementId;
    if (auditEntityId) where.auditEntityId = auditEntityId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (responsibleOwnerId) where.responsibleOwnerId = responsibleOwnerId;

    if (overdue === true || overdue === 'true') {
      where.targetDate = { lt: new Date() };
      where.status = { notIn: ['COMPLETED', 'CANCELLED', 'PENDING_VERIFICATION'] };
    }

    const sortCol: SortColumn = sortBy && (SORT_COLUMNS as readonly string[]).includes(sortBy)
      ? (sortBy as SortColumn)
      : 'createdAt';
    const orderBy: Prisma.ActionPlanOrderByWithRelationInput = {
      [sortCol]: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const [items, total] = await Promise.all([
      this.repo.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.repo.count(where),
    ]);

    return { items: items.map(mapActionPlanToSummary), total, page, pageSize };
  }

  async getById(id: string): Promise<ActionPlanDetailDto> {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundError('Action plan not found');
    return mapActionPlanToDetail(plan);
  }

  async create(input: CreateActionPlanInput, userId: string): Promise<ActionPlanDetailDto> {
    const existing = await this.repo.findByReference(input.reference);
    if (existing) throw new ConflictError(`An action plan with reference "${input.reference}" already exists`);

    if (input.findingId) await validateFinding(input.findingId);
    if (input.controlTestId) await validateControlTest(input.controlTestId);
    if (input.engagementId) await validateEngagement(input.engagementId);
    if (input.auditEntityId) await validateEntity(input.auditEntityId);
    if (input.responsibleOwnerId) await validateUser(input.responsibleOwnerId, 'responsible owner');
    if (input.reviewerId) await validateUser(input.reviewerId, 'reviewer');

    const data: Prisma.ActionPlanCreateInput = {
      reference: input.reference,
      title: input.title,
      description: input.description,
      finding: input.findingId ? { connect: { id: input.findingId } } : undefined,
      controlTest: input.controlTestId ? { connect: { id: input.controlTestId } } : undefined,
      engagement: input.engagementId ? { connect: { id: input.engagementId } } : undefined,
      auditEntity: input.auditEntityId ? { connect: { id: input.auditEntityId } } : undefined,
      responsibleOwner: input.responsibleOwnerId ? { connect: { id: input.responsibleOwnerId } } : undefined,
      reviewer: input.reviewerId ? { connect: { id: input.reviewerId } } : undefined,
      priority: (input.priority ?? 'MEDIUM') as ActionPlanPriority,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      managementJustification: input.managementJustification,
      proposedRectification: input.proposedRectification,
      createdBy: { connect: { id: userId } },
      updatedBy: { connect: { id: userId } },
    };

    const created = await this.repo.create(data);
    return mapActionPlanToDetail(created);
  }

  async update(id: string, input: UpdateActionPlanInput, userId: string): Promise<ActionPlanDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Action plan not found');

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new ValidationError(`Cannot edit an action plan that is ${STATUS_LABELS[existing.status].toLowerCase()}`);
    }

    if (input.findingId !== undefined && input.findingId !== null && input.findingId !== existing.findingId) {
      await validateFinding(input.findingId);
    }
    if (input.controlTestId !== undefined && input.controlTestId !== null && input.controlTestId !== existing.controlTestId) {
      await validateControlTest(input.controlTestId);
    }
    if (input.engagementId !== undefined && input.engagementId !== null && input.engagementId !== existing.engagementId) {
      await validateEngagement(input.engagementId);
    }
    if (input.auditEntityId !== undefined && input.auditEntityId !== null && input.auditEntityId !== existing.auditEntityId) {
      await validateEntity(input.auditEntityId);
    }
    if (input.responsibleOwnerId !== undefined && input.responsibleOwnerId !== null && input.responsibleOwnerId !== existing.responsibleOwnerId) {
      await validateUser(input.responsibleOwnerId, 'responsible owner');
    }
    if (input.reviewerId !== undefined && input.reviewerId !== null && input.reviewerId !== existing.reviewerId) {
      await validateUser(input.reviewerId, 'reviewer');
    }

    const data: Prisma.ActionPlanUpdateInput = {
      updatedBy: { connect: { id: userId } },
    };

    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.findingId !== undefined) data.finding = input.findingId ? { connect: { id: input.findingId } } : { disconnect: true };
    if (input.controlTestId !== undefined) data.controlTest = input.controlTestId ? { connect: { id: input.controlTestId } } : { disconnect: true };
    if (input.engagementId !== undefined) data.engagement = input.engagementId ? { connect: { id: input.engagementId } } : { disconnect: true };
    if (input.auditEntityId !== undefined) data.auditEntity = input.auditEntityId ? { connect: { id: input.auditEntityId } } : { disconnect: true };
    if (input.responsibleOwnerId !== undefined) data.responsibleOwner = input.responsibleOwnerId ? { connect: { id: input.responsibleOwnerId } } : { disconnect: true };
    if (input.reviewerId !== undefined) data.reviewer = input.reviewerId ? { connect: { id: input.reviewerId } } : { disconnect: true };
    if (input.priority !== undefined) data.priority = input.priority as ActionPlanPriority;
    if (input.targetDate !== undefined) data.targetDate = input.targetDate ? new Date(input.targetDate) : null;
    if (input.managementJustification !== undefined) data.managementJustification = input.managementJustification;
    if (input.proposedRectification !== undefined) data.proposedRectification = input.proposedRectification;

    const updated = await this.repo.update(id, data);
    return mapActionPlanToDetail(updated);
  }

  async addProgressUpdate(id: string, input: AddProgressUpdateInput, userId: string): Promise<ActionPlanDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Action plan not found');

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new ValidationError(`Cannot add updates to an action plan that is ${STATUS_LABELS[existing.status].toLowerCase()}`);
    }

    const progressPct = input.progressPct !== undefined
      ? Math.max(0, Math.min(100, input.progressPct))
      : existing.progressPct;

    const data: Prisma.ActionPlanUpdateInput = {
      progressPct,
      updatedBy: { connect: { id: userId } },
      updates: {
        create: {
          note: input.note,
          progressPct,
          updatedBy: { connect: { id: userId } },
        },
      },
    };

    if (progressPct === 100 && existing.status !== 'PENDING_VERIFICATION') {
      data.status = 'PENDING_VERIFICATION';
    }

    const updated = await this.repo.update(id, data);
    return mapActionPlanToDetail(updated);
  }

  async verify(id: string, input: VerifyActionPlanInput, userId: string): Promise<ActionPlanDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Action plan not found');

    if (existing.status !== 'PENDING_VERIFICATION') {
      throw new ValidationError(`Cannot verify an action plan that is ${STATUS_LABELS[existing.status].toLowerCase()}`);
    }

    const data: Prisma.ActionPlanUpdateInput = {
      status: 'COMPLETED',
      completedAt: new Date(),
      verifiedAt: new Date(),
      verifiedBy: { connect: { id: userId } },
      updatedBy: { connect: { id: userId } },
    };

    if (input.verificationNotes !== undefined) data.verificationNotes = input.verificationNotes;

    const updated = await this.repo.update(id, data);
    return mapActionPlanToDetail(updated);
  }

  async transition(
    id: string,
    newStatus: ActionPlanStatus,
    userId: string,
  ): Promise<ActionPlanDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Action plan not found');

    if (!canTransitionActionPlan(existing.status, newStatus)) {
      throw new ValidationError(`Cannot transition from ${STATUS_LABELS[existing.status]} to ${STATUS_LABELS[newStatus]}`);
    }

    const data: Prisma.ActionPlanUpdateInput = {
      status: newStatus,
      updatedBy: { connect: { id: userId } },
    };

    if (newStatus === 'COMPLETED') {
      data.completedAt = new Date();
    }

    if (newStatus === 'CANCELLED' && existing.completedAt) {
      data.completedAt = null;
    }

    const updated = await this.repo.update(id, data);
    return mapActionPlanToDetail(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Action plan not found');

    if (existing.status !== 'OPEN' && existing.status !== 'CANCELLED') {
      throw new ValidationError('Only open or cancelled action plans can be deleted');
    }

    await this.repo.delete(id);
  }

  async getDashboard(): Promise<ActionPlanDashboardDto> {
    const all = await this.repo.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const byStatus: Record<ActionPlanStatus, number> = {
      OPEN: 0, IN_PROGRESS: 0, PENDING_VERIFICATION: 0, COMPLETED: 0, OVERDUE: 0, CANCELLED: 0,
    };
    const byPriority: Record<ActionPlanPriority, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0,
    };

    let overdueCount = 0;
    const now = new Date();

    for (const p of all) {
      byStatus[p.status]++;
      byPriority[p.priority]++;

      if (
        p.targetDate &&
        p.targetDate < now &&
        p.status !== 'COMPLETED' &&
        p.status !== 'CANCELLED' &&
        p.status !== 'PENDING_VERIFICATION'
      ) {
        overdueCount++;
      }
    }

    return {
      totalPlans: all.length,
      byStatus,
      byPriority,
      openCount: byStatus.OPEN,
      inProgressCount: byStatus.IN_PROGRESS,
      pendingVerificationCount: byStatus.PENDING_VERIFICATION,
      completedCount: byStatus.COMPLETED,
      overdueCount,
      recentPlans: all.slice(0, 5).map(mapActionPlanToSummary),
    };
  }
}
