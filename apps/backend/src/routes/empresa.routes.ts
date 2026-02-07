import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getAllEmpresas,
  getEmpresaById,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  getAllEmpresasSimple,
} from '../controllers/empresa.controller';
import { authenticateUser, authorizeRoles, tenantResolver } from '../middlewares/platformAuth.middleware';
import { handleExpressValidatorErrors } from '../middlewares/validation.middleware';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateUser, tenantResolver);

// Middleware de autorización - solo superadmin puede gestionar empresas
router.use(authorizeRoles(['SUPERADMIN']));

// Validaciones
const createEmpresaValidation = [
  body('nombre')
    .isString()
    .isLength({ min: 1, max: 150 })
    .withMessage('El nombre debe tener entre 1 y 150 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
];

const updateEmpresaValidation = [
  body('nombre')
    .optional()
    .isString()
    .isLength({ min: 1, max: 150 })
    .withMessage('El nombre debe tener entre 1 y 150 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
];

const empresaIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
];

// Rutas protegidas para SuperAdmin
router.get('/', getAllEmpresas);
router.get('/simple', getAllEmpresasSimple);
router.get('/:id', empresaIdValidation, handleExpressValidatorErrors, getEmpresaById);
router.post('/', createEmpresaValidation, handleExpressValidatorErrors, createEmpresa);
router.put(
  '/:id',
  empresaIdValidation,
  updateEmpresaValidation,
  handleExpressValidatorErrors,
  updateEmpresa
);
router.delete('/:id', empresaIdValidation, handleExpressValidatorErrors, deleteEmpresa);

export default router;
