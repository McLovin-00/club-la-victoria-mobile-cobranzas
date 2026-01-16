import { Router } from 'express';
import { ComplianceController } from '../controllers/compliance.controller';

const router: ReturnType<typeof Router> = Router();

// Estado documental completo del equipo
router.get('/equipos/:id', ComplianceController.getEquipoCompliance);

export default router;


