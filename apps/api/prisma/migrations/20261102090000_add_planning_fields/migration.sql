-- Add estimated resources and planning rationale to the annual audit plan.
-- These fields support richer planning metadata without altering existing data.

ALTER TABLE "AuditPlan"
  ADD COLUMN "estimatedResources" TEXT,
  ADD COLUMN "planningRationale" TEXT;

-- Add estimated resources to engagements to mirror the plan-level estimate and
-- allow refinement at execution time.
ALTER TABLE "Engagement"
  ADD COLUMN "estimatedResources" TEXT;
