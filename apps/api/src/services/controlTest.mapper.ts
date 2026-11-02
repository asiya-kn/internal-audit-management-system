import type { ControlTestWithRelations } from '../repositories/controlTest.repository.js';
import type { ControlTestSummaryDto, ControlTestDetailDto } from '@iams/shared';

function userName(user: ControlTestWithRelations['tester']): string | null {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
}

export function mapControlTestToSummary(t: ControlTestWithRelations): ControlTestSummaryDto {
  return {
    id: t.id,
    reference: t.reference,
    title: t.title,
    engagementId: t.engagementId,
    engagementReference: t.engagement?.reference ?? null,
    auditEntityId: t.auditEntityId,
    auditEntityCode: t.auditEntity?.code ?? null,
    auditEntityName: t.auditEntity?.name ?? null,
    riskId: t.riskId,
    riskTitle: t.risk?.title ?? null,
    controlReference: t.controlReference,
    status: t.status,
    outcome: t.outcome,
    testerId: t.testerId,
    testerName: userName(t.tester),
    reviewerId: t.reviewerId,
    reviewerName: userName(t.reviewer),
    testedAt: t.testedAt?.toISOString() ?? null,
    reviewedAt: t.reviewedAt?.toISOString() ?? null,
    findingId: t.findingId,
    findingReference: t.finding?.reference ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function mapControlTestToDetail(t: ControlTestWithRelations): ControlTestDetailDto {
  return {
    ...mapControlTestToSummary(t),
    objective: t.objective,
    procedures: t.procedures,
    criteria: t.criteria,
    sampleDescription: t.sampleDescription,
    sampleSize: t.sampleSize,
    expectedResult: t.expectedResult,
    actualResult: t.actualResult,
    exceptions: t.exceptions,
    conclusion: t.conclusion,
    evidenceReference: t.evidenceReference,
    testerNotes: t.testerNotes,
    reviewerNotes: t.reviewerNotes,
    createdById: t.createdById,
    createdByName: userName(t.createdBy),
  };
}
