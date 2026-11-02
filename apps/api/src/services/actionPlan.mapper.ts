import type { ActionPlanWithRelations } from '../repositories/actionPlan.repository.js';
import type { ActionPlanSummaryDto, ActionPlanDetailDto, ActionPlanUpdateDto } from '@iams/shared';

function userName(user: ActionPlanWithRelations['responsibleOwner']): string | null {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
}

function mapUpdate(u: ActionPlanWithRelations['updates'][number]): ActionPlanUpdateDto {
  return {
    id: u.id,
    actionPlanId: u.actionPlanId,
    note: u.note,
    progressPct: u.progressPct,
    updatedById: u.updatedById,
    updatedByName: userName(u.updatedBy),
    createdAt: u.createdAt.toISOString(),
  };
}

export function mapActionPlanToSummary(a: ActionPlanWithRelations): ActionPlanSummaryDto {
  const now = new Date();
  const isOverdue = Boolean(
    a.targetDate &&
    a.targetDate < now &&
    a.status !== 'COMPLETED' &&
    a.status !== 'CANCELLED' &&
    a.status !== 'PENDING_VERIFICATION',
  );

  return {
    id: a.id,
    reference: a.reference,
    title: a.title,
    description: a.description,
    findingId: a.findingId,
    findingReference: a.finding?.reference ?? null,
    findingTitle: a.finding?.title ?? null,
    controlTestId: a.controlTestId,
    controlTestReference: a.controlTest?.reference ?? null,
    engagementId: a.engagementId,
    engagementReference: a.engagement?.reference ?? null,
    auditEntityId: a.auditEntityId,
    auditEntityCode: a.auditEntity?.code ?? null,
    auditEntityName: a.auditEntity?.name ?? null,
    responsibleOwnerId: a.responsibleOwnerId,
    responsibleOwnerName: userName(a.responsibleOwner),
    reviewerId: a.reviewerId,
    reviewerName: userName(a.reviewer),
    priority: a.priority,
    status: a.status,
    targetDate: a.targetDate?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
    verifiedAt: a.verifiedAt?.toISOString() ?? null,
    progressPct: a.progressPct,
    isOverdue,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function mapActionPlanToDetail(a: ActionPlanWithRelations): ActionPlanDetailDto {
  return {
    ...mapActionPlanToSummary(a),
    managementJustification: a.managementJustification,
    proposedRectification: a.proposedRectification,
    completionEvidence: a.completionEvidence,
    verificationNotes: a.verificationNotes,
    createdById: a.createdById,
    createdByName: userName(a.createdBy),
    updates: a.updates.map(mapUpdate),
  };
}
