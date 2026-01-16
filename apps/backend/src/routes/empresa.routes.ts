import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  getAllEmpresas,
  getEmpresaById,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  getAllEmpresasSimple,
} from '../controllers/empresa.controller';
import { authenticateUser, authorizeRoles, tenantResolver } from '../middlewares/platformAuth.middleware';

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

// Middleware de validación
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array(),
    });
  }
  next();
};

// Rutas protegidas para SuperAdmin
router.get('/', getAllEmpresas);
router.get('/simple', getAllEmpresasSimple);
router.get('/:id', empresaIdValidation, handleValidationErrors, getEmpresaById);
router.post('/', createEmpresaValidation, handleValidationErrors, createEmpresa);
router.put(
  '/:id',
  empresaIdValidation,
  updateEmpresaValidation,
  handleValidationErrors,
  updateEmpresa
);
router.delete('/:id', empresaIdValidation, handleValidationErrors, deleteEmpresa);

export default router;
