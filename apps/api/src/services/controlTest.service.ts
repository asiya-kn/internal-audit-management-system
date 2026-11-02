import { prisma } from '../config/db.js';
import { ControlTestRepository } from '../repositories/controlTest.repository.js';
import { mapControlTestToSummary, mapControlTestToDetail } from './controlTest.mapper.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import {
  canTransitionControlTest,
  type ControlTestStatus,
  type ControlTestOutcome,
  type ControlTestDashboardDto,
} from '@iams/shared';
import type { Prisma } from '../generated/client/index.js';
import type {
  ControlTestSummaryDto,
  ControlTestDetailDto,
  CreateControlTestInput,
  UpdateControlTestInput,
  ListControlTestInput,
  RecordControlTestResultInput,
  ReviewControlTestInput,
} from './controlTest.types.js';

const SORT_COLUMNS = [
  'title',
  'reference',
  'status',
  'outcome',
  'testedAt',
  'reviewedAt',
  'createdAt',
  'updatedAt',
] as const;

type SortColumn = (typeof SORT_COLUMNS)[number];

const STATUS_LABELS: Record<ControlTestStatus, string> = {
  PLANNED: 'Planned', IN_PROGRESS: 'In Progress', TESTED: 'Tested',
  REVIEWED: 'Reviewed', EXCEPTION: 'Exception', CANCELLED: 'Cancelled',
};

async function validateEngagement(id: string): Promise<void> {
  const eng = await prisma.engagement.findUnique({ where: { id } });
  if (!eng) throw new ValidationError('The specified engagement does not exist', { engagementId: id });
}

async function validateEntity(id: string): Promise<void> {
  const entity = await prisma.auditUniverse.findUnique({ where: { id } });
  if (!entity) throw new ValidationError('The specified audit entity does not exist', { auditEntityId: id });
}

async function validateRisk(id: string): Promise<void> {
  const risk = await prisma.risk.findUnique({ where: { id } });
  if (!risk) throw new ValidationError('The specified risk does not exist', { riskId: id });
}

async function validateUser(id: string, field: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ValidationError(`The specified ${field} does not exist`, { [field]: id });
}

async function validateFinding(id: string): Promise<void> {
  const finding = await prisma.finding.findUnique({ where: { id } });
  if (!finding) throw new ValidationError('The specified finding does not exist', { findingId: id });
}

export class ControlTestService {
  constructor(
    private readonly repo: ControlTestRepository = new ControlTestRepository(),
  ) {}

  async list(input: ListControlTestInput): Promise<{ items: ControlTestSummaryDto[]; total: number; page: number; pageSize: number }> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const { sortBy, sortOrder, search, engagementId, auditEntityId, riskId, status, outcome, testerId, reviewerId, findingId } = input;

