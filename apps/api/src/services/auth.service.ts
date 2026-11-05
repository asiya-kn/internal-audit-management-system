import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/db.js';
import { UserRepository } from '../repositories/user.repository.js';
import { mapUserToDto } from './auth.mapper.js';
import { AuthenticationError, ConflictError, ValidationError } from '../utils/errors.js';
import type { UserDto } from '@iams/shared';
import { logger } from '../utils/logger.js';

export class AuthService {
  constructor(private readonly users: UserRepository = new UserRepository()) {}

  async login(email: string, password: string): Promise<{ user: UserDto; token: string }> {
    let user;
    try {
      user = await this.users.findByEmail(email.toLowerCase().trim());
    } catch {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AuthenticationError('Invalid email or password');
    }

    await this.users.updateLastLogin(user.id);

    const token = jwt.sign({ sub: user.id }, config.sessionSecret, {
      expiresIn: Math.floor(config.cookieMaxAgeMs / 1000),
    });

    logger.info('User logged in', { userId: user.id, email: user.email });

    return { user: mapUserToDto(user), token };
  }

  async getCurrentUser(userId: string): Promise<UserDto> {
    let user;
    try {
      user = await this.users.findById(userId);
    } catch {
      throw new AuthenticationError('User not found or inactive');
    }
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }
    return mapUserToDto(user);
  }

  async updateProfile(userId: string, firstName: string, lastName: string, email: string): Promise<UserDto> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.users.findById(userId);
    if (!existing) throw new AuthenticationError('User not found');

    if (normalizedEmail !== existing.email) {
      const conflict = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (conflict) throw new ConflictError('A user with this email already exists');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
      },
    });

    const updated = await this.users.findById(userId);
    if (!updated) throw new AuthenticationError('User not found');
    return mapUserToDto(updated);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new AuthenticationError('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError('Current password is incorrect');

    if (newPassword.length < 8) throw new ValidationError('New password must be at least 8 characters');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logger.info('User changed password', { userId });
  }
}