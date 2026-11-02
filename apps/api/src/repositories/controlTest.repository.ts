import { prisma } from '../config/db.js';
import type { Prisma } from '../generated/client/index.js';

export type ControlTestWithRelations = Prisma.ControlTestGetPayload<{
  include: {
    engagement: { select: { id: true; reference: true; title: true } };
    auditEntity: { select: { id: true; code: true; name: true } };
    risk: { select: { id: true; title: true } };
    finding: { select: { id: true; reference: true } };
    tester: { select: { id: true; firstName: true; lastName: true } };
    reviewer: { select: { id: true; firstName: true; lastName: true } };
    createdBy: { select: { id: true; firstName: true; lastName: true } };
    updatedBy: { select: { id: true; firstName: true; lastName: true } };
  };
}>;

const controlTestInclude = {
  engagement: { select: { id: true, reference: true, title: true } },
  auditEntity: { select: { id: true, code: true, name: true } },
  risk: { select: { id: true, title: true } },
  finding: { select: { id: true, reference: true } },
  tester: { select: { id: true, firstName: true, lastName: true } },
  reviewer: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  updatedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export class ControlTestRepository {
  async findById(id: string): Promise<ControlTestWithRelations | null> {
    return prisma.controlTest.findUnique({ where: { id }, include: controlTestInclude });
  }

  async findByReference(reference: string): Promise<ControlTestWithRelations | null> {
    return prisma.controlTest.findUnique({ where: { reference }, include: controlTestInclude });
  }

  async findMany(params: {
    where: Prisma.ControlTestWhereInput;
    orderBy?: Prisma.ControlTestOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<ControlTestWithRelations[]> {
    return prisma.controlTest.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: controlTestInclude,
    });
  }

  async count(where: Prisma.ControlTestWhereInput): Promise<number> {
    return prisma.controlTest.count({ where });
  }

  async create(data: Prisma.ControlTestCreateInput): Promise<ControlTestWithRelations> {
    return prisma.controlTest.create({ data, include: controlTestInclude });
  }

  async update(id: string, data: Prisma.ControlTestUpdateInput): Promise<ControlTestWithRelations> {
    return prisma.controlTest.update({ where: { id }, data, include: controlTestInclude });
  }

  async delete(id: string): Promise<void> {
    await prisma.controlTest.delete({ where: { id } });
  }
}
