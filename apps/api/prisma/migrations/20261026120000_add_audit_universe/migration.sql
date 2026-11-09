-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('ORGANIZATION', 'DIVISION', 'DEPARTMENT', 'EXECUTIVE_MANAGEMENT', 'SECTOR', 'SYSTEM', 'PROJECT', 'THIRD_PARTY', 'BOARD_OF_DIRECTORS', 'SECTOR');

-- CreateEnum
CREATE TYPE "AuditEntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "AuditUniverse" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" "AuditEntityType" NOT NULL,
    "status" "AuditEntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "parentId" UUID,
    "businessProcess" TEXT,
    "department" TEXT,
    "riskRating" TEXT,
    "notes" TEXT,
    "ownerId" UUID,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditUniverse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditUniverse_code_key" ON "AuditUniverse"("code");

-- CreateIndex
CREATE INDEX "AuditUniverse_parentId_idx" ON "AuditUniverse"("parentId");

-- CreateIndex
CREATE INDEX "AuditUniverse_entityType_idx" ON "AuditUniverse"("entityType");

-- CreateIndex
CREATE INDEX "AuditUniverse_status_idx" ON "AuditUniverse"("status");

-- CreateIndex
CREATE INDEX "AuditUniverse_name_idx" ON "AuditUniverse"("name");

-- CreateIndex
CREATE INDEX "AuditUniverse_ownerId_idx" ON "AuditUniverse"("ownerId");

-- AddForeignKey
ALTER TABLE "AuditUniverse" ADD CONSTRAINT "AuditUniverse_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AuditUniverse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditUniverse" ADD CONSTRAINT "AuditUniverse_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditUniverse" ADD CONSTRAINT "AuditUniverse_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditUniverse" ADD CONSTRAINT "AuditUniverse_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
