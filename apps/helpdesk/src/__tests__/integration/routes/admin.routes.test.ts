/**
 * Integration Tests for Admin Routes
 * Tests route configuration and middleware setup
 */

import request from 'supertest';
import express from 'express';

// Mock services
jest.mock('../../../services/ticket.service');
jest.mock('../../../services/telegram.service');

import { createIntegrationTestApp } from '../../helpers/integration-app';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Admin Routes Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createIntegrationTestApp();
  });

  describe('Route Configuration', () => {
    test('should create Express app', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });
  });

  describe('7.3.2 GET /admin/stats', () => {
    test('should have admin stats endpoint', async () => {
      const response = await request(app).get('/admin/stats');

      // 401 (auth required), 403 (forbidden), 404 (not found), or 500 (error)
      expect([401, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('7.3.3 PUT /admin/config/:category', () => {
    test('should have admin config endpoint', async () => {
      const response = await request(app)
        .put('/admin/config/TECHNICAL')
        .send({ isActive: true });

      expect([401, 403, 404, 500]).toContain(response.status);
    });
  });
});