    const where: Prisma.ControlTestWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { controlReference: { contains: search, mode: 'insensitive' } },
        { auditEntity: { name: { contains: search, mode: 'insensitive' } } },
        { auditEntity: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (engagementId) where.engagementId = engagementId;
    if (auditEntityId) where.auditEntityId = auditEntityId;
    if (riskId) where.riskId = riskId;
    if (status) where.status = status;
    if (outcome) where.outcome = outcome;
    if (testerId) where.testerId = testerId;
    if (reviewerId) where.reviewerId = reviewerId;
    if (findingId) where.findingId = findingId;

    const sortCol: SortColumn = sortBy && (SORT_COLUMNS as readonly string[]).includes(sortBy)
      ? (sortBy as SortColumn)
      : 'createdAt';
    const orderBy: Prisma.ControlTestOrderByWithRelationInput = {
      [sortCol]: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const [items, total] = await Promise.all([
      this.repo.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.repo.count(where),
    ]);

    return { items: items.map(mapControlTestToSummary), total, page, pageSize };
  }

  async getById(id: string): Promise<ControlTestDetailDto> {
    const test = await this.repo.findById(id);
    if (!test) throw new NotFoundError('Control test not found');
    return mapControlTestToDetail(test);
  }

  async create(input: CreateControlTestInput, userId: string): Promise<ControlTestDetailDto> {
    const existing = await this.repo.findByReference(input.reference);
    if (existing) throw new ConflictError(`A control test with reference "${input.reference}" already exists`);

    if (input.engagementId) await validateEngagement(input.engagementId);
    if (input.auditEntityId) await validateEntity(input.auditEntityId);
    if (input.riskId) await validateRisk(input.riskId);
    if (input.testerId) await validateUser(input.testerId, 'testerId');

    const data: Prisma.ControlTestCreateInput = {
      reference: input.reference,
      title: input.title,
      engagement: input.engagementId ? { connect: { id: input.engagementId } } : undefined,
      auditEntity: input.auditEntityId ? { connect: { id: input.auditEntityId } } : undefined,
      risk: input.riskId ? { connect: { id: input.riskId } } : undefined,
      controlReference: input.controlReference,
      objective: input.objective,
      procedures: input.procedures,
      criteria: input.criteria,
      sampleDescription: input.sampleDescription,
      sampleSize: input.sampleSize,
      expectedResult: input.expectedResult,
      tester: input.testerId ? { connect: { id: input.testerId } } : undefined,
      createdBy: { connect: { id: userId } },
      updatedBy: { connect: { id: userId } },
    };

    const created = await this.repo.create(data);
    return mapControlTestToDetail(created);
  }

  async update(id: string, input: UpdateControlTestInput, userId: string): Promise<ControlTestDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Control test not found');

    if (existing.status === 'REVIEWED' || existing.status === 'CANCELLED') {
      throw new ValidationError(`Cannot edit a control test that is ${STATUS_LABELS[existing.status].toLowerCase()}`);
    }

    if (input.engagementId !== undefined && input.engagementId !== null && input.engagementId !== existing.engagementId) {
      await validateEngagement(input.engagementId);
    }
    if (input.auditEntityId !== undefined && input.auditEntityId !== null && input.auditEntityId !== existing.auditEntityId) {
      await validateEntity(input.auditEntityId);
    }
    if (input.riskId !== undefined && input.riskId !== null && input.riskId !== existing.riskId) {
      await validateRisk(input.riskId);
    }
    if (input.testerId !== undefined && input.testerId !== null && input.testerId !== existing.testerId) {
      await validateUser(input.testerId, 'testerId');
    }

    const data: Prisma.ControlTestUpdateInput = {
      updatedBy: { connect: { id: userId } },
    };

    if (input.title !== undefined) data.title = input.title;
    if (input.engagementId !== undefined) data.engagement = input.engagementId ? { connect: { id: input.engagementId } } : { disconnect: true };
    if (input.auditEntityId !== undefined) data.auditEntity = input.auditEntityId ? { connect: { id: input.auditEntityId } } : { disconnect: true };
    if (input.riskId !== undefined) data.risk = input.riskId ? { connect: { id: input.riskId } } : { disconnect: true };
    if (input.controlReference !== undefined) data.controlReference = input.controlReference;
    if (input.objective !== undefined) data.objective = input.objective;
    if (input.procedures !== undefined) data.procedures = input.procedures;
    if (input.criteria !== undefined) data.criteria = input.criteria;
    if (input.sampleDescription !== undefined) data.sampleDescription = input.sampleDescription;
    if (input.sampleSize !== undefined) data.sampleSize = input.sampleSize;
    if (input.expectedResult !== undefined) data.expectedResult = input.expectedResult;
    if (input.testerId !== undefined) data.tester = input.testerId ? { connect: { id: input.testerId } } : { disconnect: true };

    const updated = await this.repo.update(id, data);
    return mapControlTestToDetail(updated);
  }

  async recordResult(
    id: string,
    input: RecordControlTestResultInput,
    userId: string,
  ): Promise<ControlTestDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Control test not found');

    if (existing.status !== 'IN_PROGRESS' && existing.status !== 'TESTED' && existing.status !== 'EXCEPTION') {
      throw new ValidationError(`Cannot record results for a control test that is ${STATUS_LABELS[existing.status].toLowerCase()}`);
    }

