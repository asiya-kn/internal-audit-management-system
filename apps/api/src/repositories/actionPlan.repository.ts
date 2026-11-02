import { prisma } from '../config/db.js';
import type { Prisma } from '../generated/client/index.js';

export type ActionPlanWithRelations = Prisma.ActionPlanGetPayload<{
  include: {
    finding: { select: { id: true; reference: true; title: true } };
    controlTest: { select: { id: true; reference: true } };
    engagement: { select: { id: true; reference: true } };
    auditEntity: { select: { id: true; code: true; name: true } };
    responsibleOwner: { select: { id: true; firstName: true; lastName: true } };
    reviewer: { select: { id: true; firstName: true; lastName: true } };
    verifiedBy: { select: { id: true; firstName: true; lastName: true } };
    createdBy: { select: { id: true; firstName: true; lastName: true } };
    updatedBy: { select: { id: true; firstName: true; lastName: true } };
    updates: {
      include: { updatedBy: { select: { id: true; firstName: true; lastName: true } } };
      orderBy: { createdAt: 'desc' };
    };
  };
}>;

const actionPlanInclude = {
  finding: { select: { id: true, reference: true, title: true } },
  controlTest: { select: { id: true, reference: true } },
  engagement: { select: { id: true, reference: true } },
  auditEntity: { select: { id: true, code: true, name: true } },
  responsibleOwner: { select: { id: true, firstName: true, lastName: true } },
  reviewer: { select: { id: true, firstName: true, lastName: true } },
  verifiedBy: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  updatedBy: { select: { id: true, firstName: true, lastName: true } },
  updates: {
    include: { updatedBy: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

export class ActionPlanRepository {
  async findById(id: string): Promise<ActionPlanWithRelations | null> {
    return prisma.actionPlan.findUnique({ where: { id }, include: actionPlanInclude });
  }

  async findByReference(reference: string): Promise<ActionPlanWithRelations | null> {
    return prisma.actionPlan.findUnique({ where: { reference }, include: actionPlanInclude });
  }

  async findMany(params: {
    where: Prisma.ActionPlanWhereInput;
    orderBy?: Prisma.ActionPlanOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<ActionPlanWithRelations[]> {
    return prisma.actionPlan.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: actionPlanInclude,
    });
  }

  async count(where: Prisma.ActionPlanWhereInput): Promise<number> {
    return prisma.actionPlan.count({ where });
  }

  async create(data: Prisma.ActionPlanCreateInput): Promise<ActionPlanWithRelations> {
    return prisma.actionPlan.create({ data, include: actionPlanInclude });
  }

  async update(id: string, data: Prisma.ActionPlanUpdateInput): Promise<ActionPlanWithRelations> {
    return prisma.actionPlan.update({ where: { id }, data, include: actionPlanInclude });
  }

  async delete(id: string): Promise<void> {
    await prisma.actionPlan.delete({ where: { id } });
  }
}
