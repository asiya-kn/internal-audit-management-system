import { prisma } from '../config/db.js';
import type { Prisma } from '../generated/client/index.js';
import type {
  ReportDataDto,
  ReportFilters,
  ReportSectionDto,
  ReportTableDto,
  ReportType,
} from '@iams/shared';

type DateRange = { dateFrom?: Date; dateTo?: Date };

function parseDateRange(filters: ReportFilters): DateRange {
  return {
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
  };
}

function buildDateWhere(field: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'collectionDate', range: DateRange): Prisma.Sql | undefined {
  if (!range.dateFrom && !range.dateTo) return undefined;
  return undefined;
}

function row(label: string, value: string | number) {
  return { label, value };
}

function emptyTable(title: string, columns: { key: string; label: string }[]): ReportTableDto {
  return { title, columns, rows: [] };
}

export class ReportsService {
  async generateReport(filters: ReportFilters): Promise<ReportDataDto> {
    switch (filters.reportType) {
      case 'EXECUTIVE_SUMMARY':
        return this.executiveSummary(filters);
      case 'AUDIT_ENGAGEMENT':
        return this.auditEngagementReport(filters);
      case 'RISK_ASSESSMENT':
        return this.riskAssessmentReport(filters);
      case 'AUDIT_UNIVERSE':
        return this.auditUniverseReport(filters);
      case 'AUDIT_PLAN_PROGRESS':
        return this.auditPlanProgressReport(filters);
      case 'CONTROL_TESTING':
        return this.controlTestingReport(filters);
      case 'AUDIT_FINDINGS':
        return this.auditFindingsReport(filters);
      case 'ACTION_PLANS':
        return this.actionPlansReport(filters);
      case 'EVIDENCE_SUMMARY':
        return this.evidenceSummaryReport(filters);
      case 'ASSURANCE_COVERAGE':
        return this.assuranceCoverageReport(filters);
      default:
        throw new Error(`Unsupported report type: ${filters.reportType as string}`);
    }
  }

  // ---- Executive Summary ----

  private async executiveSummary(filters: ReportFilters): Promise<ReportDataDto> {
    const range = parseDateRange(filters);
    void range;

    const [
      totalEntities, activeEntities, totalRisks, highRisks,
      totalEngagements, completedEngagements, inProgressEngagements,
      totalFindings, openFindings, criticalFindings,
      totalActionPlans, overdueActionPlans, completedActionPlans,
      totalControlTests, passingTests, failingTests,
      totalEvidence, acceptedEvidence,
    ] = await Promise.all([
      prisma.auditUniverse.count({ where: { status: { not: 'ARCHIVED' } } }),
      prisma.auditUniverse.count({ where: { status: 'ACTIVE' } }),
      prisma.risk.count(),
      prisma.risk.count({ where: { inherentLevel: { in: ['HIGH', 'CRITICAL'] } } }),
      prisma.engagement.count(),
      prisma.engagement.count({ where: { status: 'COMPLETED' } }),
      prisma.engagement.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.finding.count(),
      prisma.finding.count({ where: { status: { in: ['OPEN', 'MANAGEMENT_RESPONSE', 'ACTION_PLAN', 'REMEDIATED'] } } }),
      prisma.finding.count({ where: { severity: 'CRITICAL', status: { not: 'CLOSED' } } }),
      prisma.actionPlan.count(),
      prisma.actionPlan.count({ where: { status: 'OVERDUE' } }),
      prisma.actionPlan.count({ where: { status: 'COMPLETED' } }),
      prisma.controlTest.count(),
      prisma.controlTest.count({ where: { outcome: 'PASS' } }),
      prisma.controlTest.count({ where: { outcome: 'FAIL' } }),
      prisma.evidence.count(),
      prisma.evidence.count({ where: { reviewStatus: 'ACCEPTED' } }),
    ]);

    const summary: ReportSectionDto = {
      title: 'Executive Summary',
      rows: [
        row('Audit Universe Entities', totalEntities),
        row('Active Entities', activeEntities),
        row('Total Risks', totalRisks),
        row('High/Critical Risks', highRisks),
        row('Total Engagements', totalEngagements),
        row('Completed Engagements', completedEngagements),
        row('In-Progress Engagements', inProgressEngagements),
        row('Total Findings', totalFindings),
        row('Open Findings', openFindings),
        row('Critical Open Findings', criticalFindings),
        row('Total Action Plans', totalActionPlans),
        row('Overdue Action Plans', overdueActionPlans),
        row('Completed Action Plans', completedActionPlans),
        row('Total Control Tests', totalControlTests),
        row('Passing Tests', passingTests),
        row('Failing Tests', failingTests),
        row('Total Evidence Records', totalEvidence),
        row('Accepted Evidence', acceptedEvidence),
      ],
    };

    const findingsBySeverity = await prisma.finding.groupBy({ by: ['severity'], _count: true });
    const charts = [{
      title: 'Findings by Severity',
      type: 'bar' as const,
      data: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => ({
        label: s,
        value: findingsBySeverity.find((r) => r.severity === s)?._count ?? 0,
      })),
    }];

