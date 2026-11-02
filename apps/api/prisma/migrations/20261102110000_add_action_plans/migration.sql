-- CreateEnum
CREATE TYPE "ActionPlanStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionPlanPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "findingId" UUID,
    "controlTestId" UUID,
    "engagementId" UUID,
    "auditEntityId" UUID,
    "priority" "ActionPlanPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ActionPlanStatus" NOT NULL DEFAULT 'OPEN',
    "responsibleOwnerId" UUID,
    "reviewerId" UUID,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" UUID,
    "managementJustification" TEXT,
    "proposedRectification" TEXT,
    "completionEvidence" TEXT,
    "verificationNotes" TEXT,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlanUpdate" (
    "id" UUID NOT NULL,
    "actionPlanId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionPlanUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionPlan_reference_key" ON "ActionPlan"("reference");
CREATE INDEX "ActionPlan_findingId_idx" ON "ActionPlan"("findingId");
CREATE INDEX "ActionPlan_controlTestId_idx" ON "ActionPlan"("controlTestId");
CREATE INDEX "ActionPlan_engagementId_idx" ON "ActionPlan"("engagementId");
CREATE INDEX "ActionPlan_auditEntityId_idx" ON "ActionPlan"("auditEntityId");
CREATE INDEX "ActionPlan_status_idx" ON "ActionPlan"("status");
CREATE INDEX "ActionPlan_priority_idx" ON "ActionPlan"("priority");
CREATE INDEX "ActionPlan_responsibleOwnerId_idx" ON "ActionPlan"("responsibleOwnerId");
CREATE INDEX "ActionPlan_targetDate_idx" ON "ActionPlan"("targetDate");
CREATE INDEX "ActionPlan_title_idx" ON "ActionPlan"("title");

CREATE INDEX "ActionPlanUpdate_actionPlanId_idx" ON "ActionPlanUpdate"("actionPlanId");
CREATE INDEX "ActionPlanUpdate_updatedById_idx" ON "ActionPlanUpdate"("updatedById");

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_controlTestId_fkey" FOREIGN KEY ("controlTestId") REFERENCES "ControlTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_auditEntityId_fkey" FOREIGN KEY ("auditEntityId") REFERENCES "AuditUniverse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_responsibleOwnerId_fkey" FOREIGN KEY ("responsibleOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActionPlanUpdate" ADD CONSTRAINT "ActionPlanUpdate_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionPlanUpdate" ADD CONSTRAINT "ActionPlanUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
