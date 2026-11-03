-- CreateTable
CREATE TABLE "Evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "evidenceType" TEXT NOT NULL,
    "source" TEXT,
    "engagementId" UUID,
    "controlTestId" UUID,
    "findingId" UUID,
    "actionPlanId" UUID,
    "auditEntityId" UUID,
    "collectionDate" TIMESTAMP(3),
    "submittedById" UUID,
    "reviewerId" UUID,
    "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewComments" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "documentReference" TEXT,
    "documentMetadata" JSONB,
    "notes" TEXT,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_reference_key" ON "Evidence"("reference");

-- CreateIndex
CREATE INDEX "Evidence_engagementId_idx" ON "Evidence"("engagementId");
-- CreateIndex
CREATE INDEX "Evidence_controlTestId_idx" ON "Evidence"("controlTestId");
-- CreateIndex
CREATE INDEX "Evidence_findingId_idx" ON "Evidence"("findingId");
-- CreateIndex
CREATE INDEX "Evidence_actionPlanId_idx" ON "Evidence"("actionPlanId");
-- CreateIndex
CREATE INDEX "Evidence_auditEntityId_idx" ON "Evidence"("auditEntityId");
-- CreateIndex
CREATE INDEX "Evidence_reviewStatus_idx" ON "Evidence"("reviewStatus");
-- CreateIndex
CREATE INDEX "Evidence_evidenceType_idx" ON "Evidence"("evidenceType");
-- CreateIndex
CREATE INDEX "Evidence_submittedById_idx" ON "Evidence"("submittedById");
-- CreateIndex
CREATE INDEX "Evidence_reviewerId_idx" ON "Evidence"("reviewerId");
-- CreateIndex
CREATE INDEX "Evidence_title_idx" ON "Evidence"("title");

-- AddConstraints
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_engagementId_fkey"
  FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_controlTestId_fkey"
  FOREIGN KEY ("controlTestId") REFERENCES "ControlTest"("id") ON DELETE SET NULL;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_actionPlanId_fkey"
  FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE SET NULL;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_auditEntityId_fkey"
  FOREIGN KEY ("auditEntityId") REFERENCES "AuditUniverse"("id") ON DELETE SET NULL;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "Evidence_createdById_idx" ON "Evidence"("createdById");
-- CreateIndex
CREATE INDEX "Evidence_updatedById_idx" ON "Evidence"("updatedById");