    const recentEngagementsTable = emptyTable('Recent Engagements', [
      { key: 'reference', label: 'Reference' },
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'leadAuditor', label: 'Lead Auditor' },
    ]);
    const recentEngs = await prisma.engagement.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: { leadAuditor: { select: { firstName: true, lastName: true } } },
    });
    recentEngagementsTable.rows = recentEngs.map((e) => ({
      reference: e.reference,
      title: e.title,
      status: e.status,
      leadAuditor: e.leadAuditor ? `${e.leadAuditor.firstName} ${e.leadAuditor.lastName}` : '—',
    }));

    return {
      reportType: 'EXECUTIVE_SUMMARY',
      reportTitle: 'Executive Summary Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      tables: [recentEngagementsTable],
      charts,
    };
  }

  // ---- Audit Engagement Report ----

  private async auditEngagementReport(filters: ReportFilters): Promise<ReportDataDto> {
    const where: Prisma.EngagementWhereInput = {};
    if (filters.engagementId) where.id = filters.engagementId;
    if (filters.auditEntityId) where.auditEntityId = filters.auditEntityId;

    const engagements = await prisma.engagement.findMany({
      where,
      orderBy: { reference: 'asc' },
      include: {
        auditEntity: { select: { code: true, name: true } },
        leadAuditor: { select: { firstName: true, lastName: true } },
        risk: { select: { title: true, inherentLevel: true, residualLevel: true } },
        _count: { select: { findings: true, controlTests: true, teamMembers: true } },
      },
    });

    const summary: ReportSectionDto = {
      title: 'Audit Engagement Report',
      rows: [
        row('Total Engagements', engagements.length),
        row('With Findings', engagements.filter((e) => e._count.findings > 0).length),
        row('With Control Tests', engagements.filter((e) => e._count.controlTests > 0).length),
      ],
    };

    const table: ReportTableDto = {
      title: 'Engagement Details',
      columns: [
        { key: 'reference', label: 'Reference' },
        { key: 'title', label: 'Title' },
        { key: 'entity', label: 'Audit Entity' },
        { key: 'status', label: 'Status' },
        { key: 'leadAuditor', label: 'Lead Auditor' },
        { key: 'objectives', label: 'Objectives' },
        { key: 'scope', label: 'Scope' },
        { key: 'findings', label: 'Findings' },
        { key: 'controlTests', label: 'Control Tests' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
      ],
      rows: engagements.map((e) => ({
        reference: e.reference,
        title: e.title,
        entity: e.auditEntity ? `${e.auditEntity.code} — ${e.auditEntity.name}` : '—',
        status: e.status,
        leadAuditor: e.leadAuditor ? `${e.leadAuditor.firstName} ${e.leadAuditor.lastName}` : '—',
        objectives: e.objectives,
        scope: e.scope,
        findings: e._count.findings,
        controlTests: e._count.controlTests,
        startDate: e.startDate?.toISOString().split('T')[0] ?? '—',
        endDate: e.endDate?.toISOString().split('T')[0] ?? '—',
      })),
    };

    return {
      reportType: 'AUDIT_ENGAGEMENT',
      reportTitle: 'Audit Engagement Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      tables: [table],
      charts: [],
    };
  }

  // ---- Risk Assessment Report ----

  private async riskAssessmentReport(filters: ReportFilters): Promise<ReportDataDto> {
    const where: Prisma.RiskWhereInput = {};
    if (filters.auditEntityId) where.auditEntityId = filters.auditEntityId;

    const risks = await prisma.risk.findMany({
      where,
      orderBy: { inherentScore: 'desc' },
      include: {
        auditEntity: { select: { code: true, name: true } },
        owner: { select: { firstName: true, lastName: true } },
        _count: { select: { actions: true } },
      },
    });

    const byLevel = await prisma.risk.groupBy({ by: ['inherentLevel'], _count: true });

    const summary: ReportSectionDto = {
      title: 'Risk Assessment Report',
      rows: [
        row('Total Risks', risks.length),
        row('Critical', byLevel.find((r) => r.inherentLevel === 'CRITICAL')?._count ?? 0),
        row('High', byLevel.find((r) => r.inherentLevel === 'HIGH')?._count ?? 0),
        row('Medium', byLevel.find((r) => r.inherentLevel === 'MEDIUM')?._count ?? 0),
        row('Low', byLevel.find((r) => r.inherentLevel === 'LOW')?._count ?? 0),
      ],
    };

    const table: ReportTableDto = {
      title: 'Risk Register',
      columns: [
        { key: 'title', label: 'Risk' },
        { key: 'entity', label: 'Audit Entity' },
        { key: 'inherentLevel', label: 'Inherent' },
        { key: 'residualLevel', label: 'Residual' },
        { key: 'status', label: 'Status' },
        { key: 'owner', label: 'Owner' },
        { key: 'actions', label: 'Mitigation Actions' },
      ],
      rows: risks.map((r) => ({
        title: r.title,
        entity: r.auditEntity ? `${r.auditEntity.code} — ${r.auditEntity.name}` : '—',
        inherentLevel: r.inherentLevel,
        residualLevel: r.residualLevel,
        status: r.status,
        owner: r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : '—',
        actions: r._count.actions,
      })),
    };

    const charts = [{
      title: 'Risks by Inherent Level',
      type: 'pie' as const,
      data: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => ({
        label: s,
        value: byLevel.find((r) => r.inherentLevel === s)?._count ?? 0,
      })),
    }];

    return {
      reportType: 'RISK_ASSESSMENT',
      reportTitle: 'Risk Assessment Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      tables: [table],
      charts,
    };
  }

  // ---- Audit Universe Report ----

  private async auditUniverseReport(filters: ReportFilters): Promise<ReportDataDto> {
    const where: Prisma.AuditUniverseWhereInput = { status: { not: 'ARCHIVED' } };
    if (filters.auditEntityId) where.id = filters.auditEntityId;

    const entities = await prisma.auditUniverse.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        owner: { select: { firstName: true, lastName: true } },
        _count: { select: { risks: true, engagements: true, findings: true, controlTests: true } },
      },
    });

    const byType = await prisma.auditUniverse.groupBy({ by: ['entityType'], _count: true });

    const summary: ReportSectionDto = {
      title: 'Audit Universe Report',
      rows: [
        row('Total Entities', entities.length),
        row('With Risks', entities.filter((e) => e._count.risks > 0).length),
        row('With Engagements', entities.filter((e) => e._count.engagements > 0).length),
        row('With Findings', entities.filter((e) => e._count.findings > 0).length),
      ],
    };

    const table: ReportTableDto = {
      title: 'Auditable Entities',
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'entityType', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'department', label: 'Department' },
        { key: 'owner', label: 'Owner' },
        { key: 'risks', label: 'Risks' },
        { key: 'engagements', label: 'Engagements' },
        { key: 'findings', label: 'Findings' },
      ],
      rows: entities.map((e) => ({
        code: e.code,
        name: e.name,
        entityType: e.entityType,
        status: e.status,
        department: e.department ?? '—',
        owner: e.owner ? `${e.owner.firstName} ${e.owner.lastName}` : '—',
        risks: e._count.risks,
        engagements: e._count.engagements,
        findings: e._count.findings,
      })),
    };

    const charts = [{
      title: 'Entities by Type',
      type: 'bar' as const,
      data: byType.map((r) => ({ label: r.entityType, value: r._count })),
    }];

    return {
      reportType: 'AUDIT_UNIVERSE',
      reportTitle: 'Audit Universe Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      tables: [table],
      charts,
    };
  }

  // ---- Audit Plan Progress Report ----

  private async auditPlanProgressReport(filters: ReportFilters): Promise<ReportDataDto> {
    const where: Prisma.AuditPlanWhereInput = {};
    if (filters.auditEntityId) where.auditEntityId = filters.auditEntityId;
    if (filters.fiscalYear) where.fiscalYear = filters.fiscalYear;

    const plans = await prisma.auditPlan.findMany({
      where,
      orderBy: { reference: 'asc' },
      include: {
        auditEntity: { select: { code: true, name: true } },
        leadAuditor: { select: { firstName: true, lastName: true } },
        _count: { select: { engagements: true } },
      },
    });

    const byStatus = await prisma.auditPlan.groupBy({ by: ['status'], _count: true });

    const summary: ReportSectionDto = {
      title: 'Audit Plan Progress',
      rows: [
        row('Total Plans', plans.length),
        row('Approved', byStatus.find((r) => r.status === 'APPROVED')?._count ?? 0),
        row('In Progress', byStatus.find((r) => r.status === 'IN_PROGRESS')?._count ?? 0),
        row('Completed', byStatus.find((r) => r.status === 'COMPLETED')?._count ?? 0),
        row('Draft', byStatus.find((r) => r.status === 'DRAFT')?._count ?? 0),
      ],
    };

    const table: ReportTableDto = {
      title: 'Audit Plan Details',
      columns: [
        { key: 'reference', label: 'Reference' },
        { key: 'title', label: 'Title' },
        { key: 'fiscalYear', label: 'FY' },
        { key: 'entity', label: 'Audit Entity' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'engagements', label: 'Engagements' },
        { key: 'leadAuditor', label: 'Lead Auditor' },
      ],
      rows: plans.map((p) => ({
        reference: p.reference,
        title: p.title,
        fiscalYear: p.fiscalYear,
        entity: p.auditEntity ? `${p.auditEntity.code} — ${p.auditEntity.name}` : '—',
        priority: p.priority,
        status: p.status,
        engagements: p._count.engagements,
        leadAuditor: p.leadAuditor ? `${p.leadAuditor.firstName} ${p.leadAuditor.lastName}` : '—',
      })),
    };

    const charts = [{
      title: 'Plans by Status',
      type: 'pie' as const,
      data: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => ({
        label: s,
        value: byStatus.find((r) => r.status === s)?._count ?? 0,
      })),
    }];

    return {
      reportType: 'AUDIT_PLAN_PROGRESS',
      reportTitle: 'Audit Plan Progress Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      tables: [table],
      charts,
    };
  }

  // ---- Control Testing Report ----

  private async controlTestingReport(filters: ReportFilters): Promise<ReportDataDto> {
    const where: Prisma.ControlTestWhereInput = {};
    if (filters.engagementId) where.engagementId = filters.engagementId;
    if (filters.auditEntityId) where.auditEntityId = filters.auditEntityId;

    const tests = await prisma.controlTest.findMany({
      where,
      orderBy: { reference: 'asc' },
      include: {
        auditEntity: { select: { code: true, name: true } },
        tester: { select: { firstName: true, lastName: true } },
      },
    });

    const byOutcome = await prisma.controlTest.groupBy({ by: ['outcome'], _count: true });

    const summary: ReportSectionDto = {
      title: 'Control Testing Report',
      rows: [
        row('Total Tests', tests.length),
        row('Pass', byOutcome.find((r) => r.outcome === 'PASS')?._count ?? 0),
        row('Fail', byOutcome.find((r) => r.outcome === 'FAIL')?._count ?? 0),
        row('Pass with Exception', byOutcome.find((r) => r.outcome === 'PASS_WITH_EXCEPTION')?._count ?? 0),
        row('Inconclusive', byOutcome.find((r) => r.outcome === 'INCONCLUSIVE')?._count ?? 0),
      ],
    };

    const table: ReportTableDto = {
      title: 'Control Test Results',
      columns: [
        { key: 'reference', label: 'Reference' },
        { key: 'title', label: 'Title' },
        { key: 'entity', label: 'Audit Entity' },
        { key: 'status', label: 'Status' },
        { key: 'outcome', label: 'Outcome' },
        { key: 'tester', label: 'Tester' },
        { key: 'testedAt', label: 'Tested At' },
      ],
      rows: tests.map((t) => ({
        reference: t.reference,
        title: t.title,
        entity: t.auditEntity ? `${t.auditEntity.code} — ${t.auditEntity.name}` : '—',
        status: t.status,
        outcome: t.outcome ?? '—',
        tester: t.tester ? `${t.tester.firstName} ${t.tester.lastName}` : '—',
        testedAt: t.testedAt?.toISOString().split('T')[0] ?? '—',
      })),
    };

    const charts = [{
      title: 'Test Outcomes',
      type: 'pie' as const,
      data: ['PASS', 'FAIL', 'PASS_WITH_EXCEPTION', 'NOT_APPLICABLE', 'INCONCLUSIVE'].map((s) => ({
        label: s,
        value: byOutcome.find((r) => r.outcome === s)?._count ?? 0,
      })),
    }];

    return {
      reportType: 'CONTROL_TESTING',
      reportTitle: 'Control Testing Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      tables: [table],
      charts,
    };
  }

  // ---- Audit Findings Report ----

  private async auditFindingsReport(filters: ReportFilters): Promise<ReportDataDto> {
    const where: Prisma.FindingWhereInput = {};
    if (filters.engagementId) where.engagementId = filters.engagementId;
    if (filters.auditEntityId) where.auditEntityId = filters.auditEntityId;

    const findings = await prisma.finding.findMany({
      where,
      orderBy: { reference: 'asc' },
      include: {
        auditEntity: { select: { code: true, name: true } },
        engagement: { select: { reference: true } },
        responsibleOwner: { select: { firstName: true, lastName: true } },
      },
    });

    const bySeverity = await prisma.finding.groupBy({ by: ['severity'], _count: true });
    const byStatus = await prisma.finding.groupBy({ by: ['status'], _count: true });

    const summary: ReportSectionDto = {
      title: 'Audit Findings Report',
      rows: [
        row('Total Findings', findings.length),
        row('Critical', bySeverity.find((r) => r.severity === 'CRITICAL')?._count ?? 0),
        row('High', bySeverity.find((r) => r.severity === 'HIGH')?._count ?? 0),
        row('Medium', bySeverity.find((r) => r.severity === 'MEDIUM')?._count ?? 0),
        row('Low', bySeverity.find((r) => r.severity === 'LOW')?._count ?? 0),
        row('Open', byStatus.find((r) => r.status === 'OPEN')?._count ?? 0),
        row('Closed', byStatus.find((r) => r.status === 'CLOSED')?._count ?? 0),
        row('Verified', byStatus.find((r) => r.status === 'VERIFIED')?._count ?? 0),
      ],
    };

    const table: ReportTableDto = {
      title: 'Findings Detail',
      columns: [
        { key: 'reference', label: 'Reference' },
        { key: 'title', label: 'Title' },
        { key: 'entity', label: 'Audit Entity' },
        { key: 'engagement', label: 'Engagement' },
        { key: 'severity', label: 'Severity' },
        { key: 'status', label: 'Status' },
        { key: 'owner', label: 'Responsible Owner' },
        { key: 'targetDate', label: 'Target Date' },
      ],
      rows: findings.map((f) => ({
        reference: f.reference,
        title: f.title,
        entity: f.auditEntity ? `${f.auditEntity.code} — ${f.auditEntity.name}` : '—',
        engagement: f.engagement?.reference ?? '—',
        severity: f.severity,
        status: f.status,
        owner: f.responsibleOwner ? `${f.responsibleOwner.firstName} ${f.responsibleOwner.lastName}` : '—',
        targetDate: f.targetResolutionDate?.toISOString().split('T')[0] ?? '—',
      })),
    };

    const charts = [
      {
        title: 'Findings by Severity',
        type: 'bar' as const,
        data: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => ({
          label: s,
          value: bySeverity.find((r) => r.severity === s)?._count ?? 0,
        })),
      },
      {
        title: 'Findings by Status',
        type: 'pie' as const,
        data: ['DRAFT', 'OPEN', 'MANAGEMENT_RESPONSE', 'ACTION_PLAN', 'REMEDIATED', 'VERIFIED', 'CLOSED', 'CANCELLED'].map((s) => ({
          label: s,
          value: byStatus.find((r) => r.status === s)?._count ?? 0,
        })),
      },
    ];

    return {
      reportType: 'AUDIT_FINDINGS',
      reportTitle: 'Audit Findings Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      tables: [table],
      charts,
    };
  }

  // ---- Action Plans Report ----

  private async actionPlansReport(filters: ReportFilters): Promise<ReportDataDto> {
    const where: Prisma.ActionPlanWhereInput = {};
    if (filters.auditEntityId) where.auditEntityId = filters.auditEntityId;
    if (filters.engagementId) where.engagementId = filters.engagementId;

    const plans = await prisma.actionPlan.findMany({
      where,
      orderBy: { reference: 'asc' },
      include: {
        responsibleOwner: { select: { firstName: true, lastName: true } },
        reviewer: { select: { firstName: true, lastName: true } },
        auditEntity: { select: { code: true, name: true } },
      },
    });

    const byStatus = await prisma.actionPlan.groupBy({ by: ['status'], _count: true });
    const byPriority = await prisma.actionPlan.groupBy({ by: ['priority'], _count: true });

    const summary: ReportSectionDto = {
      title: 'Action Plans Report',
      rows: [
        row('Total Plans', plans.length),
        row('Open', byStatus.find((r) => r.status === 'OPEN')?._count ?? 0),
        row('In Progress', byStatus.find((r) => r.status === 'IN_PROGRESS')?._count ?? 0),
        row('Pending Verification', byStatus.find((r) => r.status === 'PENDING_VERIFICATION')?._count ?? 0),
        row('Completed', byStatus.find((r) => r.status === 'COMPLETED')?._count ?? 0),
        row('Overdue', byStatus.find((r) => r.status === 'OVERDUE')?._count ?? 0),
      ],
    };

    const table: ReportTableDto = {
      title: 'Action Plan Details',
      columns: [
        { key: 'reference', label: 'Reference' },
        { key: 'title', label: 'Title' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'owner', label: 'Responsible Owner' },
        { key: 'targetDate', label: 'Target Date' },
        { key: 'progress', label: 'Progress %' },
      ],
      rows: plans.map((p) => ({
        reference: p.reference,
        title: p.title,
        priority: p.priority,
        status: p.status,
        owner: p.responsibleOwner ? `${p.responsibleOwner.firstName} ${p.responsibleOwner.lastName}` : '—',
        targetDate: p.targetDate?.toISOString().split('T')[0] ?? '—',
        progress: p.progressPct,
      })),
    };

    const charts = [
      {
        title: 'Plans by Status',
        type: 'pie' as const,
        data: ['OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'COMPLETED', 'OVERDUE', 'CANCELLED'].map((s) => ({
          label: s,
          value: byStatus.find((r) => r.status === s)?._count ?? 0,
        })),
      },
      {
        title: 'Plans by Priority',
        type: 'bar' as const,
        data: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => ({
          label: s,
          value: byPriority.find((r) => r.priority === s)?._count ?? 0,
        })),
      },
    ];

    return {
      reportType: 'ACTION_PLANS',
      reportTitle: 'Action Plans Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      tables: [table],
      charts,
    };
  }

  // ---- Evidence Summary Report ----

  private async evidenceSummaryReport(filters: ReportFilters): Promise<ReportDataDto> {
    const where: Prisma.EvidenceWhereInput = {};
    if (filters.engagementId) where.engagementId = filters.engagementId;
    if (filters.auditEntityId) where.auditEntityId = filters.auditEntityId;

    const evidence = await prisma.evidence.findMany({
      where,
      orderBy: { reference: 'asc' },
      include: {
        engagement: { select: { reference: true } },
        controlTest: { select: { reference: true } },
        finding: { select: { reference: true } },
        actionPlan: { select: { reference: true } },
        submittedBy: { select: { firstName: true, lastName: true } },
        reviewer: { select: { firstName: true, lastName: true } },
      },
    });

    const byReviewStatus = await prisma.evidence.groupBy({ by: ['reviewStatus'], _count: true });
    const byType = await prisma.evidence.groupBy({ by: ['evidenceType'], _count: true });

    const summary: ReportSectionDto = {
      title: 'Evidence & Working Paper Summary',
      rows: [
        row('Total Records', evidence.length),
        row('Draft', byReviewStatus.find((r) => r.reviewStatus === 'DRAFT')?._count ?? 0),
        row('In Review', byReviewStatus.find((r) => r.reviewStatus === 'IN_REVIEW')?._count ?? 0),
        row('Accepted', byReviewStatus.find((r) => r.reviewStatus === 'ACCEPTED')?._count ?? 0),
        row('Revision Requested', byReviewStatus.find((r) => r.reviewStatus === 'REVISION_REQUESTED')?._count ?? 0),
        row('Rejected', byReviewStatus.find((r) => r.reviewStatus === 'REJECTED')?._count ?? 0),
      ],
    };

    const table: ReportTableDto = {
      title: 'Evidence Records',
      columns: [
        { key: 'reference', label: 'Reference' },
        { key: 'title', label: 'Title' },
        { key: 'evidenceType', label: 'Type' },
        { key: 'reviewStatus', label: 'Review Status' },
        { key: 'engagement', label: 'Engagement' },
        { key: 'submittedBy', label: 'Submitted By' },
        { key: 'reviewer', label: 'Reviewer' },
      ],
      rows: evidence.map((e) => ({
        reference: e.reference,
        title: e.title,
        evidenceType: e.evidenceType,
        reviewStatus: e.reviewStatus,
        engagement: e.engagement?.reference ?? '—',
        submittedBy: e.submittedBy ? `${e.submittedBy.firstName} ${e.submittedBy.lastName}` : '—',
        reviewer: e.reviewer ? `${e.reviewer.firstName} ${e.reviewer.lastName}` : '—',
      })),
    };

    const charts = [{
      title: 'Evidence by Review Status',
      type: 'pie' as const,
      data: ['DRAFT', 'IN_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'REJECTED'].map((s) => ({
        label: s,
        value: byReviewStatus.find((r) => r.reviewStatus === s)?._count ?? 0,
      })),
    }];

    void byType;

    return {
      reportType: 'EVIDENCE_SUMMARY',
      reportTitle: 'Evidence & Working Paper Summary Report',
      generatedAt: new Date().toISOString(),
      filters,
      summary,
      tables: [table],
      charts,
    };
  }

  // ---- Assurance Coverage Report ----

  private async assuranceCoverageReport(_filters: ReportFilters): Promise<ReportDataDto> {
    const [totalEntities, entitiesWithEngagements, entitiesWithControlTests] = await Promise.all([
      prisma.auditUniverse.count({ where: { status: { not: 'ARCHIVED' } } }),
      prisma.auditUniverse.count({
        where: { status: { not: 'ARCHIVED' }, engagements: { some: {} } },
      }),
      prisma.auditUniverse.count({
        where: { status: { not: 'ARCHIVED' }, controlTests: { some: {} } },
      }),
    ]);

    const coveragePct = totalEntities > 0 ? Math.round(((entitiesWithEngagements + entitiesWithControlTests) / (totalEntities * 2)) * 100) : 0;

    const summary: ReportSectionDto = {
      title: 'Assurance Coverage Report',
      rows: [
        row('Total Entities', totalEntities),
        row('Entities with Engagements', entitiesWithEngagements),
        row('Entities with Control Tests', entitiesWithControlTests),
        row('Coverage Percentage', `${coveragePct}%`),
        row('Coverage Gaps', totalEntities - entitiesWithEngagements),
      ],
    };

    const entities = await prisma.auditUniverse.findMany({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { name: 'asc' },
      select: {
        id: true, code: true, name: true, entityType: true,
        _count: { select: { engagements: true, controlTests: true, findings: true } },
      },
      take: 100,
    });

    const table: ReportTableDto = {
      title: 'Entity Coverage',
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'entityType', label: 'Type' },
        { key: 'engagements', label: 'Engagements' },
        { key: 'controlTests', label: 'Control Tests' },
        { key: 'findings', label: 'Findings' },
        { key: 'coverage', label: 'Coverage' },
      ],
      rows: entities.map((e) => ({
        code: e.code,
        name: e.name,
        entityType: e.entityType,
        engagements: e._count.engagements,
        controlTests: e._count.controlTests,
        findings: e._count.findings,
        coverage: e._count.engagements > 0 || e._count.controlTests > 0 ? 'Covered' : 'Gap',
      })),
    };

    const charts = [{
      title: 'Coverage Distribution',
      type: 'bar' as const,
      data: [
        { label: 'Covered', value: entities.filter((e) => e._count.engagements > 0 || e._count.controlTests > 0).length },
        { label: 'Gaps', value: entities.filter((e) => e._count.engagements === 0 && e._count.controlTests === 0).length },
      ],
    }];

    return {
      reportType: 'ASSURANCE_COVERAGE',
      reportTitle: 'Assurance Coverage Report',
      generatedAt: new Date().toISOString(),
      filters: _filters,
      summary,
      tables: [table],
      charts,
    };
  }
}
