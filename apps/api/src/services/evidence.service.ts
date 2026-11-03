import { prisma } from '../config/db.js';
import { EvidenceRepository } from '../repositories/evidence.repository.js';
import { mapToSummary, mapToDetail } from './evidence.mapper.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../utils/errors.js';
import type {
  EvidenceSummaryDto,
  EvidenceDetailDto,
  CreateEvidenceInput,
  UpdateEvidenceInput,
  ListEvidenceInput,
  EvidenceReviewStatus,
  EvidenceDashboardDto,
  EvidenceType,
} from '@iams/shared';
import type { Prisma } from '../generated/client/index.js';

const SORT_COLUMNS = [
  'reference',
  'title',
  'evidenceType',
  'reviewStatus',
  'collectionDate',
  'createdAt',
  'updatedAt',
] as const;

type SortColumn = (typeof SORT_COLUMNS)[number];

const ALL_REVIEW_STATUSES: EvidenceReviewStatus[] = [
  'DRAFT',
  'IN_REVIEW',
  'REVISION_REQUESTED',
  'ACCEPTED',
  'REJECTED',
];

const ALL_EVIDENCE_TYPES: EvidenceType[] = [
  'WORKING_PAPER',
  'DOCUMENT',
  'EMAIL',
  'SCREENSHOT',
  'DATA_FILE',
  'REPORT',
  'INTERVIEW_NOTE',
  'MEMO',
  'OTHER',
];

export class EvidenceService {
  constructor(
    private readonly repo: EvidenceRepository = new EvidenceRepository(),
  ) {}

  async list(
    input: ListEvidenceInput,
  ): Promise<{ items: EvidenceSummaryDto[]; total: number; page: number; pageSize: number }> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const {
      sortBy,
      sortOrder,
      search,
      engagementId,
      controlTestId,
      findingId,
      actionPlanId,
      auditEntityId,
      evidenceType,
      reviewStatus,
      submittedById,
      reviewerId,
    } = input;

    const where: Prisma.EvidenceWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (engagementId) where.engagementId = engagementId;
    if (controlTestId) where.controlTestId = controlTestId;
    if (findingId) where.findingId = findingId;
    if (actionPlanId) where.actionPlanId = actionPlanId;
    if (auditEntityId) where.auditEntityId = auditEntityId;
    if (evidenceType) where.evidenceType = evidenceType;
    if (reviewStatus) where.reviewStatus = reviewStatus;
    if (submittedById) where.submittedById = submittedById;
    if (reviewerId) where.reviewerId = reviewerId;

    const sortCol: SortColumn = sortBy && (SORT_COLUMNS as readonly string[]).includes(sortBy)
      ? (sortBy as SortColumn)
      : 'createdAt';
    const orderBy: Prisma.EvidenceOrderByWithRelationInput = {
      [sortCol]: sortOrder === 'desc' ? 'desc' : 'asc',
    };

    const [items, total] = await Promise.all([
      this.repo.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.repo.count({ where }),
    ]);

