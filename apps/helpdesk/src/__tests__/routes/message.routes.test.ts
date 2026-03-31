import express from 'express';
import request from 'supertest';

jest.mock('../../middlewares/auth.middleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../../controllers/message.controller', () => ({
  messageController: {
    create: jest.fn((req: express.Request, res: express.Response) => {
      res.status(201).json({ ticketId: req.params.ticketId ?? null, files: Array.isArray(req.files) ? req.files.length : 0 });
    }),
    getMessages: jest.fn((req: express.Request, res: express.Response) => {
      res.status(200).json({ ticketId: req.params.ticketId ?? null });
    }),
  },
}));

import messageRoutes from '../../routes/message.routes';

describe('message routes', () => {
  const app = express();

  app.use('/api/helpdesk/tickets/:ticketId/messages', messageRoutes);

  it('inherits ticketId from parent route params', async () => {
    const response = await request(app).get('/api/helpdesk/tickets/ticket-123/messages');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ticketId: 'ticket-123' });
  });
});
