import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { getAssuranceMap } from '../controllers/assuranceMap.controller.js';

const router = Router();

router.get('/', authenticate, requirePermission('assurance_map.view'), getAssuranceMap);

export default router;
