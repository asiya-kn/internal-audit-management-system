import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, updateProfile, changePassword, getSystemInfo } from '../controllers/auth.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, updateProfileSchema, changePasswordSchema } from '../schemas/auth.schema.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                  // 30 requests per IP
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again in 15 minutes.'
    }
  },

  skipSuccessfulRequests: true,
});

router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, validateBody(updateProfileSchema), updateProfile);
router.post('/change-password', authenticate, validateBody(changePasswordSchema), changePassword);
router.get('/system-info', authenticate, requirePermission('administration.settings.view'), getSystemInfo);

export default router;
