-- CreateEnum
CREATE TYPE "ControlTestStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'TESTED', 'REVIEWED', 'EXCEPTION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ControlTestOutcome" AS ENUM ('PASS', 'FAIL', 'PASS_WITH_EXCEPTION', 'NOT_APPLICABLE', 'INCONCLUSIVE');

-- CreateTable
CREATE TABLE "ControlTest" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "engagementId" UUID,
    "auditEntityId" UUID,
    "riskId" UUID,
    "controlReference" TEXT,
    "status" "ControlTestStatus" NOT NULL DEFAULT 'PLANNED',
    "outcome" "ControlTestOutcome",
    "objective" TEXT NOT NULL,
    "procedures" TEXT NOT NULL,
    "criteria" TEXT,
    "sampleDescription" TEXT,
    "sampleSize" INTEGER,
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "exceptions" TEXT,
    "conclusion" TEXT,
    "evidenceReference" TEXT,
    "testerId" UUID,
    "testedAt" TIMESTAMP(3),
    "testerNotes" TEXT,
    "reviewerId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "findingId" UUID,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ControlTest_reference_key" ON "ControlTest"("reference");
CREATE INDEX "ControlTest_engagementId_idx" ON "ControlTest"("engagementId");
CREATE INDEX "ControlTest_auditEntityId_idx" ON "ControlTest"("auditEntityId");
CREATE INDEX "ControlTest_riskId_idx" ON "ControlTest"("riskId");
CREATE INDEX "ControlTest_status_idx" ON "ControlTest"("status");
CREATE INDEX "ControlTest_outcome_idx" ON "ControlTest"("outcome");
CREATE INDEX "ControlTest_testerId_idx" ON "ControlTest"("testerId");
CREATE INDEX "ControlTest_reviewerId_idx" ON "ControlTest"("reviewerId");
CREATE INDEX "ControlTest_findingId_idx" ON "ControlTest"("findingId");
CREATE INDEX "ControlTest_title_idx" ON "ControlTest"("title");

-- AddForeignKey
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_auditEntityId_fkey" FOREIGN KEY ("auditEntityId") REFERENCES "AuditUniverse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ControlTest" ADD CONSTRAINT "ControlTest_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
