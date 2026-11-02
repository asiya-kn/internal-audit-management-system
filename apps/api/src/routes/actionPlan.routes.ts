import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import {
  createActionPlanSchema,
  updateActionPlanSchema,
  listActionPlanSchema,
  addProgressUpdateSchema,
  verifyActionPlanSchema,
  transitionActionPlanSchema,
  actionPlanIdParamSchema,
} from '../schemas/actionPlan.schema.js';
import {
  listActionPlans,
  getActionPlan,
  createActionPlan,
  updateActionPlan,
  addProgressUpdate,
  verifyActionPlan,
  transitionActionPlan,
  deleteActionPlan,
  getActionPlanDashboard,
} from '../controllers/actionPlan.controller.js';

const router = Router();

router.get('/dashboard', authenticate, requirePermission('actions.view'), getActionPlanDashboard);

router.get('/', authenticate, requirePermission('actions.view'), validateQuery(listActionPlanSchema), listActionPlans);

router.get('/:id', authenticate, requirePermission('actions.view'), validateParams(actionPlanIdParamSchema), getActionPlan);

router.post('/', authenticate, requirePermission('actions.create'), validateBody(createActionPlanSchema), createActionPlan);

router.put('/:id', authenticate, requirePermission('actions.update'), validateParams(actionPlanIdParamSchema), validateBody(updateActionPlanSchema), updateActionPlan);

router.post('/:id/updates', authenticate, requirePermission('actions.follow_up'), validateParams(actionPlanIdParamSchema), validateBody(addProgressUpdateSchema), addProgressUpdate);

router.patch('/:id/verify', authenticate, requirePermission('actions.verify'), validateParams(actionPlanIdParamSchema), validateBody(verifyActionPlanSchema), verifyActionPlan);

router.patch('/:id/status', authenticate, requirePermission('actions.update'), validateParams(actionPlanIdParamSchema), validateBody(transitionActionPlanSchema), transitionActionPlan);

router.delete('/:id', authenticate, requirePermission('actions.update'), validateParams(actionPlanIdParamSchema), deleteActionPlan);

export default router;
