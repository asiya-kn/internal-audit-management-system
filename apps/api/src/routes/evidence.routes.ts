import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import {
  createEvidenceSchema,
  updateEvidenceSchema,
  listEvidenceSchema,
  reviewEvidenceSchema,
  evidenceIdParamSchema,
} from '../schemas/evidence.schema.js';
import {
  listEvidence,
  getEvidence,
  createEvidence,
  updateEvidence,
  reviewEvidence,
  deleteEvidence,
  getEvidenceDashboard,
} from '../controllers/evidence.controller.js';

const router = Router();

router.get('/dashboard', authenticate, requirePermission('evidence.view'), getEvidenceDashboard);

router.get('/', authenticate, requirePermission('evidence.view'), validateQuery(listEvidenceSchema), listEvidence);

router.get('/:id', authenticate, requirePermission('evidence.view'), validateParams(evidenceIdParamSchema), getEvidence);

router.post('/', authenticate, requirePermission('evidence.create'), validateBody(createEvidenceSchema), createEvidence);

router.put('/:id', authenticate, requirePermission('evidence.update'), validateParams(evidenceIdParamSchema), validateBody(updateEvidenceSchema), updateEvidence);

router.patch('/:id/review', authenticate, requirePermission('evidence.review'), validateParams(evidenceIdParamSchema), validateBody(reviewEvidenceSchema), reviewEvidence);

router.delete('/:id', authenticate, requirePermission('evidence.update'), validateParams(evidenceIdParamSchema), deleteEvidence);

export default router;
