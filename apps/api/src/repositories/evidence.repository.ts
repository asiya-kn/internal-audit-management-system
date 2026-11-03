import { prisma } from '../config/db.js';
import type { Prisma, Evidence } from '../generated/client/index.js';

export type EvidenceWithRelations = Prisma.EvidenceGetPayload<{
  include: {
    engagement: { select: { id: true; reference: true } };
    controlTest: { select: { id: true; reference: true } };
    finding: { select: { id: true; reference: true } };
    actionPlan: { select: { id: true; reference: true } };
    auditEntity: { select: { id: true; code: true; name: true } };
    submittedBy: { select: { id: true; firstName: true; lastName: true } };
    reviewer: { select: { id: true; firstName: true; lastName: true } };
    createdBy: { select: { id: true; firstName: true; lastName: true } };
    updatedBy: { select: { id: true; firstName: true; lastName: true } };
  };
}>;

export class EvidenceRepository {
  async findById(id: string): Promise<EvidenceWithRelations | null> {
    return prisma.evidence.findUnique({
      where: { id },
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
    });
  }

  async findByReference(reference: string): Promise<Evidence | null> {
    return prisma.evidence.findUnique({ where: { reference } });
  }

  async count(params: { where: Prisma.EvidenceWhereInput }): Promise<number> {
    return prisma.evidence.count({ where: params.where });
  }

  async findMany(params: {
    where: Prisma.EvidenceWhereInput;
    orderBy?: Prisma.EvidenceOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<EvidenceWithRelations[]> {
    return prisma.evidence.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
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
    });
  }

  async create(data: Prisma.EvidenceCreateInput): Promise<EvidenceWithRelations> {
    return prisma.evidence.create({
      data,
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
    });
  }

  async update(id: string, data: Prisma.EvidenceUpdateInput): Promise<EvidenceWithRelations> {
    return prisma.evidence.update({
      where: { id },
      data,
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
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.evidence.delete({ where: { id } });
  }
}
