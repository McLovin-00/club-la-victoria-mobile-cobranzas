import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { EvolutionConfigController } from '../controllers/evolution-config.controller';

const router: ReturnType<typeof Router> = Router();

// =================================
// RUTAS DE CONFIGURACIÓN EVOLUTION API - Solo SUPERADMIN
// =================================

router.get('/', authenticate, authorize(['SUPERADMIN' as any]), EvolutionConfigController.getConfig);
router.put('/', authenticate, authorize(['SUPERADMIN' as any]), EvolutionConfigController.updateConfig);
router.post('/test', authenticate, authorize(['SUPERADMIN' as any]), EvolutionConfigController.testConnection);

export default router;