    const data: Prisma.ControlTestUpdateInput = {
      actualResult: input.actualResult,
      outcome: input.outcome as ControlTestOutcome,
      status: 'TESTED',
      testedAt: input.testedAt ? new Date(input.testedAt) : new Date(),
      tester: { connect: { id: existing.testerId ?? userId } },
      updatedBy: { connect: { id: userId } },
    };

    if (input.exceptions !== undefined) data.exceptions = input.exceptions;
    if (input.conclusion !== undefined) data.conclusion = input.conclusion;
    if (input.evidenceReference !== undefined) data.evidenceReference = input.evidenceReference;
    if (input.testerNotes !== undefined) data.testerNotes = input.testerNotes;

    const updated = await this.repo.update(id, data);
    return mapControlTestToDetail(updated);
  }

  async review(
    id: string,
    input: ReviewControlTestInput,
    userId: string,
  ): Promise<ControlTestDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Control test not found');

    if (existing.status !== 'TESTED' && existing.status !== 'EXCEPTION') {
      throw new ValidationError(`Cannot review a control test that is ${STATUS_LABELS[existing.status].toLowerCase()}`);
    }

    const data: Prisma.ControlTestUpdateInput = {
      status: 'REVIEWED',
      reviewer: { connect: { id: userId } },
      reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : new Date(),
      updatedBy: { connect: { id: userId } },
    };

    if (input.reviewerNotes !== undefined) data.reviewerNotes = input.reviewerNotes;

    const updated = await this.repo.update(id, data);
    return mapControlTestToDetail(updated);
  }

  async linkFinding(id: string, findingId: string, userId: string): Promise<ControlTestDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Control test not found');

    await validateFinding(findingId);

    const data: Prisma.ControlTestUpdateInput = {
      finding: { connect: { id: findingId } },
      updatedBy: { connect: { id: userId } },
    };

    const updated = await this.repo.update(id, data);
    return mapControlTestToDetail(updated);
  }

  async unlinkFinding(id: string, userId: string): Promise<ControlTestDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Control test not found');

    const data: Prisma.ControlTestUpdateInput = {
      finding: { disconnect: true },
      updatedBy: { connect: { id: userId } },
    };

    const updated = await this.repo.update(id, data);
    return mapControlTestToDetail(updated);
  }

  async transition(
    id: string,
    newStatus: ControlTestStatus,
    userId: string,
  ): Promise<ControlTestDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Control test not found');

    if (!canTransitionControlTest(existing.status, newStatus)) {
      throw new ValidationError(`Cannot transition from ${STATUS_LABELS[existing.status]} to ${STATUS_LABELS[newStatus]}`);
    }

    const data: Prisma.ControlTestUpdateInput = {
      status: newStatus,
      updatedBy: { connect: { id: userId } },
    };

    const updated = await this.repo.update(id, data);
    return mapControlTestToDetail(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Control test not found');

    if (existing.status !== 'PLANNED' && existing.status !== 'CANCELLED') {
      throw new ValidationError('Only planned or cancelled control tests can be deleted');
    }

    await this.repo.delete(id);
  }

  async getDashboard(): Promise<ControlTestDashboardDto> {
    const all = await this.repo.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const byStatus: Record<ControlTestStatus, number> = {
      PLANNED: 0, IN_PROGRESS: 0, TESTED: 0, REVIEWED: 0, EXCEPTION: 0, CANCELLED: 0,
    };
    const byOutcome: Record<ControlTestOutcome, number> = {
      PASS: 0, FAIL: 0, PASS_WITH_EXCEPTION: 0, NOT_APPLICABLE: 0, INCONCLUSIVE: 0,
    };

    let linkedFindingsCount = 0;

    for (const t of all) {
      byStatus[t.status]++;
      if (t.outcome) byOutcome[t.outcome]++;
      if (t.findingId) linkedFindingsCount++;
    }

    return {
      totalTests: all.length,
      byStatus,
      byOutcome,
      passCount: byOutcome.PASS + byOutcome.PASS_WITH_EXCEPTION,
      failCount: byOutcome.FAIL,
      exceptionCount: byStatus.EXCEPTION,
      pendingReviewCount: byStatus.TESTED,
      linkedFindingsCount,
      recentTests: all.slice(0, 5).map(mapControlTestToSummary),
    };
  }
}
