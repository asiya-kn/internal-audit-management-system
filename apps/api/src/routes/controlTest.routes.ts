import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import {
  createControlTestSchema,
  updateControlTestSchema,
  listControlTestSchema,
  recordResultSchema,
  reviewControlTestSchema,
  linkFindingSchema,
  transitionControlTestSchema,
  controlTestIdParamSchema,
} from '../schemas/controlTest.schema.js';
import {
  listControlTests,
  getControlTest,
  createControlTest,
  updateControlTest,
  recordResult,
  reviewControlTest,
  linkFinding,
  unlinkFinding,
  transitionControlTest,
  deleteControlTest,
  getControlTestDashboard,
} from '../controllers/controlTest.controller.js';

const router = Router();

router.get('/dashboard', authenticate, requirePermission('control_testing.view'), getControlTestDashboard);

router.get('/', authenticate, requirePermission('control_testing.view'), validateQuery(listControlTestSchema), listControlTests);

router.get('/:id', authenticate, requirePermission('control_testing.view'), validateParams(controlTestIdParamSchema), getControlTest);

router.post('/', authenticate, requirePermission('control_testing.create'), validateBody(createControlTestSchema), createControlTest);

router.put('/:id', authenticate, requirePermission('control_testing.update'), validateParams(controlTestIdParamSchema), validateBody(updateControlTestSchema), updateControlTest);

router.patch('/:id/result', authenticate, requirePermission('control_testing.update'), validateParams(controlTestIdParamSchema), validateBody(recordResultSchema), recordResult);

router.patch('/:id/review', authenticate, requirePermission('control_testing.review'), validateParams(controlTestIdParamSchema), validateBody(reviewControlTestSchema), reviewControlTest);

router.post('/:id/finding', authenticate, requirePermission('control_testing.update'), validateParams(controlTestIdParamSchema), validateBody(linkFindingSchema), linkFinding);

router.delete('/:id/finding', authenticate, requirePermission('control_testing.update'), validateParams(controlTestIdParamSchema), unlinkFinding);

router.patch('/:id/status', authenticate, requirePermission('control_testing.update'), validateParams(controlTestIdParamSchema), validateBody(transitionControlTestSchema), transitionControlTest);

router.delete('/:id', authenticate, requirePermission('control_testing.update'), validateParams(controlTestIdParamSchema), deleteControlTest);

export default router;
