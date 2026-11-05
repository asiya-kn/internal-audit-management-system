import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { recordAudit } from '../services/audit.service.js';
import { sendSuccess } from '../utils/response.js';
import { AuthenticationError } from '../utils/errors.js';
import { config } from '../config/env.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { LoginRequest, LoginResponse, UserDto, SystemInfoDto } from '@iams/shared';

const authService = new AuthService();

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip;
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body as LoginRequest;
    const { user, token } = await authService.login(email, password);

    res.cookie(config.cookieName, token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'strict' : 'lax',
      maxAge: config.cookieMaxAgeMs,
      path: '/',
    });

    recordAudit({
      action: 'login',
      category: 'auth',
      userId: user.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { email: user.email },
      success: true,
    });

    const body: LoginResponse = { user };
    sendSuccess(res, body);
  } catch (err) {
    if (err instanceof AuthenticationError) {
      recordAudit({
        action: 'login_failed',
        category: 'auth',
        ip: clientIp(req),
        userAgent: req.headers['user-agent'],
        metadata: { email: (req.body as LoginRequest)?.email },
        success: false,
      });
    }
    next(err);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  recordAudit({
    action: 'logout',
    category: 'auth',
    userId: authReq.user?.id,
    ip: clientIp(req),
    userAgent: req.headers['user-agent'],
  });
  res.clearCookie(config.cookieName, { path: '/' });
  sendSuccess(res, { message: 'Logged out successfully' });
}

export async function me(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError();
    }
    const user = await authService.getCurrentUser(req.user.id);
    sendSuccess<UserDto>(res, user);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError();
    }
    const { firstName, lastName, email } = req.body as {
      firstName: string;
      lastName: string;
      email: string;
    };
    const user = await authService.updateProfile(req.user.id, firstName, lastName, email);
    recordAudit({
      action: 'profile.update',
      category: 'auth',
      userId: req.user.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      metadata: { email: user.email },
    });
    sendSuccess<UserDto>(res, user);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError();
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    recordAudit({
      action: 'password.change',
      category: 'auth',
      userId: req.user.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
    });
    sendSuccess(res, { message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

export function getSystemInfo(_req: AuthenticatedRequest, res: Response): void {
  const body: SystemInfoDto = {
    environment: config.env,
    sessionLifetimeHours: Math.round(config.cookieMaxAgeMs / (60 * 60 * 1000)),
    loginRateLimitMax: config.authRateLimitMax,
    apiRateLimitMax: config.rateLimitMax,
  };
  sendSuccess(res, body);
}