    return {
      items: items.map(mapToSummary),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<EvidenceDetailDto> {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundError('Evidence record not found');
    return mapToDetail(entity);
  }

  async create(input: CreateEvidenceInput, userId: string): Promise<EvidenceDetailDto> {
    const existing = await this.repo.findByReference(input.reference);
    if (existing) {
      throw new ConflictError(`Evidence with reference "${input.reference}" already exists`);
    }

    await this.validateForeignKeys(input);

    const data: Prisma.EvidenceCreateInput = {
      reference: input.reference,
      title: input.title,
      description: input.description,
      evidenceType: input.evidenceType ?? 'WORKING_PAPER',
      source: input.source,
      collectionDate: input.collectionDate ? new Date(input.collectionDate) : null,
      documentReference: input.documentReference,
      notes: input.notes,
      reviewStatus: 'DRAFT',
      submittedBy: input.submittedById ? { connect: { id: input.submittedById } } : undefined,
      reviewer: input.reviewerId ? { connect: { id: input.reviewerId } } : undefined,
      engagement: input.engagementId ? { connect: { id: input.engagementId } } : undefined,
      controlTest: input.controlTestId ? { connect: { id: input.controlTestId } } : undefined,
      finding: input.findingId ? { connect: { id: input.findingId } } : undefined,
      actionPlan: input.actionPlanId ? { connect: { id: input.actionPlanId } } : undefined,
      auditEntity: input.auditEntityId ? { connect: { id: input.auditEntityId } } : undefined,
      createdBy: { connect: { id: userId } },
      updatedBy: { connect: { id: userId } },
    };

    const created = await this.repo.create(data);
    return mapToDetail(created);
  }

  async update(id: string, input: UpdateEvidenceInput, userId: string): Promise<EvidenceDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Evidence record not found');

    await this.validateForeignKeys(input);

    const data: Prisma.EvidenceUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.evidenceType !== undefined) data.evidenceType = input.evidenceType;
    if (input.source !== undefined) data.source = input.source;
    if (input.collectionDate !== undefined) data.collectionDate = input.collectionDate ? new Date(input.collectionDate) : null;
    if (input.documentReference !== undefined) data.documentReference = input.documentReference;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.submittedById !== undefined) {
      data.submittedBy = input.submittedById ? { connect: { id: input.submittedById } } : { disconnect: true };
    }
    if (input.reviewerId !== undefined) {
      data.reviewer = input.reviewerId ? { connect: { id: input.reviewerId } } : { disconnect: true };
    }
    if (input.engagementId !== undefined) {
      data.engagement = input.engagementId ? { connect: { id: input.engagementId } } : { disconnect: true };
    }
    if (input.controlTestId !== undefined) {
      data.controlTest = input.controlTestId ? { connect: { id: input.controlTestId } } : { disconnect: true };
    }
    if (input.findingId !== undefined) {
      data.finding = input.findingId ? { connect: { id: input.findingId } } : { disconnect: true };
    }
    if (input.actionPlanId !== undefined) {
      data.actionPlan = input.actionPlanId ? { connect: { id: input.actionPlanId } } : { disconnect: true };
    }
    if (input.auditEntityId !== undefined) {
      data.auditEntity = input.auditEntityId ? { connect: { id: input.auditEntityId } } : { disconnect: true };
    }
    data.updatedBy = { connect: { id: userId } };

    const updated = await this.repo.update(id, data);
    return mapToDetail(updated);
  }

  async review(
    id: string,
    reviewStatus: EvidenceReviewStatus,
    reviewComments: string | undefined,
    userId: string,
  ): Promise<EvidenceDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Evidence record not found');

    const updated = await this.repo.update(id, {
      reviewStatus,
      reviewComments: reviewComments ?? existing.reviewComments,
      reviewedAt: new Date(),
      reviewer: { connect: { id: userId } },
      updatedBy: { connect: { id: userId } },
    });
    return mapToDetail(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Evidence record not found');
    await this.repo.delete(id);
  }

  async getDashboard(): Promise<EvidenceDashboardDto> {
    const [total, byStatusRaw, byTypeRaw, linkedCounts, recent] = await Promise.all([
      prisma.evidence.count(),
      prisma.evidence.groupBy({ by: ['reviewStatus'], _count: true }),
      prisma.evidence.groupBy({ by: ['evidenceType'], _count: true }),
      Promise.all([
        prisma.evidence.count({ where: { engagementId: { not: null } } }),
        prisma.evidence.count({ where: { controlTestId: { not: null } } }),
        prisma.evidence.count({ where: { findingId: { not: null } } }),
        prisma.evidence.count({ where: { actionPlanId: { not: null } } }),
      ]),
      prisma.evidence.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          engagement: { select: { id: true, reference: true } },
          controlTest: { select: { id: true, reference: true } },
          finding: { select: { id: true, reference: true } },
          actionPlan: { select: { id: true, reference: true } },
          auditEntity: { select: { id: true, code: true, name: true } },
          submittedBy: { select: { id: true, firstName: true, lastName: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          updatedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    const byReviewStatus = Object.fromEntries(
      ALL_REVIEW_STATUSES.map((s) => [s, 0]),
    ) as Record<EvidenceReviewStatus, number>;
    for (const r of byStatusRaw) {
      byReviewStatus[r.reviewStatus] = r._count;
    }

    const byEvidenceType: Partial<Record<EvidenceType, number>> = {};
    for (const r of byTypeRaw) {
      byEvidenceType[r.evidenceType] = r._count;
    }

    const [linkedToEngagement, linkedToControlTest, linkedToFinding, linkedToActionPlan] = linkedCounts;

    return {
      totalEvidence: total,
      byReviewStatus,
      byEvidenceType,
      draftCount: byReviewStatus.DRAFT,
      inReviewCount: byReviewStatus.IN_REVIEW,
      acceptedCount: byReviewStatus.ACCEPTED,
      rejectedCount: byReviewStatus.REJECTED,
      revisionRequestedCount: byReviewStatus.REVISION_REQUESTED,
      linkedToEngagement,
      linkedToControlTest,
      linkedToFinding,
      linkedToActionPlan,
      pendingReviewCount: byReviewStatus.IN_REVIEW + byReviewStatus.REVISION_REQUESTED,
      recentEvidence: recent.map(mapToSummary),
    };
  }

  private async validateForeignKeys(
    input: Partial<CreateEvidenceInput> | UpdateEvidenceInput,
  ): Promise<void> {
    if (input.engagementId) {
      const e = await prisma.engagement.findUnique({ where: { id: input.engagementId }, select: { id: true } });
      if (!e) throw new ValidationError('The specified engagement does not exist', { engagementId: input.engagementId });
    }
    if (input.controlTestId) {
      const e = await prisma.controlTest.findUnique({ where: { id: input.controlTestId }, select: { id: true } });
      if (!e) throw new ValidationError('The specified control test does not exist', { controlTestId: input.controlTestId });
    }
    if (input.findingId) {
      const e = await prisma.finding.findUnique({ where: { id: input.findingId }, select: { id: true } });
      if (!e) throw new ValidationError('The specified finding does not exist', { findingId: input.findingId });
    }
    if (input.actionPlanId) {
      const e = await prisma.actionPlan.findUnique({ where: { id: input.actionPlanId }, select: { id: true } });
      if (!e) throw new ValidationError('The specified action plan does not exist', { actionPlanId: input.actionPlanId });
    }
    if (input.auditEntityId) {
      const e = await prisma.auditUniverse.findUnique({ where: { id: input.auditEntityId }, select: { id: true } });
      if (!e) throw new ValidationError('The specified audit entity does not exist', { auditEntityId: input.auditEntityId });
    }
    if (input.submittedById) {
      const e = await prisma.user.findUnique({ where: { id: input.submittedById }, select: { id: true } });
      if (!e) throw new ValidationError('The specified submitter does not exist', { submittedById: input.submittedById });
    }
    if (input.reviewerId) {
      const e = await prisma.user.findUnique({ where: { id: input.reviewerId }, select: { id: true } });
      if (!e) throw new ValidationError('The specified reviewer does not exist', { reviewerId: input.reviewerId });
    }
  }
}
