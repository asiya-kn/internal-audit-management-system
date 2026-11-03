import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import auditUniverseRoutes from './routes/auditUniverse.routes.js';
import riskRoutes from './routes/risk.routes.js';
import auditPlanRoutes from './routes/auditPlan.routes.js';
import engagementRoutes from './routes/engagement.routes.js';
import findingRoutes from './routes/finding.routes.js';
import controlTestRoutes from './routes/controlTest.routes.js';
import actionPlanRoutes from './routes/actionPlan.routes.js';
import assuranceMapRoutes from './routes/assuranceMap.routes.js';
import evidenceRoutes from './routes/evidence.routes.js';

function buildHelmetConfig() {
  if (config.isProduction) {
    return helmet({
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    });
  }
  return helmet({ contentSecurityPolicy: false, hsts: false });
}

export function createApp(): express.Express {
  const app = express();

  // Trust first proxy so req.ip reflects the real client behind nginx/Docker
  app.set('trust proxy', 1);

  // ---- Security middleware ----
  app.use(buildHelmetConfig());

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'Apikey'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  // ---- Logging ----
  app.use(
    morgan(config.isProduction ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }),
  );

  // ---- Global rate limiter ----
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // ---- Routes ----
  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/audit-universe', auditUniverseRoutes);
  app.use('/api/risks', riskRoutes);
  app.use('/api/audit-plans', auditPlanRoutes);
  app.use('/api/engagements', engagementRoutes);
  app.use('/api/findings', findingRoutes);
  app.use('/api/control-tests', controlTestRoutes);
  app.use('/api/action-plans', actionPlanRoutes);
  app.use('/api/assurance-map', assuranceMapRoutes);
  app.use('/api/evidence', evidenceRoutes);

  // ---- 404 + error handling (must be last) ----
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}