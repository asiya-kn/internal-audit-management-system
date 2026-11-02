import type { AuditPlanWithRelations } from '../repositories/auditPlan.repository.js';
import type { AuditPlanSummaryDto, AuditPlanDetailDto } from '@iams/shared';

function userName(user: AuditPlanWithRelations['leadAuditor']): string | null {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
}

export function mapPlanToSummary(plan: AuditPlanWithRelations): AuditPlanSummaryDto {
  return {
    id: plan.id,
    reference: plan.reference,
    title: plan.title,
    fiscalYear: plan.fiscalYear,
    auditEntityId: plan.auditEntityId,
    auditEntityCode: plan.auditEntity.code,
    auditEntityName: plan.auditEntity.name,
    riskId: plan.riskId,
    riskTitle: plan.risk?.title ?? null,
    priority: plan.priority,
    status: plan.status,
    proposedStartDate: plan.proposedStartDate?.toISOString() ?? null,
    proposedEndDate: plan.proposedEndDate?.toISOString() ?? null,
    leadAuditorId: plan.leadAuditorId,
    leadAuditorName: userName(plan.leadAuditor),
    approvedById: plan.approvedById,
    approvedByName: userName(plan.approvedBy),
    approvedAt: plan.approvedAt?.toISOString() ?? null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function mapPlanToDetail(plan: AuditPlanWithRelations): AuditPlanDetailDto {
  return {
    ...mapPlanToSummary(plan),
    objectives: plan.objectives,
    scope: plan.scope,
    estimatedResources: plan.estimatedResources,
    planningRationale: plan.planningRationale,
    notes: plan.notes,
    riskInherentLevel: plan.risk?.inherentLevel ?? null,
    riskResidualLevel: plan.risk?.residualLevel ?? null,
  };
}
