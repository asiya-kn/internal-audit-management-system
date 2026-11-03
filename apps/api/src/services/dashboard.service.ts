import { prisma } from '../config/db.js';
import type {
  DashboardMetricsResponse,
  DashboardFilters,
  KpiMetric,
  AnalyticsPanel,
  ChartDataPoint,
  PriorityItem,
  TrendPoint,
} from '@iams/shared';

function kpi(key: string, label: string, value: number, description: string): KpiMetric {
  return { key, label, value, availability: 'available', description };
}

function panel(key: string, title: string, description: string, chartType: AnalyticsPanel['chartType'], data: ChartDataPoint[]): AnalyticsPanel {
  return { key, title, availability: 'available', description, data, chartType };
}

export class DashboardService {
  async getMetrics(filters: DashboardFilters): Promise<DashboardMetricsResponse> {
    const fiscalYear = filters.reportingYear ? parseInt(filters.reportingYear, 10) : undefined;

    // Build where clauses from filters
    const engagementWhere: Record<string, unknown> = {};
    if (fiscalYear) {
      // Filter by year of startDate or proposedStartDate
      engagementWhere.OR = [
        { startDate: { gte: new Date(fiscalYear, 0, 1), lt: new Date(fiscalYear + 1, 0, 1) } },
        { auditPlan: { fiscalYear } },
      ];
    }
    if (filters.status) {
      engagementWhere.status = filters.status;
    }
    if (filters.auditOwner) {
      engagementWhere.leadAuditor = {
        OR: [
          { firstName: { contains: filters.auditOwner, mode: 'insensitive' } },
          { lastName: { contains: filters.auditOwner, mode: 'insensitive' } },
        ],
      };
    }

    const planWhere: Record<string, unknown> = {};
    if (fiscalYear) planWhere.fiscalYear = fiscalYear;

    const findingWhere: Record<string, unknown> = {};
    if (filters.status) findingWhere.status = filters.status;

    // Run all queries in parallel
    const [
      totalEntities, activeEntities, entitiesByType,
      totalRisks, highCriticalRisks, risksByInherent, risksByResidual,
      totalEngagements, plannedEngagements, completedEngagements, engagementsByStatus,
      totalFindings, openFindings, findingsBySeverity, findingsByStatus,
      totalActionPlans, openActionPlans, overdueActionPlans, completedActionPlans, actionsByStatus,
      totalControlTests, passingTests, failingTests, testsByOutcome,
      totalEvidence, evidenceInReview, acceptedEvidence, evidenceByReviewStatus,
      entitiesWithEngagements, entitiesWithControlTests,
      recentOverdueItems,
      distinctFiscalYears, distinctLeadAuditors,
    ] = await Promise.all([
      prisma.auditUniverse.count({ where: { status: { not: 'ARCHIVED' } } }),
      prisma.auditUniverse.count({ where: { status: 'ACTIVE' } }),
      prisma.auditUniverse.groupBy({ by: ['entityType'], _count: true, where: { status: { not: 'ARCHIVED' } } }),

      prisma.risk.count(),
      prisma.risk.count({ where: { inherentLevel: { in: ['HIGH', 'CRITICAL'] } } }),
      prisma.risk.groupBy({ by: ['inherentLevel'], _count: true }),
      prisma.risk.groupBy({ by: ['residualLevel'], _count: true }),

      prisma.engagement.count({ where: engagementWhere }),
      prisma.engagement.count({ where: { ...engagementWhere, status: 'PLANNED' } }),
      prisma.engagement.count({ where: { ...engagementWhere, status: 'COMPLETED' } }),
      prisma.engagement.groupBy({ by: ['status'], _count: true, where: engagementWhere }),

      prisma.finding.count({ where: findingWhere }),
      prisma.finding.count({ where: { ...findingWhere, status: { in: ['OPEN', 'MANAGEMENT_RESPONSE', 'ACTION_PLAN', 'REMEDIATED'] } } }),
      prisma.finding.groupBy({ by: ['severity'], _count: true, where: findingWhere }),
      prisma.finding.groupBy({ by: ['status'], _count: true, where: findingWhere }),

      prisma.actionPlan.count(),
      prisma.actionPlan.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.actionPlan.count({ where: { status: 'OVERDUE' } }),
      prisma.actionPlan.count({ where: { status: 'COMPLETED' } }),
      prisma.actionPlan.groupBy({ by: ['status'], _count: true }),

      prisma.controlTest.count(),
      prisma.controlTest.count({ where: { outcome: 'PASS' } }),
      prisma.controlTest.count({ where: { outcome: 'FAIL' } }),
      prisma.controlTest.groupBy({ by: ['outcome'], _count: true }),

      prisma.evidence.count(),
      prisma.evidence.count({ where: { reviewStatus: { in: ['IN_REVIEW', 'REVISION_REQUESTED'] } } }),
      prisma.evidence.count({ where: { reviewStatus: 'ACCEPTED' } }),
      prisma.evidence.groupBy({ by: ['reviewStatus'], _count: true }),

      prisma.auditUniverse.count({ where: { status: { not: 'ARCHIVED' }, engagements: { some: {} } } }),
      prisma.auditUniverse.count({ where: { status: { not: 'ARCHIVED' }, controlTests: { some: {} } } }),

      this.getPriorityItems(),

      prisma.auditPlan.findMany({ select: { fiscalYear: true }, distinct: ['fiscalYear'], orderBy: { fiscalYear: 'desc' } }),
      prisma.user.findMany({ where: { leadEngagements: { some: {} } }, select: { firstName: true, lastName: true }, distinct: ['id'] }),
    ]);

    // Assurance coverage
    const coveredEntities = new Set<string>();
    // We approximate: entities with engagements OR control tests are "covered"
    const coveragePct = activeEntities > 0
      ? Math.round(((entitiesWithEngagements + entitiesWithControlTests) / (activeEntities * 2)) * 100)
      : 0;

    // Build KPIs
    const kpis: KpiMetric[] = [
      kpi('audit_universe', 'Audit Universe', totalEntities, 'Total entities/processes in scope'),
      kpi('high_critical_risks', 'High/Critical Risks', highCriticalRisks, 'Risks rated high or critical'),
      kpi('audits_planned', 'Engagements Planned', plannedEngagements, 'Engagements in planned status'),
      kpi('audits_completed', 'Engagements Completed', completedEngagements, 'Engagements completed this period'),
      kpi('open_findings', 'Open Findings', openFindings, 'Findings not yet closed'),
      kpi('overdue_actions', 'Overdue Actions', overdueActionPlans, 'Corrective actions past due date'),
      kpi('evidence_in_review', 'Evidence in Review', evidenceInReview, 'Evidence pending review'),
      kpi('assurance_coverage', 'Assurance Coverage', coveragePct, 'Percentage of entities covered by assurance activities'),
    ];

    // Build panels
    const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const ENGAGEMENT_STATUSES = ['PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
    const FINDING_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const FINDING_STATUSES = ['DRAFT', 'OPEN', 'MANAGEMENT_RESPONSE', 'ACTION_PLAN', 'REMEDIATED', 'VERIFIED', 'CLOSED', 'CANCELLED'];
    const ACTION_STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'COMPLETED', 'OVERDUE', 'CANCELLED'];
    const CONTROL_OUTCOMES = ['PASS', 'FAIL', 'PASS_WITH_EXCEPTION', 'NOT_APPLICABLE', 'INCONCLUSIVE'];
    const EVIDENCE_STATUSES = ['DRAFT', 'IN_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'REJECTED'];

    const panels: AnalyticsPanel[] = [
      panel('universe_coverage', 'Audit Universe Coverage', 'Entities by type', 'bar',
        entitiesByType.map((r) => ({ label: r.entityType, value: r._count })),
      ),
      panel('risk_inherent', 'Risk Distribution (Inherent)', 'Risks by inherent level', 'bar',
        RISK_LEVELS.map((l) => ({ label: l, value: risksByInherent.find((r) => r.inherentLevel === l)?._count ?? 0 })),
      ),
      panel('risk_residual', 'Risk Distribution (Residual)', 'Risks by residual level', 'bar',
        RISK_LEVELS.map((l) => ({ label: l, value: risksByResidual.find((r) => r.residualLevel === l)?._count ?? 0 })),
      ),
      panel('engagement_status', 'Engagement Status', 'Engagements by status', 'pie',
        ENGAGEMENT_STATUSES.map((s) => ({ label: s, value: engagementsByStatus.find((r) => r.status === s)?._count ?? 0 })),
      ),
      panel('control_testing', 'Control Testing Outcomes', 'Tests by outcome', 'pie',
        CONTROL_OUTCOMES.map((o) => ({ label: o, value: testsByOutcome.find((r) => r.outcome === o)?._count ?? 0 })),
      ),
      panel('finding_severity', 'Findings by Severity', 'Findings grouped by severity', 'bar',
        FINDING_SEVERITIES.map((s) => ({ label: s, value: findingsBySeverity.find((r) => r.severity === s)?._count ?? 0 })),
      ),
      panel('action_status', 'Action Plans by Status', 'Corrective actions by status', 'bar',
        ACTION_STATUSES.map((s) => ({ label: s, value: actionsByStatus.find((r) => r.status === s)?._count ?? 0 })),
      ),
      panel('evidence_review', 'Evidence Review Status', 'Evidence by review status', 'pie',
        EVIDENCE_STATUSES.map((s) => ({ label: s, value: evidenceByReviewStatus.find((r) => r.reviewStatus === s)?._count ?? 0 })),
      ),
    ];

    // Trend: compute coverage over last 6 months using engagement completion data
    const trend = await this.getTrend();

    void coveredEntities;
    void totalRisks;
    void totalEngagements;
    void totalFindings;
    void totalActionPlans;
    void totalControlTests;
    void totalEvidence;
    void acceptedEvidence;
    void openActionPlans;
    void findingsByStatus;

    return {
      kpis,
      panels,
      priorityItems: recentOverdueItems,
      trend,
      filterOptions: {
        reportingYears: distinctFiscalYears.map((f) => String(f.fiscalYear)),
        auditCycles: [],
        riskAreas: RISK_LEVELS,
        auditOwners: distinctLeadAuditors.map((u) => `${u.firstName} ${u.lastName}`),
        statuses: ENGAGEMENT_STATUSES,
      },
    };
  }

  private async getPriorityItems(): Promise<PriorityItem[]> {
    const [overdueActions, criticalFindings] = await Promise.all([
      prisma.actionPlan.findMany({
        where: { status: { in: ['OVERDUE', 'OPEN', 'IN_PROGRESS'] }, targetDate: { lt: new Date() } },
        take: 10,
        orderBy: { targetDate: 'asc' },
        include: { responsibleOwner: { select: { firstName: true, lastName: true } } },
      }),
      prisma.finding.findMany({
        where: { severity: { in: ['CRITICAL', 'HIGH'] }, status: { in: ['OPEN', 'MANAGEMENT_RESPONSE', 'ACTION_PLAN'] } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { responsibleOwner: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const items: PriorityItem[] = [];

    for (const a of overdueActions) {
      items.push({
        id: a.id,
        reference: a.reference,
        title: a.title,
        owner: a.responsibleOwner ? `${a.responsibleOwner.firstName} ${a.responsibleOwner.lastName}` : '—',
        dueDate: a.targetDate?.toISOString() ?? null,
        priority: a.priority.toLowerCase() as PriorityItem['priority'],
        status: a.status === 'OVERDUE' ? 'overdue' : a.status === 'IN_PROGRESS' ? 'in_progress' : 'open',
        sourceModule: 'action-plans',
      });
    }

    for (const f of criticalFindings) {
      items.push({
        id: f.id,
        reference: f.reference,
        title: f.title,
        owner: f.responsibleOwner ? `${f.responsibleOwner.firstName} ${f.responsibleOwner.lastName}` : '—',
        dueDate: f.targetResolutionDate?.toISOString() ?? null,
        priority: f.severity.toLowerCase() as PriorityItem['priority'],
        status: f.status === 'OPEN' ? 'open' : 'pending',
        sourceModule: 'findings',
      });
    }

    // Sort: overdue first, then by due date
    return items.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return 0;
    }).slice(0, 10);
  }

  private async getTrend(): Promise<{ availability: 'available' | 'not_available'; data: TrendPoint[]; description: string }> {
    // Compute monthly coverage for the last 6 months
    const now = new Date();
    const months: { start: Date; end: Date; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({ start, end, label: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) });
    }

    const totalEntities = await prisma.auditUniverse.count({ where: { status: { not: 'ARCHIVED' } } });

    const monthlyData = await Promise.all(
      months.map(async (m) => {
        const [engagedCount, testedCount] = await Promise.all([
          prisma.engagement.count({
            where: { status: 'COMPLETED', actualEndDate: { gte: m.start, lt: m.end } },
          }),
          prisma.controlTest.count({
            where: { status: 'TESTED', testedAt: { gte: m.start, lt: m.end } },
          }),
        ]);
        // Coverage = percentage of entities that had an engagement or control test this month
        const covered = new Set<string>();
        const engs = await prisma.engagement.findMany({
          where: { status: 'COMPLETED', actualEndDate: { gte: m.start, lt: m.end } },
          select: { auditEntityId: true },
        });
        engs.forEach((e) => covered.add(e.auditEntityId));
        const tests = await prisma.controlTest.findMany({
          where: { status: 'TESTED', testedAt: { gte: m.start, lt: m.end } },
          select: { auditEntityId: true },
        });
        tests.forEach((t) => { if (t.auditEntityId) covered.add(t.auditEntityId); });
        const coverage = totalEntities > 0 ? Math.round((covered.size / totalEntities) * 100) : 0;
        return { period: m.label, coverage, target: 80 };
      }),
    );

    return {
      availability: 'available',
      data: monthlyData,
      description: 'Assurance coverage trend based on completed engagements and control tests over the last 6 months.',
    };
  }
}
