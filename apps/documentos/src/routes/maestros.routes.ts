import { Router } from 'express';
import { MaestrosController } from '../controllers/maestros.controller';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import {
  createEmpresaDocSchema,
  updateEmpresaDocSchema,
  empresaDocListQuerySchema,
  createChoferSchema,
  updateChoferSchema,
  choferListQuerySchema,
  createCamionSchema,
  updateCamionSchema,
  camionListQuerySchema,
  createAcopladoSchema,
  updateAcopladoSchema,
  acopladoListQuerySchema,
} from '../schemas/validation.schemas';

const router: ReturnType<typeof Router> = Router();

router.use(authenticate);

// Empresas
router.get('/empresas', validate(empresaDocListQuerySchema), MaestrosController.listEmpresas);
router.post('/empresas', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(createEmpresaDocSchema), MaestrosController.createEmpresa);
router.put('/empresas/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(updateEmpresaDocSchema), MaestrosController.updateEmpresa);
router.delete('/empresas/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), MaestrosController.deleteEmpresa);

// Choferes
router.get('/choferes', validate(choferListQuerySchema), MaestrosController.listChoferes);
router.get('/choferes/:id', MaestrosController.getChoferById);
router.post('/choferes', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]), validate(createChoferSchema), MaestrosController.createChofer);
router.put('/choferes/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(updateChoferSchema), MaestrosController.updateChofer);
router.delete('/choferes/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), MaestrosController.deleteChofer);

// Camiones
router.get('/camiones', validate(camionListQuerySchema), MaestrosController.listCamiones);
router.post('/camiones', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]), validate(createCamionSchema), MaestrosController.createCamion);
router.put('/camiones/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO]), validate(updateCamionSchema), MaestrosController.updateCamion);
router.delete('/camiones/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO]), MaestrosController.deleteCamion);

// Acoplados
router.get('/acoplados', validate(acopladoListQuerySchema), MaestrosController.listAcoplados);
router.post('/acoplados', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]), validate(createAcopladoSchema), MaestrosController.createAcoplado);
router.put('/acoplados/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO]), validate(updateAcopladoSchema), MaestrosController.updateAcoplado);
router.delete('/acoplados/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO]), MaestrosController.deleteAcoplado);

export default router;


