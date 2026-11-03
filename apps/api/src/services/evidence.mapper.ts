import type { EvidenceWithRelations } from '../repositories/evidence.repository.js';
import type {
  EvidenceSummaryDto,
  EvidenceDetailDto,
} from '@iams/shared';

function userName(user: EvidenceWithRelations['submittedBy']): string | null {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
}

export function mapToSummary(e: EvidenceWithRelations): EvidenceSummaryDto {
  return {
    id: e.id,
    reference: e.reference,
    title: e.title,
    evidenceType: e.evidenceType,
    source: e.source,
    engagementId: e.engagementId,
    engagementReference: e.engagement?.reference ?? null,
    controlTestId: e.controlTestId,
    controlTestReference: e.controlTest?.reference ?? null,
    findingId: e.findingId,
    findingReference: e.finding?.reference ?? null,
    actionPlanId: e.actionPlanId,
    actionPlanReference: e.actionPlan?.reference ?? null,
    auditEntityId: e.auditEntityId,
    auditEntityCode: e.auditEntity?.code ?? null,
    auditEntityName: e.auditEntity?.name ?? null,
    submittedById: e.submittedById,
    submittedByName: userName(e.submittedBy),
    reviewerId: e.reviewerId,
    reviewerName: userName(e.reviewer),
    reviewStatus: e.reviewStatus,
    reviewComments: e.reviewComments,
    reviewedAt: e.reviewedAt?.toISOString() ?? null,
    collectionDate: e.collectionDate?.toISOString() ?? null,
    documentReference: e.documentReference,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function mapToDetail(e: EvidenceWithRelations): EvidenceDetailDto {
  return {
    ...mapToSummary(e),
    description: e.description,
    documentMetadata: (e.documentMetadata as Record<string, unknown> | null) ?? null,
    notes: e.notes,
    createdById: e.createdById,
    createdByName: userName(e.createdBy),
  };
}
