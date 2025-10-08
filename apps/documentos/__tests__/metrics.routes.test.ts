import request from 'supertest';
import express from 'express';

const metricsRouter = require('../dist/routes/metrics.routes').default;

describe('Metrics route', () => {
  const app = express();
  app.use('/metrics', metricsRouter);

  it('GET /metrics returns text/plain metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type'] || '').toContain('text/plain');
  });
});
