import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Settings endpoints require authentication', () => {
  it('rejects unauthenticated profile updates', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .send({ firstName: 'A', lastName: 'B', email: 'a@example.local' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated password changes', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'old-password', newPassword: 'new-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated system info requests', async () => {
    const res = await request(app).get('/api/auth/system-info');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
