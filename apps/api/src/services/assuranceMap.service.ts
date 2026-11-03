import { prisma } from '../config/db.js';
import type { Prisma } from '../generated/client/index.js';
import type {
  AssuranceMapResponse,
  AssuranceMapMatrixRowDto,
  AssuranceMapCellDto,
  AssuranceMapSummaryDto,
  AssuranceMapFilters,
  AssuranceProvider,
  AssuranceLevel,
  AssuranceTargetType,
} from '@iams/shared';

const ASSURANCE_PROVIDERS: AssuranceProvider[] = [
  'INTERNAL_AUDIT',
  'RISK_MANAGEMENT',
  'COMPLIANCE',
  'EXTERNAL_AUDIT',
  'MANAGEMENT',
  'OTHER',
];

function inferProvider(
  engagementType: string | null,
  controlTestReference: string | null,
): AssuranceProvider {
  // Internal Audit is the primary assurance provider in this system.
  // Engagements of type COMPLIANCE_AUDIT are attributed to Compliance.
  if (engagementType === 'COMPLIANCE_AUDIT') return 'COMPLIANCE';
  if (engagementType === 'FINANCIAL_AUDIT') return 'EXTERNAL_AUDIT';
  if (controlTestReference) return 'INTERNAL_AUDIT';
  return 'INTERNAL_AUDIT';
}

function computeAssuranceLevel(
  engagementCount: number,
  controlTestCount: number,
): AssuranceLevel {
  if (engagementCount >= 1 && controlTestCount >= 1) return 'FULL';
  if (engagementCount >= 1 || controlTestCount >= 1) return 'PARTIAL';
  return 'NONE';
}

