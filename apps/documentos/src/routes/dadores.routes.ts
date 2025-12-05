import { Router } from 'express';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { DadoresController } from '../controllers/dadores.controller';
import { createDadorSchema, dadorListQuerySchema, updateDadorSchema, updateDadorNotificationsSchema } from '../schemas/validation.schemas';

const router = Router();

router.use(authenticate);
router.get('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]), validate(dadorListQuerySchema), DadoresController.list);
router.post('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO]), validate(createDadorSchema), DadoresController.create);
router.put('/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]), validate(updateDadorSchema), DadoresController.update);
router.put('/:id/notifications', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]), validate(updateDadorNotificationsSchema), DadoresController.updateNotifications);
router.delete('/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO]), DadoresController.remove);

export default router;


