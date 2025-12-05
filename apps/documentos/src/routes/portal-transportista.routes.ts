import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { PortalTransportistaController } from '../controllers/portal-transportista.controller';

const router = Router();

router.use(authenticate);

// Roles que pueden acceder: TRANSPORTISTA, CHOFER y admins para pruebas
const allowedRoles = ['TRANSPORTISTA', 'EMPRESA_TRANSPORTISTA', 'CHOFER', 'SUPERADMIN', 'ADMIN_INTERNO', 'ADMIN', 'DADOR_DE_CARGA'] as any[];

// Mis entidades (choferes, camiones, acoplados)
router.get('/mis-entidades', authorize(allowedRoles), PortalTransportistaController.getMisEntidades);

// Mis equipos
router.get('/equipos', authorize(allowedRoles), PortalTransportistaController.getMisEquipos);

// Documentos rechazados
router.get('/documentos/rechazados', authorize(allowedRoles), PortalTransportistaController.getDocumentosRechazados);

// Documentos pendientes de aprobación
router.get('/documentos/pendientes', authorize(allowedRoles), PortalTransportistaController.getDocumentosPendientes);

export default router;