export class AssuranceMapService {
  async getAssuranceMap(input: AssuranceMapFilters): Promise<AssuranceMapResponse> {
    const {
      search,
      provider,
      assuranceLevel,
      targetType,
      page,
      pageSize,
    } = input;

    const pageNum = page ?? 1;
    const size = Math.min(pageSize ?? 500, 500);

    const entityWhere: Prisma.AuditUniverseWhereInput = {};
    if (search) {
      entityWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }
    entityWhere.status = { not: 'ARCHIVED' };

    const [entities, totalEntities] = await Promise.all([
      prisma.auditUniverse.findMany({
        where: entityWhere,
        orderBy: { name: 'asc' },
        skip: (pageNum - 1) * size,
        take: size,
        select: {
          id: true,
          code: true,
          name: true,
          entityType: true,
        },
      }),
      prisma.auditUniverse.count({ where: entityWhere }),
    ]);

    const entityIds = entities.map((e) => e.id);

    // Parallel fetch of risks, engagements, control tests, and findings
    const [risks, engagements, controlTests, findings] = await Promise.all([
      prisma.risk.findMany({
        where: { auditEntityId: { in: entityIds } },
        select: {
          id: true,
          title: true,
          auditEntityId: true,
          inherentLevel: true,
          residualLevel: true,
          status: true,
        },
      }),
      prisma.engagement.findMany({
        where: { auditEntityId: { in: entityIds } },
        select: {
          id: true,
          auditEntityId: true,
          type: true,
          status: true,
          updatedAt: true,
          _count: { select: { findings: true } },
        },
      }),
      prisma.controlTest.findMany({
        where: { auditEntityId: { in: entityIds } },
        select: {
          id: true,
          auditEntityId: true,
          status: true,
          outcome: true,
          updatedAt: true,
        },
      }),
      prisma.finding.findMany({
        where: { auditEntityId: { in: entityIds } },
        select: { id: true, auditEntityId: true },
      }),
    ]);

    // Index by entity id
    const riskByEntity = new Map<string, typeof risks>();
    for (const r of risks) {
      const arr = riskByEntity.get(r.auditEntityId) ?? [];
      arr.push(r);
      riskByEntity.set(r.auditEntityId, arr);
    }

    const engByEntity = new Map<string, typeof engagements>();
    for (const e of engagements) {
      const arr = engByEntity.get(e.auditEntityId) ?? [];
      arr.push(e);
      engByEntity.set(e.auditEntityId, arr);
    }

    const ctByEntity = new Map<string, typeof controlTests>();
    for (const c of controlTests) {
      if (!c.auditEntityId) continue;
      const arr = ctByEntity.get(c.auditEntityId) ?? [];
      arr.push(c);
      ctByEntity.set(c.auditEntityId, arr);
    }

    const findingsByEntity = new Map<string, number>();
    for (const f of findings) {
      findingsByEntity.set(f.auditEntityId, (findingsByEntity.get(f.auditEntityId) ?? 0) + 1);
    }

    const matrix: AssuranceMapMatrixRowDto[] = [];
    const summary: AssuranceMapSummaryDto = {
      totalEntities,
      entitiesWithAssurance: 0,
      coveragePct: 0,
      fullAssuranceCount: 0,
      partialAssuranceCount: 0,
      noAssuranceCount: 0,
      coverageGapsCount: 0,
      byProvider: {
        INTERNAL_AUDIT: 0,
        RISK_MANAGEMENT: 0,
        COMPLIANCE: 0,
        EXTERNAL_AUDIT: 0,
        MANAGEMENT: 0,
        OTHER: 0,
      },
      highRiskWithoutAssurance: 0,
    };

    for (const entity of entities) {
      const entityRisks = riskByEntity.get(entity.id) ?? [];
      const entityEngs = engByEntity.get(entity.id) ?? [];
      const entityCts = ctByEntity.get(entity.id) ?? [];
      const entityFindingsCount = findingsByEntity.get(entity.id) ?? 0;

      const cells: AssuranceMapCellDto[] = [];

      for (const prov of ASSURANCE_PROVIDERS) {
        const matchingEngs = entityEngs.filter(
          (e) => inferProvider(e.type, null) === prov,
        );
        const matchingCts =
          prov === 'INTERNAL_AUDIT'
            ? entityCts
            : [];

        const engCount = matchingEngs.length;
        const ctCount = matchingCts.length;
        const level = computeAssuranceLevel(engCount, ctCount);
        const assessmentDate =
          matchingEngs.length > 0 || matchingCts.length > 0
            ? [...matchingEngs, ...matchingCts]
                .map((x) => x.updatedAt)
                .sort((a, b) => b.getTime() - a.getTime())[0]
                ?.toISOString() ?? null
            : null;

        cells.push({
          auditEntityId: entity.id,
          auditEntityCode: entity.code,
          auditEntityName: entity.name,
          auditEntityType: entity.entityType,
          riskId: entityRisks.length > 0 ? entityRisks[0].id : null,
          riskTitle: entityRisks.length > 0 ? entityRisks[0].title : null,
          riskInherentLevel: entityRisks.length > 0 ? entityRisks[0].inherentLevel : null,
          riskResidualLevel: entityRisks.length > 0 ? entityRisks[0].residualLevel : null,
          riskStatus: entityRisks.length > 0 ? entityRisks[0].status : null,
          provider: prov,
          assuranceLevel: level,
          assessmentDate,
          notes: level !== 'NONE' ? `${engCount} engagement(s), ${ctCount} control test(s)` : null,
          engagementCount: engCount,
          controlTestCount: ctCount,
          findingCount: entityFindingsCount,
        });
      }

      const rowLevel = cells.some((c) => c.assuranceLevel === 'FULL')
        ? 'FULL'
        : cells.some((c) => c.assuranceLevel === 'PARTIAL')
          ? 'PARTIAL'
          : 'NONE';

      if (rowLevel === 'FULL') summary.fullAssuranceCount++;
      else if (rowLevel === 'PARTIAL') summary.partialAssuranceCount++;
      else summary.noAssuranceCount++;

      if (rowLevel !== 'NONE') summary.entitiesWithAssurance++;

      for (const c of cells) {
        if (c.assuranceLevel !== 'NONE') {
          summary.byProvider[c.provider]++;
        }
      }

      const highestInherent = entityRisks
        .map((r) => r.inherentLevel)
        .filter((l) => Boolean(l))
        .sort((a, b) => {
          const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
          return order.indexOf(a) - order.indexOf(b);
        })[0];

      if (rowLevel === 'NONE' && (highestInherent === 'CRITICAL' || highestInherent === 'HIGH')) {
        summary.highRiskWithoutAssurance++;
        summary.coverageGapsCount++;
      }

      const row: AssuranceMapMatrixRowDto = {
        auditEntityId: entity.id,
        auditEntityCode: entity.code,
        auditEntityName: entity.name,
        auditEntityType: entity.entityType,
        riskId: entityRisks.length > 0 ? entityRisks[0].id : null,
        riskTitle: entityRisks.length > 0 ? entityRisks[0].title : null,
        riskInherentLevel: entityRisks.length > 0 ? entityRisks[0].inherentLevel : null,
        cells,
      };

      // Apply server-side provider filter
      if (provider) {
        row.cells = row.cells.filter((c) => c.provider === provider);
        if (row.cells.length === 0) continue;
      }

      // Apply assurance-level filter
      if (assuranceLevel) {
        const hasMatchingCell = row.cells.some((c) => c.assuranceLevel === assuranceLevel);
        if (!hasMatchingCell) continue;
      }

      // Apply target-type filter
      if (targetType === 'RISK' && !row.riskId) continue;
      if (targetType === 'AUDIT_ENTITY' && row.riskId) continue;

      matrix.push(row);
    }

    summary.coveragePct =
      totalEntities > 0
        ? Math.round((summary.entitiesWithAssurance / totalEntities) * 100)
        : 0;

    return { matrix, summary };
  }
}
