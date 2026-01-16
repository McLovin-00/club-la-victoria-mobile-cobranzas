import { Router, Request, Response, IRouter } from 'express';
import remitosRoutes from './remitos.routes';
import configRoutes from './config.routes';

const router: IRouter = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'remitos',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
  });
});

// Rutas principales
router.use('/api/remitos', remitosRoutes);
router.use('/api/remitos/config', configRoutes);

export default router;

