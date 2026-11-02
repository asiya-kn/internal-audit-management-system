import type { EngagementWithRelations, TeamMemberWithRelations } from '../repositories/engagement.repository.js';
import type { EngagementSummaryDto, EngagementDetailDto, EngagementTeamMemberDto } from '@iams/shared';

function userName(user: EngagementWithRelations['leadAuditor']): string | null {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
}

export function mapTeamMemberToDto(tm: TeamMemberWithRelations): EngagementTeamMemberDto {
  return {
    engagementId: tm.engagementId,
    userId: tm.userId,
    userName: `${tm.user.firstName} ${tm.user.lastName}`.trim(),
    userEmail: tm.user.email,
    role: tm.role,
    assignedAt: tm.assignedAt.toISOString(),
  };
}

export function mapEngagementToSummary(eng: EngagementWithRelations): EngagementSummaryDto {
  return {
    id: eng.id,
    reference: eng.reference,
    title: eng.title,
    auditPlanId: eng.auditPlanId,
    auditPlanReference: eng.auditPlan?.reference ?? null,
    auditEntityId: eng.auditEntityId,
    auditEntityCode: eng.auditEntity.code,
    auditEntityName: eng.auditEntity.name,
    riskId: eng.riskId,
    riskTitle: eng.risk?.title ?? null,
    type: eng.type,
    status: eng.status,
    leadAuditorId: eng.leadAuditorId,
    leadAuditorName: userName(eng.leadAuditor),
    startDate: eng.startDate?.toISOString() ?? null,
    endDate: eng.endDate?.toISOString() ?? null,
    actualStartDate: eng.actualStartDate?.toISOString() ?? null,
    actualEndDate: eng.actualEndDate?.toISOString() ?? null,
    teamMemberCount: eng._count.teamMembers,
    createdAt: eng.createdAt.toISOString(),
    updatedAt: eng.updatedAt.toISOString(),
  };
}

export function mapEngagementToDetail(eng: EngagementWithRelations): EngagementDetailDto {
  return {
    ...mapEngagementToSummary(eng),
    objectives: eng.objectives,
    scope: eng.scope,
    methodology: eng.methodology,
    estimatedResources: eng.estimatedResources,
    closedAt: eng.closedAt?.toISOString() ?? null,
    closedById: eng.closedById,
    closedByName: userName(eng.closedBy),
    closureNotes: eng.closureNotes,
    riskInherentLevel: eng.risk?.inherentLevel ?? null,
    riskResidualLevel: eng.risk?.residualLevel ?? null,
    teamMembers: eng.teamMembers.map(mapTeamMemberToDto),
  };
}
