import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { EmpresasTransportistasController } from '../controllers/empresas-transportistas.controller';
import { validate } from '../middlewares/auth.middleware';
import { createEmpresaTransportistaSchema, updateEmpresaTransportistaSchema, empresaTransportistaListQuerySchema } from '../schemas/validation.schemas';

const router = Router();

router.use(authenticate);

router.get('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.OPERADOR_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]), validate(empresaTransportistaListQuerySchema), EmpresasTransportistasController.list);
router.post('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]), validate(createEmpresaTransportistaSchema), EmpresasTransportistasController.create);
router.get('/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.OPERADOR_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]), EmpresasTransportistasController.getById);
router.put('/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(updateEmpresaTransportistaSchema), EmpresasTransportistasController.update);
router.delete('/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), EmpresasTransportistasController.delete);
router.get('/:id/choferes', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.OPERADOR_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]), EmpresasTransportistasController.getChoferes);
router.get('/:id/equipos', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.OPERADOR_INTERNO]), EmpresasTransportistasController.getEquipos);

export default router;


