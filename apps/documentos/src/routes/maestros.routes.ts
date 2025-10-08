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

const router = Router();

router.use(authenticate);

// Empresas
router.get('/empresas', validate(empresaDocListQuerySchema), MaestrosController.listEmpresas);
router.post('/empresas', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(createEmpresaDocSchema), MaestrosController.createEmpresa);
router.put('/empresas/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(updateEmpresaDocSchema), MaestrosController.updateEmpresa);
router.delete('/empresas/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), MaestrosController.deleteEmpresa);

// Choferes
router.get('/choferes', validate(choferListQuerySchema), MaestrosController.listChoferes);
router.post('/choferes', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(createChoferSchema), MaestrosController.createChofer);
router.put('/choferes/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(updateChoferSchema), MaestrosController.updateChofer);
router.delete('/choferes/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), MaestrosController.deleteChofer);

// Camiones
router.get('/camiones', validate(camionListQuerySchema), MaestrosController.listCamiones);
router.post('/camiones', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(createCamionSchema), MaestrosController.createCamion);
router.put('/camiones/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(updateCamionSchema), MaestrosController.updateCamion);
router.delete('/camiones/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), MaestrosController.deleteCamion);

// Acoplados
router.get('/acoplados', validate(acopladoListQuerySchema), MaestrosController.listAcoplados);
router.post('/acoplados', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(createAcopladoSchema), MaestrosController.createAcoplado);
router.put('/acoplados/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(updateAcopladoSchema), MaestrosController.updateAcoplado);
router.delete('/acoplados/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), MaestrosController.deleteAcoplado);

export default router;


