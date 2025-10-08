import request from 'supertest';
import express from 'express';

const metricsRouter = require('../dist/routes/metrics.routes').default;

describe('Metrics custom route', () => {
  const app = express();
  app.use('/metrics', metricsRouter);

  it('GET /metrics/custom returns text/plain', async () => {
    const res = await request(app).get('/metrics/custom');
    expect(res.status).toBe(200);
    expect((res.headers['content-type'] || '').toLowerCase()).toContain('text/plain');
  });
});
