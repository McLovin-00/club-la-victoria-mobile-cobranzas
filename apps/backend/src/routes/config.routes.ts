import { Router, Request, Response } from 'express';
import { backendServiceConfig } from '../config/serviceConfig';
import { authenticateUser, authorizeRoles } from '../middlewares/platformAuth.middleware';
import { AppLogger } from '../config/logger';

const router = Router();

/**
 * GET /api/config/services
 * Endpoint para obtener configuración de servicios habilitados
 * Acceso público (no requiere autenticación para configuración base)
 */
router.get('/services', authenticateUser, authorizeRoles(['SUPERADMIN','ADMIN','ADMIN_INTERNO','DADOR_DE_CARGA','TRANSPORTISTA','CHOFER','CLIENTE']), (req: Request, res: Response) => {
  try {
    const serviceConfig = backendServiceConfig.getConfig();
    const enabledServices = backendServiceConfig.getEnabledServices();
    
    AppLogger.debug('Service configuration requested', {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      enabledServices
    });

    const response = {
      services: {
        documentos: { 
          enabled: serviceConfig.documentos.enabled,
          name: 'Documentos',
          description: 'Gestión documental para transportistas'
        }
      },
      summary: {
        totalEnabled: enabledServices.length,
        enabledServices,
        coreServicesOnly: enabledServices.length === 0
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    res.json(response);
  } catch (error) {
    AppLogger.error('Error reading service configuration:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({ 
      message: 'Error reading service configuration',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/config/health
 * Endpoint básico de health check para configuración
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'config',
    timestamp: new Date().toISOString()
  });
});

export default router; 