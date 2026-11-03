import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { generateReport } from '../controllers/reports.controller.js';

const router = Router();

router.get('/', authenticate, requirePermission('reports.view'), generateReport);

export default router;
