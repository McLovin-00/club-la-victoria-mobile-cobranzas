import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { PortalClienteController } from '../controllers/portal-cliente.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Solo rol CLIENTE puede acceder a estas rutas
// También permitimos a otros roles para pruebas y compatibilidad
const allowedRoles = ['CLIENTE', 'SUPERADMIN', 'ADMIN_INTERNO', 'ADMIN'] as any[];

// Listar equipos asignados al cliente
router.get('/equipos', authorize(allowedRoles), PortalClienteController.getEquiposAsignados);

// Detalle de un equipo (con documentos)
router.get('/equipos/:id', authorize(allowedRoles), PortalClienteController.getEquipoDetalle);

// Descargar documento individual
router.get(
  '/equipos/:id/documentos/:docId/download',
  authorize(allowedRoles),
  PortalClienteController.downloadDocumento
);

// Descargar todos los documentos del equipo (ZIP)
router.get(
  '/equipos/:id/download-all',
  authorize(allowedRoles),
  PortalClienteController.downloadAllDocumentos
);

export default router;

